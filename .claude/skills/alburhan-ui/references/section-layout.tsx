"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useMe } from "@/lib/hooks";
import { type Area, areaGroups, isActiveLink, type SectionGroup } from "@/lib/sections";

export type { SectionGroup, SectionLink } from "@/lib/sections";

/**
 * A side menu for one area: a white panel against the sidebar on wide screens, which a round
 * button folds away, and a scrolling row on small screens.
 */
export function SectionLayout({
  groups,
  children,
}: {
  groups: SectionGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const shown = groups.filter((group) => group.links.length > 0);

  return (
    <div
      className={`grid gap-5 lg:-my-5 lg:-ml-6 lg:gap-8 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out ${
        open ? "lg:grid-cols-[14rem_minmax(0,1fr)]" : "lg:grid-cols-[0rem_minmax(0,1fr)]"
      }`}
    >
      <div className="relative lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]">
        <nav
          aria-label="Section"
          className={`flex gap-4 overflow-x-auto border-b border-line pb-2 lg:h-full lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0 lg:bg-surface lg:px-3 lg:py-6 ${
            open ? "" : "lg:invisible"
          }`}
        >
          {shown.map((group, index) => (
            <div key={group.title} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
              {index > 0 ? <hr className="mx-3 my-4 hidden border-line lg:block" /> : null}
              <h2 className="hidden px-3 pb-2 text-[17px] font-semibold text-ink lg:block">
                {group.title}
              </h2>
              {group.links.map((link) => {
                const active = isActiveLink(link, pathname);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors lg:py-2.5 lg:text-[15px] ${
                      active
                        ? "bg-[#f0ecff] font-medium text-ink"
                        : "text-ink-soft hover:bg-surface-muted hover:text-ink lg:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          type="button"
          aria-label={open ? "Hide menu" : "Show menu"}
          aria-expanded={open}
          title={open ? "Hide menu" : "Show menu"}
          onClick={() => setOpen(!open)}
          className={`absolute top-4 z-10 hidden size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-colors hover:bg-surface-muted lg:inline-flex ${
            open ? "-right-[18px]" : "left-3"
          }`}
        >
          {open ? (
            <ChevronLeft aria-hidden className="size-4" />
          ) : (
            <ChevronRight aria-hidden className="size-4" />
          )}
        </button>
      </div>
      <div className={`min-w-0 lg:py-5 ${open ? "" : "lg:pl-10"}`}>
        <div className="mx-auto w-full max-w-[96rem]">{children}</div>
      </div>
    </div>
  );
}

/** The page menu for one area, built from the same list as the sidebar flyout. */
export function AreaLayout({ area, children }: { area: Area; children: ReactNode }) {
  const { data: me } = useMe();
  const can = (permission: string) => me?.permissions[permission] === "all";
  return <SectionLayout groups={areaGroups(area, can)}>{children}</SectionLayout>;
}
