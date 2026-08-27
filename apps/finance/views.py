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
from apps.authentication.permissions import BusinessAccessMixin


class BusinessOwnedMixin(BusinessAccessMixin):
    permission_classes = [IsAuthenticated]


class AccountListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.require_business_permission("finance", "view")
        qs = Account.objects.filter(business_id=business_id)
        return Response(AccountSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.require_business_permission("finance", "create")
        serializer = AccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AccountDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.require_business_permission("finance", "view")
        return get_object_or_404(Account, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(AccountSerializer(obj).data)

    def put(self, request, business_id, id):
        self.require_business_permission("finance", "update")
        obj = self.get_object(business_id, id)
        serializer = AccountSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, business_id, id):
        self.require_business_permission("finance", "update")
        obj = self.get_object(business_id, id)
        serializer = AccountSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, id):
        self.require_business_permission("finance", "delete")
        obj = self.get_object(business_id, id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JournalListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.require_business_permission("finance", "view")
        qs = Journal.objects.filter(business_id=business_id)
        return Response(JournalSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.require_business_permission("finance", "create")
        serializer = JournalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JournalDetailView(BusinessOwnedMixin, APIView):
    def get_object(self, business_id, pk):
        self.require_business_permission("finance", "view")
        return get_object_or_404(Journal, business_id=business_id, pk=pk)

    def get(self, request, business_id, id):
        obj = self.get_object(business_id, id)
        return Response(JournalSerializer(obj).data)

    def put(self, request, business_id, id):
        self.require_business_permission("finance", "update")
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
        self.require_business_permission("finance", "update")
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
        self.require_business_permission("finance", "delete")
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
        self.require_business_permission("finance", "update")
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
        self.require_business_permission("finance", "view")
        return get_object_or_404(Journal, business_id=business_id, pk=pk)


class JournalReverseView(BusinessOwnedMixin, APIView):
    def post(self, request, business_id, id):
        self.require_business_permission("finance", "update")
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
        self.require_business_permission("finance", "view")
        return get_object_or_404(Journal, business_id=business_id, pk=pk)


class JournalEntryListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id, journal_id):
        self.require_business_permission("finance", "view")
        qs = JournalEntry.objects.filter(
            journal__business_id=business_id, journal_id=journal_id
        )
        return Response(JournalEntrySerializer(qs, many=True).data)

    def post(self, request, business_id, journal_id):
        business = self.require_business_permission("finance", "create")
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
        self.require_business_permission("finance", "view")
        qs = Ledger.objects.filter(business_id=business_id)
        return Response(LedgerSerializer(qs, many=True).data)


class LedgerDetailView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id, id):
        self.require_business_permission("finance", "view")
        obj = get_object_or_404(Ledger, business_id=business_id, pk=id)
        return Response(LedgerSerializer(obj).data)


class ExpenseListView(BusinessOwnedMixin, APIView):
    def get(self, request, business_id):
        self.require_business_permission("finance", "view")
        qs = Expense.objects.filter(business_id=business_id)
        return Response(ExpenseSerializer(qs, many=True).data)

    def post(self, request, business_id):
        business = self.require_business_permission("finance", "create")
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
