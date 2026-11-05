"use client";

import {
  ArrowRight,
  Boxes,
  Clock,
  FileText,
  FolderKanban,
  Landmark,
  Lightbulb,
  type LucideIcon,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { type Area, areaGroups } from "@/lib/sections";
import type { Customer, Invoice, Page, Product, Project, PurchaseOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Entry = { key: string; group: string; label: string; hint?: string; href: string; icon: LucideIcon; keywords?: string };

const AREA_ICONS: Record<Area, LucideIcon> = {
  sales: Tag,
  pos: ShoppingCart,
  projects: FolderKanban,
  catalog: Lightbulb,
  partners: UserRound,
  inventory: Boxes,
  purchasing: Truck,
  installation: Wrench,
  accounts: Landmark,
  settings: Settings,
};

const AREA_NAMES: Record<Area, string> = {
  sales: "Sales",
  pos: "POS",
  projects: "Projects",
  catalog: "Catalog",
  partners: "Customers & suppliers",
  inventory: "Inventory",
  purchasing: "Purchasing",
  installation: "Installation",
  accounts: "Accounts",
  settings: "Settings",
};

/** Things people start most often, each behind its create permission. */
const CREATE: { label: string; href: string; permission: string; icon: LucideIcon }[] = [
  { label: "New quotation", href: "/sales/quotations?new=1", permission: "sales.quotation.create", icon: FileText },
  { label: "New invoice", href: "/sales/invoices?new=1", permission: "sales.invoice.create", icon: FileText },
  { label: "Record a customer payment", href: "/sales/receipts?new=1", permission: "sales.receipt.create", icon: FileText },
  { label: "Open the till", href: "/pos/till", permission: "pos.sale.create", icon: ShoppingCart },
  { label: "New customer", href: "/partners/customers?new=1", permission: "partners.customer.create", icon: UserRound },
  { label: "New product", href: "/catalog/products?new=1", permission: "catalog.product.create", icon: Lightbulb },
  { label: "New purchase order", href: "/purchasing/orders?new=1", permission: "purchasing.order.create", icon: Truck },
  { label: "New supplier bill", href: "/purchasing/bills?new=1", permission: "purchasing.invoice.create", icon: Truck },
  { label: "New project", href: "/projects/list?new=1", permission: "projects.project.create", icon: FolderKanban },
  { label: "New installation job", href: "/installation/work-orders?new=1", permission: "installation.work_order.create", icon: Wrench },
  { label: "New stock transfer", href: "/inventory/transfers?new=1", permission: "inventory.transfer.create", icon: Boxes },
  { label: "New journal entry", href: "/accounts/entries?new=1", permission: "accounting.entry.create", icon: Landmark },
];

const RECENT_KEY = "ab_recent_pages";

function readRecent(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Remember a page the user went to through the palette (most recent first, 5 kept). */
function remember(href: string) {
  try {
    const next = [href, ...readRecent().filter((item) => item !== href)].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: recents simply aren't kept.
  }
}

function useRecords(term: string, enabled: boolean) {
  const { company, canSee } = useWorkspace();
  const search = term.trim();
  const on = enabled && search.length >= 2;
  const query = (path: string, permission: string, size = 4) =>
    on && canSee(permission) ? withQuery(path, { company: company.id, search, page_size: size }) : null;
  const customers = useResource<Page<Customer>>(query("/partners/customers", "partners.customer.view"));
  const products = useResource<Page<Product>>(on && canSee("catalog.product.view") ? withQuery("/catalog/products", { search, page_size: 4 }) : null);
  const invoices = useResource<Page<Invoice>>(query("/sales/invoices", "sales.invoice.view"));
  const orders = useResource<Page<PurchaseOrder>>(query("/purchasing/orders", "purchasing.order.view", 3));
  const projects = useResource<Page<Project>>(query("/projects/projects", "projects.project.view", 3));
  const loading = on && [customers, products, invoices, orders, projects].some((item) => item.isLoading);
  return { customers: customers.data?.results ?? [], products: products.data?.results ?? [], invoices: invoices.data?.results ?? [], orders: orders.data?.results ?? [], projects: projects.data?.results ?? [], loading };
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { can, canSee, name, t } = useWorkspace();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  const records = useRecords(deferred, open);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      input.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  const pages = useMemo<Entry[]>(() => {
    const entries: Entry[] = [{ key: "home", group: "Go to", label: t("Home"), hint: t("Dashboard"), href: "/overview", icon: ArrowRight }];
    for (const area of Object.keys(AREA_NAMES) as Area[]) {
      for (const group of areaGroups(area, canSee)) {
        for (const link of group.links) {
          entries.push({ key: `page-${link.href}`, group: "Go to", label: t(link.label), hint: t(AREA_NAMES[area]), href: link.href, icon: AREA_ICONS[area], keywords: `${link.label} ${AREA_NAMES[area]} ${group.title}` });
        }
      }
    }
    return entries;
  }, [canSee, t]);

  const creates = useMemo<Entry[]>(
    () => CREATE.filter((item) => can(item.permission)).map((item) => ({ key: `create-${item.href}`, group: "Create", label: t(item.label), href: item.href, icon: item.icon === FileText ? Plus : item.icon })),
    [can, t],
  );

  const term = query.trim().toLowerCase();
  const matches = (entry: Entry) => !term || `${entry.label} ${entry.hint ?? ""} ${entry.keywords ?? ""}`.toLowerCase().includes(term);
  const recentHrefs = open && !term ? readRecent() : [];
  const recent = recentHrefs.map((href) => pages.find((entry) => entry.href === href) ?? creates.find((entry) => entry.href === href)).filter(Boolean).map((entry) => ({ ...entry!, key: `recent-${entry!.key}`, group: "Recent", icon: Clock }));
  const found: Entry[] = [
    ...records.customers.map((c) => ({ key: `c${c.id}`, group: "Customers", label: name(c), hint: `${c.code}${c.mobile ? ` · ${c.mobile}` : ""}`, href: `/partners/customers?open=${c.id}`, icon: UserRound })),
    ...records.invoices.map((inv) => ({ key: `i${inv.id}`, group: "Invoices", label: inv.number || t("Draft invoice"), hint: `${inv.customer_name} · ${inv.total} ${inv.currency}`, href: `/sales/invoices?open=${inv.id}`, icon: FileText })),
    ...records.products.map((p) => ({ key: `p${p.id}`, group: "Products", label: name(p), hint: p.sku, href: `/catalog/products?open=${p.id}`, icon: Lightbulb })),
    ...records.orders.map((o) => ({ key: `o${o.id}`, group: "Purchase orders", label: o.number || t("Draft order"), hint: `${o.supplier_name} · ${o.total} ${o.currency}`, href: `/purchasing/orders?open=${o.id}`, icon: Truck })),
    ...records.projects.map((p) => ({ key: `r${p.id}`, group: "Projects", label: name(p), hint: `${p.number} · ${p.customer_name}`, href: `/projects/list?open=${p.id}`, icon: FolderKanban })),
  ];
  const entries = [...recent, ...creates.filter(matches).slice(0, term ? 6 : 4), ...(term ? found : []), ...pages.filter(matches).slice(0, term ? 12 : 40)];
  const current = Math.min(active, Math.max(entries.length - 1, 0));

  const go = (entry: Entry) => {
    remember(entry.href);
    onClose();
    setQuery("");
    router.push(entry.href);
  };

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current + 1) % Math.max(entries.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current - 1 + entries.length) % Math.max(entries.length, 1));
    } else if (event.key === "Enter" && entries[current]) {
      event.preventDefault();
      go(entries[current]);
    }
  };

  useEffect(() => {
    document.getElementById(`palette-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  let lastGroup = "";
  return (
    <dialog
      ref={dialog}
      aria-label={t("Search or jump to")}
      onClose={() => { setQuery(""); setActive(0); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}
      className="mx-auto mt-[12vh] mb-auto w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40"
    >
      {open ? (
        <div onKeyDown={onKey}>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search aria-hidden className="size-5 shrink-0 text-ink-faint" />
            <input
              ref={input}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              placeholder={t("Search pages, customers, products, invoices…")}
              aria-label={t("Search or jump to")}
              aria-controls="palette-list"
              aria-activedescendant={entries[current] ? `palette-${current}` : undefined}
              className="input-bare h-14 min-w-0 flex-1 border-0 bg-transparent text-base placeholder:text-ink-faint focus:outline-none"
            />
            <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-soft sm:block">Esc</kbd>
          </div>
          <ul id="palette-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {entries.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-ink-soft">{records.loading ? t("Searching…") : t("Nothing found.")}</li>
            ) : (
              entries.map((entry, index) => {
                const heading = entry.group !== lastGroup ? entry.group : null;
                lastGroup = entry.group;
                const Icon = entry.icon;
                return (
                  <li key={entry.key} role="presentation">
                    {heading ? <p className="px-3 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">{t(heading)}</p> : null}
                    <button
                      type="button"
                      id={`palette-${index}`}
                      role="option"
                      aria-selected={index === current}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(entry)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors ${index === current ? "bg-[#f0ecff]" : ""}`}
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${index === current ? "bg-link text-white" : "bg-surface-muted text-ink-soft"}`}><Icon aria-hidden className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{entry.label}</span>
                        {entry.hint ? <span className="block truncate text-xs text-ink-soft">{entry.hint}</span> : null}
                      </span>
                      {index === current ? <kbd className="shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-ink-soft">↵</kbd> : null}
                    </button>
                  </li>
                );
              })
            )}
            {entries.length > 0 && term.length >= 2 && records.loading ? <li className="px-3 py-2 text-xs text-ink-faint">{t("Searching…")}</li> : null}
          </ul>
          <div className="flex items-center gap-4 border-t border-line bg-surface-muted/40 px-4 py-2 text-xs text-ink-soft">
            <span><kbd className="rounded border border-line bg-surface px-1">↑</kbd> <kbd className="rounded border border-line bg-surface px-1">↓</kbd> {t("move")}</span>
            <span><kbd className="rounded border border-line bg-surface px-1">↵</kbd> {t("open")}</span>
            <span className="ms-auto"><kbd className="rounded border border-line bg-surface px-1">Ctrl</kbd> <kbd className="rounded border border-line bg-surface px-1">K</kbd> {t("anywhere")}</span>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
