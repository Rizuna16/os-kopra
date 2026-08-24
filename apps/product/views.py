from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.product.models import Product, Variant
from apps.product.serializers import (
    ProductCreateSerializer,
    ProductSerializer,
    ProductUpdateSerializer,
    VariantCreateSerializer,
    VariantSerializer,
)


class ProductCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        serializer = ProductCreateSerializer(
            data=request.data, context={"business": business}
        )
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductSerializer(product).data,
            status=status.HTTP_201_CREATED,
        )

    def get(self, request, business_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        products = Product.objects.filter(business=business)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProductDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, product_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        serializer = ProductSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, product_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        serializer = ProductUpdateSerializer(
            product, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            ProductSerializer(product).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, product_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VariantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, product_id, variant_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        variant = get_object_or_404(
            Variant.objects.filter(product=product), pk=variant_id
        )
        serializer = VariantSerializer(variant)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, business_id, product_id, variant_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        variant = get_object_or_404(
            Variant.objects.filter(product=product), pk=variant_id
        )
        serializer = VariantCreateSerializer(
            variant, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            VariantSerializer(variant).data, status=status.HTTP_200_OK
        )

    def delete(self, request, business_id, product_id, variant_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        variant = get_object_or_404(
            Variant.objects.filter(product=product), pk=variant_id
        )
        variant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VariantCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, product_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        variants = Variant.objects.filter(product=product)
        serializer = VariantSerializer(variants, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, business_id, product_id):
        business = get_object_or_404(
            Business.objects.filter(owner=request.user), pk=business_id
        )
        product = get_object_or_404(
            Product.objects.filter(business=business), pk=product_id
        )
        serializer = VariantCreateSerializer(
            data=request.data, context={"product": product}
        )
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(
            VariantSerializer(variant).data, status=status.HTTP_201_CREATED
        )
