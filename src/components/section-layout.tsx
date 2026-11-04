"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { type Area, areaGroups, isActiveLink, type SectionGroup } from "@/lib/sections";
import { useWorkspace } from "@/lib/workspace";

/**
 * A side menu for one area: a white panel against the rail on wide screens, which a round
 * button folds away, and a scrolling row on small screens.
 */
export function SectionLayout({ groups, children }: { groups: SectionGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useWorkspace();
  const [open, setOpen] = useState(true);
  const shown = groups.filter((group) => group.links.length > 0);

  return (
    <div
      className={`grid gap-5 lg:-my-5 lg:-ms-6 lg:gap-8 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out ${
        open ? "lg:grid-cols-[14rem_minmax(0,1fr)]" : "lg:grid-cols-[0rem_minmax(0,1fr)]"
      }`}
    >
      <div className="relative lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]">
        <nav
          aria-label="Section"
          className={`flex gap-4 overflow-x-auto border-b border-line pb-2 lg:h-full lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto lg:border-e lg:border-b-0 lg:bg-surface lg:px-3 lg:py-6 ${
            open ? "" : "lg:invisible"
          }`}
        >
          {shown.map((group, index) => (
            <div key={group.title} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
              {index > 0 ? <hr className="mx-3 my-4 hidden border-line lg:block" /> : null}
              <h2 className="hidden px-3 pb-2 text-[17px] font-semibold text-ink lg:block">
                {t(group.title)}
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
                    {t(link.label)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          type="button"
          aria-label={open ? t("Hide menu") : t("Show menu")}
          aria-expanded={open}
          title={open ? t("Hide menu") : t("Show menu")}
          onClick={() => setOpen(!open)}
          className={`absolute top-4 z-10 hidden size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-colors hover:bg-surface-muted lg:inline-flex ${
            open ? "-end-[18px]" : "start-3"
          }`}
        >
          {open ? (
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
          ) : (
            <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
          )}
        </button>
      </div>
      <div className={`min-w-0 lg:py-5 ${open ? "" : "lg:ps-10"}`}>
        <div className="mx-auto w-full max-w-[96rem]">{children}</div>
      </div>
    </div>
  );
}

/** The page menu for one area, built from the same list as the rail flyout. */
export function AreaLayout({ area, children }: { area: Area; children: ReactNode }) {
  const { canSee } = useWorkspace();
  return <SectionLayout groups={areaGroups(area, canSee)}>{children}</SectionLayout>;
}
