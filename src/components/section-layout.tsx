"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { Area } from "@/lib/sections";

/** One area of the app. Its pages are listed in the main menu, so this only frames the page. */
export function AreaLayout({ children }: { area: Area; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in mx-auto w-full max-w-[100rem]">
      {children}
    </div>
  );
}
