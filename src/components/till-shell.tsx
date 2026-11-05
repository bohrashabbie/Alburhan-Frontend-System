"use client";

import { LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AccountMenu, WorkspaceChip } from "@/components/app-shell";
import { Brand } from "@/components/brand";
import { ButtonLink, Loading } from "@/components/ui";
import { useMe } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import { useWorkspace, WorkspaceProvider } from "@/lib/workspace";

/** Areas that make "Back office" worth showing: anything beyond selling at the till. */
const BACK_OFFICE = ["sales.invoice.view", "inventory.stock.view", "accounting.report.view", "pos.register.view", "reports.dashboard.view"];

function Bar() {
  const { canSee, t } = useWorkspace();
  const backOffice = BACK_OFFICE.some((code) => canSee(code));
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <span className="flex shrink-0 items-center gap-2.5 text-ink">
        <Brand large />
        <span className="hidden rounded-full bg-panel px-2.5 py-0.5 text-xs font-semibold tracking-wide text-panel-ink uppercase sm:inline">POS</span>
      </span>
      <span className="flex-1" />
      {backOffice ? (
        <ButtonLink
          href="/overview"
          variant="ghost"
          className="h-9"
          onClick={(event) => {
            // On the POS domain the ERP lives on the same host without "pos.".
            const { protocol, host } = window.location;
            if (host.startsWith("pos.")) {
              event.preventDefault();
              window.location.assign(new URL("/overview", `${protocol}//${host.slice(4)}`).toString());
            }
          }}
        >
          <LayoutGrid aria-hidden className="size-4" />
          <span className="hidden sm:inline">{t("Back office")}</span>
        </ButtonLink>
      ) : null}
      <WorkspaceChip />
      <AccountMenu />
    </header>
  );
}

/**
 * The stand-alone POS website: no rail and no area menus, just the till under a slim bar. Served at
 * /till, and at the root of the POS domain (pos.…) through the proxy.
 */
export function TillShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const { data: me, error, isLoading } = useMe();

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);

  if (isLoading || !me) {
    if (error && error.status !== 401) return <Loading label="Can't load your account. Refresh to try again." />;
    return <Loading />;
  }
  if (me.companies.length === 0) {
    return <Loading label="Your account has no company access yet. Ask an administrator to assign you a role." />;
  }
  return (
    <WorkspaceProvider me={me} locale={locale}>
      <div className="min-h-dvh bg-canvas">
        <Bar />
        <main className="px-4 py-4 sm:px-6">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
