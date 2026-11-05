"use client";

import { TillScreen } from "@/components/pos-till";
import { useWorkspace } from "@/lib/workspace";

export default function StandaloneTillPage() {
  const { can, t } = useWorkspace();
  if (!can("pos.sale.create")) {
    return <p className="mx-auto mt-20 max-w-md text-center text-sm text-ink-soft">{t("Your role can't sell at the till. Ask an administrator for the 'Sell at the POS' permission.")}</p>;
  }
  return <TillScreen />;
}
