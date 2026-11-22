"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Loading } from "@/components/ui";
import { useMe } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import { WorkspaceProvider } from "@/lib/workspace";

/** Signed-in, no menus: the printable documents (quotation, invoice, delivery note). */
export function PrintShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const { data: me, error, isLoading } = useMe();
  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);
  if (isLoading || !me) return <Loading />;
  return (
    <WorkspaceProvider me={me} locale={locale}>
      <div className="min-h-dvh bg-canvas py-8 print:bg-white print:py-0">{children}</div>
    </WorkspaceProvider>
  );
}
