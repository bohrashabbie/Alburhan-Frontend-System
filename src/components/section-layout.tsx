"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState, useSyncExternalStore } from "react";

import { type Area, areaGroups, isActiveLink, type SectionGroup } from "@/lib/sections";
import { useWorkspace } from "@/lib/workspace";

const STORAGE_KEY = "ab_section_menu";

const listeners = new Set<() => void>();

function readOpen() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
  } catch {
    // Not remembered in private mode.
  }
  listeners.forEach((listener) => listener());
}

/**
 * A side menu for one area: a white panel against the rail on wide screens, which a round
 * button folds away (the choice is remembered), and a scrolling row on small screens.
 * Folding animates the column width while the links fade and slide; the chevron turns.
 */
export function SectionLayout({ groups, children }: { groups: SectionGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useWorkspace();
  // The server always renders it open; the browser then applies the remembered choice.
  const open = useSyncExternalStore(subscribe, readOpen, () => true);
  // Bumped on every open so the links replay their entrance.
  const [opened, setOpened] = useState(0);
  const shown = groups.filter((group) => group.links.length > 0);
  const setOpen = (next: boolean) => {
    if (next) setOpened((count) => count + 1);
    writeOpen(next);
  };
  let linkIndex = 0;

  return (
    <div
      className={`grid gap-5 lg:-my-5 lg:-ms-6 lg:gap-8 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "lg:grid-cols-[14rem_minmax(0,1fr)]" : "lg:grid-cols-[0rem_minmax(0,1fr)]"
      }`}
    >
      <div className="relative lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]">
        <nav
          aria-label="Section"
          inert={!open ? true : undefined}
          className={`flex gap-4 overflow-x-auto border-b border-line pb-2 lg:h-full lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto lg:border-e lg:border-b-0 lg:bg-surface lg:px-3 lg:py-6 lg:transition-[opacity,transform] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "lg:translate-x-0 lg:opacity-100" : "lg:pointer-events-none lg:-translate-x-6 lg:opacity-0 rtl:lg:translate-x-6"
          }`}
        >
          {shown.map((group, index) => (
            <div key={`${group.title}-${opened}`} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
              {index > 0 ? <hr className="mx-3 my-4 hidden border-line lg:block" /> : null}
              <h2 className="link-in hidden px-3 pb-2 text-[17px] font-semibold text-ink lg:block" style={{ animationDelay: `${linkIndex++ * 22}ms` }}>
                {t(group.title)}
              </h2>
              {group.links.map((link) => {
                const active = isActiveLink(link, pathname);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    style={{ animationDelay: `${linkIndex++ * 22}ms` }}
                    className={`link-in relative rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-200 lg:py-2.5 lg:text-[15px] lg:before:absolute lg:before:inset-y-2 lg:before:start-0 lg:before:w-[3px] lg:before:rounded-full lg:before:bg-link lg:before:transition-transform lg:before:duration-300 ${
                      active
                        ? "bg-[#f0ecff] font-medium text-ink lg:before:scale-y-100"
                        : "text-ink-soft hover:bg-surface-muted hover:text-ink lg:text-ink lg:before:scale-y-0"
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
          className={`absolute top-4 z-10 hidden size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-[inset-inline-start,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-muted hover:shadow-md lg:inline-flex ${
            open ? "start-[calc(14rem-18px)]" : "start-3"
          }`}
        >
          <ChevronLeft aria-hidden className={`size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rtl:rotate-180" : "rotate-180 rtl:rotate-0"}`} />
        </button>
      </div>
      <div className={`min-w-0 lg:py-5 lg:transition-[padding] lg:duration-300 ${open ? "" : "lg:ps-10"}`}>
        <div key={pathname} className="page-in mx-auto w-full max-w-[96rem]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The page menu for one area, built from the same list as the rail flyout. */
export function AreaLayout({ area, children }: { area: Area; children: ReactNode }) {
  const { canSee } = useWorkspace();
  return <SectionLayout groups={areaGroups(area, canSee)}>{children}</SectionLayout>;
}
