import uuid

from django.db import models

from apps.business.models import Business


class Account(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Accounts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["business", "code"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.business.name})"


class Journal(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        REVERSED = "REVERSED", "Reversed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="journals",
    )
    reference = models.CharField(max_length=100)
    memo = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Journal"
        verbose_name_plural = "Journals"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["business", "status"]),
        ]

    def __str__(self):
        return f"Journal {self.reference} ({self.status})"


class JournalEntry(models.Model):
    class EntryType(models.TextChoices):
        DEBIT = "DEBIT", "Debit"
        CREDIT = "CREDIT", "Credit"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(
        Journal,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    entry_type = models.CharField(
        max_length=10,
        choices=EntryType.choices,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["journal"]),
            models.Index(fields=["account"]),
        ]

    def __str__(self):
        return f"{self.entry_type} {self.amount} - {self.account.name}"


class Ledger(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="ledger_lines",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    entry_type = models.CharField(max_length=10, choices=JournalEntry.EntryType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    posted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ledger Entry"
        verbose_name_plural = "Ledger Entries"
        ordering = ["-posted_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["business", "account"]),
            models.Index(fields=["journal_entry"]),
        ]

    def __str__(self):
        return f"{self.entry_type} {self.amount} - {self.account.code}"


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name="expenses",
        null=True,
        blank=True,
    )
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business"]),
            models.Index(fields=["business", "account"]),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount}"