"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { type Locale, localName, translate } from "@/lib/i18n";
import { saveLocale } from "@/lib/locale";
import type { Me } from "@/lib/types";

type CompanyRef = Me["companies"][number];
type BranchRef = Me["branches"][number];

type Workspace = {
  me: Me;
  locale: Locale;
  /** The company every screen works in. Every list and form is filtered to it. */
  company: CompanyRef;
  /** The branch, or null for "All branches" (only offered to company-wide roles). */
  branch: BranchRef | null;
  companies: CompanyRef[];
  branches: BranchRef[];
  /** True if a company-wide role exists in the current company. */
  companyWide: boolean;
  setCompany: (id: number) => void;
  setBranch: (id: number | null) => void;
  setLocale: (locale: Locale) => void;
  /** May the user do `code` in the current company (and branch, if one is chosen)? */
  can: (code: string) => boolean;
  /** Holds `code` anywhere in the current company: used to show menus. */
  canSee: (code: string) => boolean;
  t: (text: string) => string;
  name: (item: { name: string; name_ar?: string } | undefined) => string;
};

const WorkspaceContext = createContext<Workspace | null>(null);

const storageKey = (userId: number) => `ab_workspace_${userId}`;

function readStored(userId: number): { company?: number; branch?: number | null } {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "{}");
  } catch {
    return {};
  }
}

function writeStored(userId: number, value: { company: number; branch: number | null }) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

export function WorkspaceProvider({
  me,
  locale,
  children,
}: {
  me: Me;
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(() => {
    const stored = typeof window === "undefined" ? {} : readStored(me.id);
    return { company: stored.company ?? me.default_company, branch: stored.branch ?? null };
  });

  const value = useMemo<Workspace>(() => {
    const companies = me.companies;
    const company =
      companies.find((item) => item.id === choice.company) ??
      companies.find((item) => item.id === me.default_company) ??
      companies[0];
    const grants = me.access.filter((grant) => grant.company === company.id);
    const companyWide = me.is_superuser || grants.some((grant) => grant.branch === null);
    const branches = me.branches.filter((item) => item.company === company.id);

    // Branch-only users always work inside one of their branches.
    let branch = branches.find((item) => item.id === choice.branch) ?? null;
    if (!branch && !companyWide) branch = branches[0] ?? null;

    const can = (code: string) =>
      me.is_superuser ||
      grants.some(
        (grant) =>
          grant.permissions.includes(code) &&
          (grant.branch === null || (branch !== null && grant.branch === branch.id)),
      );
    const canSee = (code: string) =>
      me.is_superuser || grants.some((grant) => grant.permissions.includes(code));

    const remember = (next: { company: number; branch: number | null }) => {
      writeStored(me.id, next);
      setChoice(next);
    };

    return {
      me,
      locale,
      company,
      branch,
      companies,
      branches,
      companyWide,
      setCompany: (id) => remember({ company: id, branch: null }),
      setBranch: (id) => remember({ company: company.id, branch: id }),
      setLocale: (next) => {
        saveLocale(next);
        api.patch("/me", { preferred_language: next }).catch(() => null);
        router.refresh();
      },
      can,
      canSee,
      t: (text) => translate(locale, text),
      name: (item) => localName(locale, item),
    };
  }, [me, locale, choice, router]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

