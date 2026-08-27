from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business

from .models import CustomerLoyaltyRecord, LoyaltyProgram, Promotion
from .serializers import (
    CustomerLoyaltyRecordCreateSerializer,
    CustomerLoyaltyRecordSerializer,
    CustomerLoyaltyRecordUpdateSerializer,
    LoyaltyProgramCreateSerializer,
    LoyaltyProgramSerializer,
    LoyaltyProgramUpdateSerializer,
    PromotionCreateSerializer,
    PromotionSerializer,
    PromotionUpdateSerializer,
)
from apps.authentication.permissions import BusinessAccessMixin


def _get_loyalty_program(view_instance, request, business_id, program_id):
    business = view_instance.require_business_permission("promotion", "view")
    return get_object_or_404(
        LoyaltyProgram.objects.filter(business=business), pk=program_id
    )


class PromotionListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("promotion", "view")
        promotions = Promotion.objects.filter(business=business)
        return Response(
            PromotionSerializer(promotions, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id):
        business = self.require_business_permission("promotion", "create")
        serializer = PromotionCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save()
        return Response(
            PromotionSerializer(promotion).data, status=status.HTTP_201_CREATED
        )


class PromotionDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("promotion", "view")
        promotion = get_object_or_404(
            Promotion.objects.filter(business=business), pk=id
        )
        return Response(
            PromotionSerializer(promotion).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        business = self.require_business_permission("promotion", "update")
        promotion = get_object_or_404(
            Promotion.objects.filter(business=business), pk=id
        )
        serializer = PromotionUpdateSerializer(
            promotion,
            data=request.data,
            partial=True,
            context={"business": business, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save()
        return Response(
            PromotionSerializer(promotion).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        business = self.require_business_permission("promotion", "delete")
        promotion = get_object_or_404(
            Promotion.objects.filter(business=business), pk=id
        )
        promotion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoyaltyProgramListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = self.require_business_permission("promotion", "view")
        programs = LoyaltyProgram.objects.filter(business=business)
        return Response(
            LoyaltyProgramSerializer(programs, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id):
        business = self.require_business_permission("promotion", "create")
        serializer = LoyaltyProgramCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        program = serializer.save()
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_201_CREATED
        )


class LoyaltyProgramDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        business = self.require_business_permission("promotion", "view")
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business=business), pk=id
        )
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        business = self.require_business_permission("promotion", "update")
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business=business), pk=id
        )
        serializer = LoyaltyProgramUpdateSerializer(
            program, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        program = serializer.save()
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        business = self.require_business_permission("promotion", "delete")
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business=business), pk=id
        )
        # Original check: prevent deletion if customer records exist
        if CustomerLoyaltyRecord.objects.filter(program=program).exists():
            return Response(
                {
                    "detail": "Cannot delete loyalty program with existing customer records."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        program.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerLoyaltyRecordListView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, program_id):
        program = _get_loyalty_program(self, request, business_id, program_id)
        records = CustomerLoyaltyRecord.objects.filter(program=program)
        return Response(
            CustomerLoyaltyRecordSerializer(records, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id, program_id):
        program = _get_loyalty_program(self, request, business_id, program_id)
        serializer = CustomerLoyaltyRecordCreateSerializer(
            data=request.data, context={"program": program, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            CustomerLoyaltyRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerLoyaltyRecordDetailView(BusinessAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def _get_record(self, request, business_id, program_id, id):
        program = _get_loyalty_program(self, request, business_id, program_id)
        return get_object_or_404(
            CustomerLoyaltyRecord.objects.filter(program=program), pk=id
        )

    def get(self, request, business_id, program_id, id):
        record = self._get_record(request, business_id, program_id, id)
        return Response(
            CustomerLoyaltyRecordSerializer(record).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, program_id, id):
        record = self._get_record(request, business_id, program_id, id)
        serializer = CustomerLoyaltyRecordUpdateSerializer(
            record, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            CustomerLoyaltyRecordSerializer(record).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, program_id, id):
        record = self._get_record(request, business_id, program_id, id)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
