"use client";

import { Boxes, FolderKanban, Landmark, ShoppingCart, Truck, Wrench } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui";
import { fullName } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

// The areas still to be built, in delivery order. Each becomes a rail item when it ships.
const COMING = [
  { icon: Boxes, title: "Inventory", text: "Stock by showroom and warehouse, transfers, counts." },
  { icon: ShoppingCart, title: "Showroom sales & POS", text: "Quotation → invoice → payment → delivery." },
  { icon: Truck, title: "Purchasing", text: "Purchase orders, partial receiving, supplier invoices." },
  { icon: Landmark, title: "Accounts", text: "Automatic journals, receivables, payables, P&L." },
  { icon: FolderKanban, title: "Projects", text: "Design to handover, down payments, reservations." },
  { icon: Wrench, title: "Installation", text: "Work orders, crews, progress and handover." },
];

export default function OverviewPage() {
  const { me, company, branch, name, t } = useWorkspace();

  return (
    <>
      <PageHeader
        title={`${t("Home")}`}
        description={`${fullName(me)} · ${name(company)}${branch ? ` · ${name(branch)}` : ""}`}
      />
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl leading-7 font-semibold">Welcome to Al-Burhan ERP</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The foundation is ready: companies, branches, warehouses, exchange rates, users and roles.
          Set them up under{" "}
          <Link href="/settings" className="font-medium text-link hover:underline">
            {t("Settings")}
          </Link>
          .
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COMING.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex gap-3 rounded-xl border border-dashed border-line-strong p-4"
            >
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-soft" strokeWidth={1.5} />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-sm text-ink-soft">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
