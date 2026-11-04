"use client";

import { AreaLayout } from "@/components/section-layout";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AreaLayout area="settings">{children}</AreaLayout>;
}
