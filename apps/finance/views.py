from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.business.models import Business
from apps.finance.models import Account, Journal, JournalEntry, Ledger, Expense
from apps.finance.serializers import (
    AccountSerializer,
    ExpenseSerializer,
    JournalEntrySerializer,
    JournalSerializer,
    LedgerSerializer,
)


class BusinessOwnedMixin:
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business.objects.filter(owner=self.request.user),
            pk=self.kwargs["business_id"],
        )


class AccountListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.get_business()
        qs = Account.objects.filter(business_id=business_id)
        return Response(AccountSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.get_business()
        serializer = AccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AccountDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.get_business()
        return get_object_or_404(Account, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(AccountSerializer(obj).data)

    def put(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        serializer = AccountSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        serializer = AccountSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.get_business()
        qs = Journal.objects.filter(business_id=business_id)
        return Response(JournalSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.get_business()
        serializer = JournalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JournalDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.get_business()
        return get_object_or_404(Journal, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(JournalSerializer(obj).data)

    def put(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        if obj.status != Journal.Status.DRAFT:
            return Response(
                {"error": "Only DRAFT journals can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = JournalSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        if obj.status != Journal.Status.DRAFT:
            return Response(
                {"error": "Only DRAFT journals can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = JournalSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        if obj.status != Journal.Status.DRAFT:
            return Response(
                {"error": "Only DRAFT journals can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalPostView(BusinessOwnedMixin, APIView):
    def post(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        if obj.status != Journal.Status.DRAFT:
            return Response(
                {"error": "Only DRAFT journals can be posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.status = Journal.Status.POSTED
        obj.save(update_fields=["status", "updated_at"])
        return Response(JournalSerializer(obj).data, status=status.HTTP_200_OK)

    def get_object(self, business_id, pk):
        self.get_business()
        return get_object_or_404(Journal, business_id=business_id, pk=pk)


class JournalReverseView(BusinessOwnedMixin, APIView):
    def post(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        if obj.status != Journal.Status.POSTED:
            return Response(
                {"error": "Only POSTED journals can be reversed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.status = Journal.Status.REVERSED
        obj.save(update_fields=["status", "updated_at"])
        return Response(JournalSerializer(obj).data, status=status.HTTP_200_OK)

    def get_object(self, business_id, pk):
        self.get_business()
        return get_object_or_404(Journal, business_id=business_id, pk=pk)


class JournalEntryListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id, journal_id):
        self.get_business()
        qs = JournalEntry.objects.filter(
            journal__business_id=business_id, journal_id=journal_id
        )
        return Response(JournalEntrySerializer(qs, many=True).data)

    def post(self, request, business_id, journal_id):
        business = self.get_business()
        journal = get_object_or_404(
            Journal, business_id=business_id, pk=journal_id
        )
        serializer = JournalEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.validated_data.get("account")
        if account is not None:
            account = get_object_or_404(
                Account, business_id=business_id, pk=account.id
            )
        if serializer.validated_data.get("amount", 0) <= 0:
            return Response(
                {"error": "amount must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(journal=journal, account=account)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LedgerListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.get_business()
        qs = Ledger.objects.filter(business_id=business_id)
        return Response(LedgerSerializer(qs, many=True).data)


class LedgerDetailView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id, id):
        self.get_business()
        obj = get_object_or_404(Ledger, business_id=business_id, pk=id)
        return Response(LedgerSerializer(obj).data)


class ExpenseListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.get_business()
        qs = Expense.objects.filter(business_id=business_id)
        return Response(ExpenseSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.get_business()
        serializer = ExpenseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.validated_data.get("account")
        if account is not None:
            account = get_object_or_404(
                Account, business_id=business_id, pk=account.id
            )
        if serializer.validated_data.get("amount", 0) <= 0:
            return Response(
                {"error": "amount must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(business=business, account=account)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
