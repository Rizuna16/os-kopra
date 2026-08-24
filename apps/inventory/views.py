from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business, Location
from apps.inventory.models import Batch, SerialNumber, Stock
from apps.inventory.serializers import (
    BatchCreateSerializer,
    BatchSerializer,
    SerialNumberCreateSerializer,
    SerialNumberSerializer,
    StockAdjustmentSerializer,
    StockCreateSerializer,
    StockOpnameSerializer,
    StockSerializer,
    StockTransferSerializer,
)


class StockCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, location_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        location = get_object_or_404(
            Location.objects.filter(business=business), pk=location_id
        )
        serializer = StockCreateSerializer(
            data=request.data,
            context={"business": business, "location": location},
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                stock = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "Stock already exists for this variant and location."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            StockSerializer(stock).data, status=status.HTTP_201_CREATED
        )

    def get(self, request, business_id, location_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        location = get_object_or_404(
            Location.objects.filter(business=business), pk=location_id
        )
        stocks = Stock.objects.filter(location=location)
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StockDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        stock = get_object_or_404(
            Stock.objects.filter(location__business__owner=request.user),
            pk=id,
        )
        serializer = StockSerializer(stock)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, id):
        stock = get_object_or_404(
            Stock.objects.filter(location__business__owner=request.user),
            pk=id,
        )
        serializer = StockSerializer(stock, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, id):
        stock = get_object_or_404(
            Stock.objects.filter(location__business__owner=request.user),
            pk=id,
        )
        stock.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StockTransferView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StockTransferSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(
            {
                "source": StockSerializer(result["source_stock"]).data,
                "destination": StockSerializer(result["dest_stock"]).data,
                "transferred_quantity": str(
                    serializer.validated_data["quantity"]
                ),
            },
            status=status.HTTP_200_OK,
        )


class StockAdjustmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StockAdjustmentSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        stock = serializer.save()
        return Response(
            StockSerializer(stock).data, status=status.HTTP_200_OK,
        )


class StockOpnameView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StockOpnameSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        stock = serializer.create(serializer.validated_data)
        if stock is None:
            return Response(
                {"detail": "No stock found and physical quantity is 0."},
                status=status.HTTP_200_OK,
            )
        return Response(
            StockSerializer(stock).data, status=status.HTTP_200_OK,
        )


class BatchCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batches = Batch.objects.filter(location__business__owner=request.user)
        serializer = BatchSerializer(batches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = BatchCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        return Response(
            BatchSerializer(batch).data, status=status.HTTP_201_CREATED
        )


class BatchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        batch = get_object_or_404(
            Batch.objects.filter(location__business__owner=request.user), pk=id
        )
        serializer = BatchSerializer(batch)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, id):
        batch = get_object_or_404(
            Batch.objects.filter(location__business__owner=request.user), pk=id
        )
        serializer = BatchSerializer(batch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, id):
        batch = get_object_or_404(
            Batch.objects.filter(location__business__owner=request.user), pk=id
        )
        batch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SerialNumberCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serials = SerialNumber.objects.filter(
            batch__location__business__owner=request.user
        )
        serializer = SerialNumberSerializer(serials, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SerialNumberCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serial = serializer.save()
        return Response(
            SerialNumberSerializer(serial).data, status=status.HTTP_201_CREATED
        )


class SerialNumberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        serial = get_object_or_404(
            SerialNumber.objects.filter(
                batch__location__business__owner=request.user
            ),
            pk=id,
        )
        serializer = SerialNumberSerializer(serial)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, id):
        serial = get_object_or_404(
            SerialNumber.objects.filter(
                batch__location__business__owner=request.user
            ),
            pk=id,
        )
        serializer = SerialNumberSerializer(serial, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, id):
        serial = get_object_or_404(
            SerialNumber.objects.filter(
                batch__location__business__owner=request.user
            ),
            pk=id,
        )
        serial.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
