"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { NAV } from "@/components/app-shell";
import { type Area, areaGroups } from "@/lib/sections";
import { useWorkspace } from "@/lib/workspace";

const ABOUT: Record<Area, string> = {
  sales: "Quotations, invoices, deliveries, payments and returns.",
  pos: "The showroom till, shifts and receipts.",
  projects: "Bills of quantities, stock to site and progress invoices.",
  catalog: "Products, families, brands and price lists.",
  partners: "Customers and suppliers with their contacts.",
  inventory: "Stock levels, transfers, counts and reorder alerts.",
  purchasing: "Purchase orders, goods receipts, supplier bills and payments.",
  installation: "Installation jobs, the schedule board and technicians.",
  accounts: "Journals, statements, VAT and filings.",
  settings: "Companies, branches, users and roles.",
};

/** One card per area the person can open, with its pages as links: the first screen for staff. */
export function YourAreas() {
  const { canSee, t } = useWorkspace();
  const areas = NAV.filter((item) => item.section && areaGroups(item.section, canSee).length > 0);
  return (
    <section>
      <h2 className="mb-3 text-base font-bold">{t("Your areas")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((item, index) => {
          const Icon = item.icon;
          const links = areaGroups(item.section as Area, canSee).flatMap((group) => group.links);
          return (
            <article key={item.href} className="link-in group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-md" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="flex items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel text-white transition-colors group-hover:bg-link">
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold">{t(item.label)}</span>
                  <span className="block text-sm text-ink-soft">{t(ABOUT[item.section as Area])}</span>
                </span>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {links.slice(0, 6).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong px-3 text-sm transition-colors hover:border-link hover:bg-[#f0ecff]">
                      {t(link.label)}
                      <ArrowRight aria-hidden className="size-3.5 text-ink-faint rtl:-scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
