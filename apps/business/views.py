from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import BusinessAccessMixin, has_business_permission
from apps.business.models import Business, BusinessMembership, Location, Subscription
from apps.business.serializers import (
    BusinessCreateSerializer,
    BusinessSerializer,
    LocationCreateSerializer,
    LocationSerializer,
    MemberCreateSerializer,
    MemberSerializer,
    SubscriptionCreateSerializer,
    SubscriptionSerializer,
)


class BusinessCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BusinessCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        business = serializer.save()
        return Response(
            BusinessSerializer(business).data,
            status=status.HTTP_201_CREATED,
        )


class LocationCreateView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.get_business()
        if not has_business_permission(request.user, business, "location", "view"):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        locations = Location.objects.filter(business=business)
        serializer = LocationSerializer(locations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id):
        business = self.get_business()
        if not has_business_permission(request.user, business, "location", "create"):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LocationCreateSerializer(
            data=request.data, context={"business": business}
        )
        serializer.is_valid(raise_exception=True)
        location = serializer.save()
        return Response(
            LocationSerializer(location).data,
            status=status.HTTP_201_CREATED,
        )


class LocationDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.get_business()
        if not has_business_permission(request.user, business, "location", "view"):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        location = get_object_or_404(
            Location.objects.filter(business=business, pk=id)
        )
        serializer = LocationSerializer(location)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, id):
        business = self.get_business()
        if not has_business_permission(request.user, business, "location", "update"):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        location = get_object_or_404(
            Location.objects.filter(business=business, pk=id)
        )
        serializer = LocationSerializer(location, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, business_id, id):
        business = self.get_business()
        if not has_business_permission(request.user, business, "location", "delete"):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        location = get_object_or_404(
            Location.objects.filter(business=business, pk=id)
        )
        location.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriptionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        # Prevent duplicate active subscriptions
        if business.subscriptions.filter(
            status__in=[Subscription.Status.ONBOARDING, Subscription.Status.ACTIVE]
        ).exists():
            return Response(
                {"error": "Business already has an active subscription."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubscriptionCreateSerializer(
            data=request.data, context={"business": business}
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                subscription = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "Business already has an active subscription."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            SubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED,
        )


class MemberListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        memberships = BusinessMembership.objects.filter(business=business)
        return Response(
            MemberSerializer(memberships, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = MemberCreateSerializer(
            data=request.data, context={"business": business}
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                membership = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "User is already a member of this business."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            MemberSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class MemberDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, business_id, user_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        membership = BusinessMembership.objects.filter(
            business=business, user_id=user_id
        ).first()
        if membership is None:
            return Response(
                {"error": "Member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)