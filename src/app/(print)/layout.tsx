import { cookies } from "next/headers";

import { PrintShell } from "@/components/print-shell";
import { LOCALE_COOKIE } from "@/lib/i18n";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
  return <PrintShell locale={locale}>{children}</PrintShell>;
}
