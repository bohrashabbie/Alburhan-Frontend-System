"use client";

import { AreaLayout } from "@/components/section-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaLayout area="projects">{children}</AreaLayout>;
}
