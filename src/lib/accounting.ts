"use client";

import { useResource } from "@/lib/hooks";
import type { Account, AccountType, Journal, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const ACCOUNT_TYPES: [AccountType, string][] = [
  ["asset", "Asset"],
  ["liability", "Liability"],
  ["equity", "Equity"],
  ["income", "Income"],
  ["expense", "Expense"],
];

/** Every account of the current company (one request, cached and shared by all accounting screens). */
export function useAccounts() {
  const { company } = useWorkspace();
  const { data } = useResource<Page<Account>>(
    `/accounting/accounts?company=${company.id}&page_size=500&ordering=code`,
  );
  return data?.results ?? [];
}

export function useJournals() {
  const { company } = useWorkspace();
  const { data } = useResource<Page<Journal>>(`/accounting/journals?company=${company.id}&page_size=100`);
  return data?.results ?? [];
}
