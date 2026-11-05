import { cookies } from "next/headers";

import { TillShell } from "@/components/till-shell";
import { LOCALE_COOKIE } from "@/lib/i18n";

export default async function TillLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
  return <TillShell locale={locale}>{children}</TillShell>;
}
