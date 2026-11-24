"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { type MenuGroup, visibleMenu } from "@/lib/menu";
import { isActiveLink } from "@/lib/sections";
import { useWorkspace } from "@/lib/workspace";

/** The group whose page is open, so it starts unfolded. */
function groupOf(groups: MenuGroup[], pathname: string) {
  return (
    groups.find((group) => group.links.some((link) => isActiveLink(link, pathname)))?.key ??
    groups.find((group) => group.href && (pathname === group.href || pathname.startsWith(`${group.href}/`)))?.key ??
    null
  );
}

/**
 * The main menu: every module by name, in the order staff know, each folding open to its pages.
 * One group is open at a time; the one holding the current page opens by itself.
 */
export function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const { canSee, t } = useWorkspace();
  const groups = visibleMenu(canSee);
  const current = groupOf(groups, pathname);
  // What the user opened by hand, and the page they did it on: going elsewhere follows the page.
  const [picked, setPicked] = useState<{ key: string | null; at: string } | null>(null);
  const open = picked?.at === pathname ? picked.key : current;

  return (
    <nav aria-label="Main" className="no-scrollbar flex h-full flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const Icon = group.icon;
        const active = group.key === current;
        const row = `group/row flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-200 ${
          active ? "bg-white/10 font-medium text-white" : "text-panel-ink-soft hover:bg-white/5 hover:text-white"
        }`;
        const icon = (
          <Icon aria-hidden className={`size-5 shrink-0 ${active ? "text-white" : ""}`} strokeWidth={1.6} />
        );
        if (group.href) {
          return (
            <Link key={group.key} href={group.href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={row}>
              {icon}
              <span className="truncate">{t(group.label)}</span>
            </Link>
          );
        }
        const unfolded = open === group.key;
        return (
          <div key={group.key}>
            <button
              type="button"
              aria-expanded={unfolded}
              onClick={() => setPicked({ key: unfolded ? null : group.key, at: pathname })}
              className={row}
            >
              {icon}
              <span className="truncate">{t(group.label)}</span>
              <ChevronDown
                aria-hidden
                className={`ms-auto size-4 shrink-0 transition-transform duration-300 ${unfolded ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                unfolded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div inert={!unfolded ? true : undefined} className="overflow-hidden">
                <div className="ms-[1.35rem] my-1 flex flex-col gap-0.5 border-s border-white/10 ps-3">
                  {group.links.map((link) => {
                    const here = isActiveLink(link, pathname);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={here ? "page" : undefined}
                        onClick={onNavigate}
                        className={`rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                          here ? "bg-link font-medium text-white" : "text-panel-ink-soft hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {t(link.label)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
