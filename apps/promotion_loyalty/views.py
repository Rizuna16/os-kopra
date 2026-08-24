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


class PromotionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        promotions = Promotion.objects.filter(business=business)
        return Response(
            PromotionSerializer(promotions, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = PromotionCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save()
        return Response(
            PromotionSerializer(promotion).data, status=status.HTTP_201_CREATED
        )


class PromotionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        promotion = get_object_or_404(
            Promotion.objects.filter(business__owner=request.user), pk=id
        )
        return Response(
            PromotionSerializer(promotion).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        promotion = get_object_or_404(
            Promotion.objects.filter(business__owner=request.user), pk=id
        )
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
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
        promotion = get_object_or_404(
            Promotion.objects.filter(business__owner=request.user), pk=id
        )
        promotion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoyaltyProgramListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        programs = LoyaltyProgram.objects.filter(business=business)
        return Response(
            LoyaltyProgramSerializer(programs, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = LoyaltyProgramCreateSerializer(
            data=request.data, context={"business": business, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        program = serializer.save()
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_201_CREATED
        )


class LoyaltyProgramDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, id):
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business__owner=request.user), pk=id
        )
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, id):
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business__owner=request.user), pk=id
        )
        serializer = LoyaltyProgramUpdateSerializer(
            program, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        program = serializer.save()
        return Response(
            LoyaltyProgramSerializer(program).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, id):
        program = get_object_or_404(
            LoyaltyProgram.objects.filter(business__owner=request.user), pk=id
        )
        if CustomerLoyaltyRecord.objects.filter(program=program).exists():
            return Response(
                {
                    "detail": "Cannot delete loyalty program with existing customer records."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        program.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerLoyaltyRecordListView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_program(self, request, business_id, program_id):
        return get_object_or_404(
            LoyaltyProgram.objects.filter(business__owner=request.user),
            pk=program_id,
        )

    def get(self, request, business_id, program_id):
        program = self._get_program(request, business_id, program_id)
        records = CustomerLoyaltyRecord.objects.filter(program=program)
        return Response(
            CustomerLoyaltyRecordSerializer(records, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, business_id, program_id):
        program = self._get_program(request, business_id, program_id)
        serializer = CustomerLoyaltyRecordCreateSerializer(
            data=request.data, context={"program": program, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            CustomerLoyaltyRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerLoyaltyRecordDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_record(self, request, program_id, id):
        return get_object_or_404(
            CustomerLoyaltyRecord.objects.filter(
                program__business__owner=request.user, program__id=program_id
            ),
            pk=id,
        )

    def get(self, request, business_id, program_id, id):
        record = self._get_record(request, program_id, id)
        return Response(
            CustomerLoyaltyRecordSerializer(record).data, status=status.HTTP_200_OK
        )

    def patch(self, request, business_id, program_id, id):
        record = self._get_record(request, program_id, id)
        serializer = CustomerLoyaltyRecordUpdateSerializer(
            record, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return Response(
            CustomerLoyaltyRecordSerializer(record).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, program_id, id):
        record = self._get_record(request, program_id, id)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
