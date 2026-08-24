import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listAccounts,
  createAccount,
  fetchAccount,
  updateAccount,
  deleteAccount,
  listJournals,
  createJournal,
  fetchJournal,
  updateJournal,
  deleteJournal,
  postJournal,
  reverseJournal,
  listJournalEntries,
  createJournalEntry,
  listLedgers,
  fetchLedger,
  listExpenses,
  createExpense,
} from "./financeService";

const BIZ = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

interface Call {
  url: string;
  method: string;
  body?: unknown;
}

function setupFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fn;
  return fn;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const account = {
  id: "a1",
  name: "Kas",
  code: "1000",
  business: BIZ,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const journal = {
  id: "j1",
  reference: "JRN-1",
  memo: "Memo",
  status: "DRAFT",
  business: BIZ,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const ledger = {
  id: "l1",
  journal_entry: "je1",
  account: "a1",
  entry_type: "DEBIT",
  amount: "100.00",
  posted_at: "2024-01-01T00:00:00Z",
};

const expense = {
  id: "e1",
  account: "a1",
  description: "Listrik",
  amount: "50000.00",
  business: BIZ,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("financeService — accounts", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists accounts from the business-scoped endpoint", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/accounts/`)
        ? jsonResponse([account])
        : jsonResponse({}),
    );
    const res = await listAccounts(BIZ);
    expect(res).toEqual([account]);
    const call: Call = { url: fn.mock.calls[0][0], method: fn.mock.calls[0][1]?.method ?? "GET" };
    expect(String(call.url).endsWith(`/businesses/${BIZ}/accounts/`)).toBe(true);
    expect(call.method).toBe("GET");
  });

  it("creates an account with only writable fields (name, code)", async () => {
    const fn = setupFetch((url, init) =>
      String(url).includes(`/businesses/${BIZ}/accounts/`)
        ? jsonResponse(account, 201)
        : jsonResponse({}),
    );
    const res = await createAccount(BIZ, { name: "Kas", code: "1000" });
    expect(res.id).toBe("a1");
    const call = fn.mock.calls[0];
    const sent = JSON.parse((call[1] as RequestInit).body as string);
    expect(sent).toEqual({ name: "Kas", code: "1000" });
    expect((call[1] as RequestInit).method).toBe("POST");
  });

  it("fetches a single account by id", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/accounts/a1/`)
        ? jsonResponse(account)
        : jsonResponse({}),
    );
    const res = await fetchAccount(BIZ, "a1");
    expect(res.id).toBe("a1");
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/accounts/a1/`)).toBe(true);
    expect(fn.mock.calls[0][1]?.method ?? "GET").toBe("GET");
  });

  it("updates an account with PUT (full) and PATCH (partial)", async () => {
    const fn = setupFetch((url, init) =>
      String(url).includes(`/businesses/${BIZ}/accounts/a1/`)
        ? jsonResponse({ ...account, name: "Bank" })
        : jsonResponse({}),
    );
    await updateAccount(BIZ, "a1", { name: "Bank", code: "1000" }, true);
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("PUT");
    fn.mockClear();
    await updateAccount(BIZ, "a1", { name: "Bank" }, false);
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
  });

  it("deletes an account with DELETE", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/accounts/a1/`)
        ? new Response(null, { status: 204 })
        : jsonResponse({}),
    );
    await deleteAccount(BIZ, "a1");
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
  });

  it("never sends business in the account payload", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/accounts/`)
        ? jsonResponse(account, 201)
        : jsonResponse({}),
    );
    await createAccount(BIZ, { name: "Kas", code: "1000", business: BIZ } as any);
    const sent = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.business).toBeUndefined();
  });
});

describe("financeService — journals", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists journals", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/`)
        ? jsonResponse([journal])
        : jsonResponse({}),
    );
    const res = await listJournals(BIZ);
    expect(res).toEqual([journal]);
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/journals/`)).toBe(true);
  });

  it("creates a journal with reference and memo", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/`)
        ? jsonResponse(journal, 201)
        : jsonResponse({}),
    );
    const res = await createJournal(BIZ, { reference: "JRN-1", memo: "Memo" });
    expect(res.id).toBe("j1");
    const sent = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ reference: "JRN-1", memo: "Memo" });
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });

  it("fetches a journal by id", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/`)
        ? jsonResponse(journal)
        : jsonResponse({}),
    );
    const res = await fetchJournal(BIZ, "j1");
    expect(res.id).toBe("j1");
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/journals/j1/`)).toBe(true);
  });

  it("updates a journal with PUT/PATCH", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/`)
        ? jsonResponse(journal)
        : jsonResponse({}),
    );
    await updateJournal(BIZ, "j1", { reference: "X", memo: "M" }, true);
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("PUT");
    fn.mockClear();
    await updateJournal(BIZ, "j1", { memo: "M" }, false);
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
  });

  it("deletes a journal with DELETE", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/`)
        ? new Response(null, { status: 204 })
        : jsonResponse({}),
    );
    await deleteJournal(BIZ, "j1");
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
  });

  it("posts a journal via POST /post/", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/post/`)
        ? jsonResponse({ ...journal, status: "POSTED" })
        : jsonResponse({}),
    );
    const res = await postJournal(BIZ, "j1");
    expect(res.status).toBe("POSTED");
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("POST");
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/journals/j1/post/`)).toBe(true);
  });

  it("reverses a journal via POST /reverse/", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/reverse/`)
        ? jsonResponse({ ...journal, status: "REVERSED" })
        : jsonResponse({}),
    );
    const res = await reverseJournal(BIZ, "j1");
    expect(res.status).toBe("REVERSED");
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("POST");
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/journals/j1/reverse/`)).toBe(true);
  });
});

describe("financeService — journal entries", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists entries under a journal", async () => {
    const entry = {
      id: "je1",
      journal: "j1",
      account: "a1",
      entry_type: "DEBIT",
      amount: "100.00",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/entries/`)
        ? jsonResponse([entry])
        : jsonResponse({}),
    );
    const res = await listJournalEntries(BIZ, "j1");
    expect(res).toEqual([entry]);
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/journals/j1/entries/`)).toBe(true);
  });

  it("creates an entry with account, entry_type and amount", async () => {
    const entry = {
      id: "je1",
      journal: "j1",
      account: "a1",
      entry_type: "DEBIT",
      amount: "100.00",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/journals/j1/entries/`)
        ? jsonResponse(entry, 201)
        : jsonResponse({}),
    );
    await createJournalEntry(BIZ, "j1", { account: "a1", entry_type: "DEBIT", amount: 100 });
    const sent = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ account: "a1", entry_type: "DEBIT", amount: 100 });
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });
});

describe("financeService — ledgers", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists ledgers (read-only)", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/ledgers/`)
        ? jsonResponse([ledger])
        : jsonResponse({}),
    );
    const res = await listLedgers(BIZ);
    expect(res).toEqual([ledger]);
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/ledgers/`)).toBe(true);
    expect(fn.mock.calls[0][1]?.method ?? "GET").toBe("GET");
  });

  it("fetches a ledger detail (read-only)", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/ledgers/l1/`)
        ? jsonResponse(ledger)
        : jsonResponse({}),
    );
    const res = await fetchLedger(BIZ, "l1");
    expect(res.id).toBe("l1");
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/ledgers/l1/`)).toBe(true);
  });
});

describe("financeService — expenses", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists expenses", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/expenses/`)
        ? jsonResponse([expense])
        : jsonResponse({}),
    );
    const res = await listExpenses(BIZ);
    expect(res).toEqual([expense]);
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/expenses/`)).toBe(true);
  });

  it("creates an expense with account, description and amount", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/expenses/`)
        ? jsonResponse(expense, 201)
        : jsonResponse({}),
    );
    const res = await createExpense(BIZ, { account: "a1", description: "Listrik", amount: 50000 });
    expect(res.id).toBe("e1");
    const sent = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ account: "a1", description: "Listrik", amount: 50000 });
    expect((fn.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });

  it("never sends business in the expense payload", async () => {
    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/expenses/`)
        ? jsonResponse(expense, 201)
        : jsonResponse({}),
    );
    await createExpense(BIZ, { account: "a1", description: "Listrik", amount: 50000, business: BIZ } as any);
    const sent = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.business).toBeUndefined();
  });
});
