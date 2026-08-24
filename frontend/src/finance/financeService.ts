import { apiFetch } from "../lib/apiClient";
import type { Account, Journal, JournalEntry, Ledger, Expense, EntryType } from "./types";

// Accounts
export async function listAccounts(businessId: string): Promise<Account[]> {
  return apiFetch<Account[]>(`/businesses/${businessId}/accounts/`);
}

export async function createAccount(
  businessId: string,
  data: { name: string; code: string; business?: string }
): Promise<Account> {
  // business is server-side only (derived from URL context)
  const { business: _omit, ...payload } = data;
  return apiFetch<Account>(`/businesses/${businessId}/accounts/`, {
    method: "POST",
    body: payload,
  });
}

export async function fetchAccount(businessId: string, id: string): Promise<Account> {
  return apiFetch<Account>(`/businesses/${businessId}/accounts/${id}/`);
}

export async function updateAccount(
  businessId: string,
  id: string,
  data: Partial<Account>,
  fullPut = false
): Promise<Account> {
  // Strip read-only fields
  const { id: _, business: __, created_at: ___, updated_at: ____, ...payload } = data;
  return apiFetch<Account>(`/businesses/${businessId}/accounts/${id}/`, {
    method: fullPut ? "PUT" : "PATCH",
    body: payload,
  });
}

export async function deleteAccount(businessId: string, id: string): Promise<void> {
  return apiFetch<void>(`/businesses/${businessId}/accounts/${id}/`, {
    method: "DELETE",
  });
}

// Journals
export async function listJournals(businessId: string): Promise<Journal[]> {
  return apiFetch<Journal[]>(`/businesses/${businessId}/journals/`);
}

export async function createJournal(
  businessId: string,
  data: { reference: string; memo?: string }
): Promise<Journal> {
  return apiFetch<Journal>(`/businesses/${businessId}/journals/`, {
    method: "POST",
    body: data,
  });
}

export async function fetchJournal(businessId: string, id: string): Promise<Journal> {
  return apiFetch<Journal>(`/businesses/${businessId}/journals/${id}/`);
}

export async function updateJournal(
  businessId: string,
  id: string,
  data: Partial<Journal>,
  fullPut = false
): Promise<Journal> {
  const { id: _, business: __, created_at: ___, updated_at: ____, ...payload } = data;
  return apiFetch<Journal>(`/businesses/${businessId}/journals/${id}/`, {
    method: fullPut ? "PUT" : "PATCH",
    body: payload,
  });
}

export async function deleteJournal(businessId: string, id: string): Promise<void> {
  return apiFetch<void>(`/businesses/${businessId}/journals/${id}/`, {
    method: "DELETE",
  });
}

export async function postJournal(businessId: string, id: string): Promise<Journal> {
  return apiFetch<Journal>(`/businesses/${businessId}/journals/${id}/post/`, {
    method: "POST",
  });
}

export async function reverseJournal(businessId: string, id: string): Promise<Journal> {
  return apiFetch<Journal>(`/businesses/${businessId}/journals/${id}/reverse/`, {
    method: "POST",
  });
}

// Journal Entries
export async function listJournalEntries(
  businessId: string,
  journalId: string
): Promise<JournalEntry[]> {
  return apiFetch<JournalEntry[]>(`/businesses/${businessId}/journals/${journalId}/entries/`);
}

export async function createJournalEntry(
  businessId: string,
  journalId: string,
  data: { account: string; entry_type: EntryType; amount: number }
): Promise<JournalEntry> {
  return apiFetch<JournalEntry>(`/businesses/${businessId}/journals/${journalId}/entries/`, {
    method: "POST",
    body: data,
  });
}

// Ledgers
export async function listLedgers(businessId: string): Promise<Ledger[]> {
  return apiFetch<Ledger[]>(`/businesses/${businessId}/ledgers/`);
}

export async function fetchLedger(businessId: string, id: string): Promise<Ledger> {
  return apiFetch<Ledger>(`/businesses/${businessId}/ledgers/${id}/`);
}

// Expenses
export async function listExpenses(businessId: string): Promise<Expense[]> {
  return apiFetch<Expense[]>(`/businesses/${businessId}/expenses/`);
}

export async function createExpense(
  businessId: string,
  data: { account: string | null; description: string; amount: number; business?: string }
): Promise<Expense> {
  // business is server-side only (derived from URL context)
  const { business: _omit, ...payload } = data;
  return apiFetch<Expense>(`/businesses/${businessId}/expenses/`, {
    method: "POST",
    body: payload,
  });
}
