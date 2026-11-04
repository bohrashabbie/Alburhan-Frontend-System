import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { LOCALE_COOKIE } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
  return <AppShell locale={locale}>{children}</AppShell>;
}
