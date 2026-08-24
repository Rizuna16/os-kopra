export interface Account {
  id: string;
  name: string;
  code: string;
  business: string;
  created_at: string;
  updated_at: string;
}

export type JournalStatus = "DRAFT" | "POSTED" | "REVERSED";

export interface Journal {
  id: string;
  reference: string;
  memo: string;
  status: JournalStatus;
  business: string;
  created_at: string;
  updated_at: string;
}

export type EntryType = "DEBIT" | "CREDIT";

export interface JournalEntry {
  id: string;
  journal: string;
  account: string;
  entry_type: EntryType;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface Ledger {
  id: string;
  journal_entry: string;
  account: string;
  entry_type: EntryType;
  amount: string;
  posted_at: string;
}

export interface Expense {
  id: string;
  account: string | null;
  description: string;
  amount: string;
  business: string;
  created_at: string;
  updated_at: string;
}
