"use client";

import {
  Boxes,
  ChevronLeft,
  Contact,
  House,
  Landmark,
  Lightbulb,
  type LucideIcon,
  Settings,
  ShoppingCart,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Brand } from "@/components/brand";
import { Loading, Menu, MenuDivider, MenuHeading, MenuItem } from "@/components/ui";
import { session } from "@/lib/api";
import { fullName, initials } from "@/lib/format";
import { useFreshStart, useMe } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import { type Area, areaGroups, isActiveLink } from "@/lib/sections";
import { useWorkspace, WorkspaceProvider } from "@/lib/workspace";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Opens a flyout of this area's pages instead of going straight to one. */
  section?: Area;
  /** Shown when the user holds this anywhere in the current company. */
  permission?: string;
};

// Areas appear here as they are built: Sales, POS, Projects, Inventory, Purchasing,
// Installation, Accounts, Reports (see the alburhan-ui skill for their icons).
const NAV: NavItem[] = [
  { href: "/overview", label: "Home", icon: House },
  { href: "/sales", label: "Sales", icon: Tag, section: "sales" },
  { href: "/pos", label: "POS", icon: ShoppingCart, section: "pos" },
  { href: "/catalog", label: "Catalog", icon: Lightbulb, section: "catalog" },
  { href: "/partners", label: "Customers & suppliers", icon: Contact, section: "partners" },
  { href: "/inventory", label: "Inventory", icon: Boxes, section: "inventory" },
  { href: "/accounts", label: "Accounts", icon: Landmark, section: "accounts" },
  { href: "/settings", label: "Settings", icon: Settings, section: "settings" },
];

function isActive(item: NavItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function RailLink({
  item,
  active,
  open = false,
  onToggle,
}: {
  item: NavItem;
  active: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useWorkspace();
  const Icon = item.icon;
  const label = t(item.label);
  // Fixed, because the rail scrolls and would otherwise clip the label.
  const [tip, setTip] = useState<number | null>(null);
  const show = (element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();
    setTip(bounds.top + bounds.height / 2);
  };

  const className = `relative flex size-12 shrink-0 items-center justify-center rounded-xl text-white transition-colors hover:bg-link active:bg-link ${
    active ? "bg-link" : ""
  } ${open ? "bg-link" : ""}`;
  const hover = {
    onMouseEnter: (event: { currentTarget: HTMLElement }) => show(event.currentTarget),
    onMouseLeave: () => setTip(null),
    onFocus: (event: { currentTarget: HTMLElement }) => show(event.currentTarget),
    onBlur: () => setTip(null),
  };
  const bubble =
    tip !== null && !open ? (
      <span
        aria-hidden
        style={{ top: tip }}
        className="pointer-events-none fixed start-[4.75rem] z-50 -translate-y-1/2 rounded-lg bg-black px-4 py-2.5 text-[15px] leading-5 font-medium whitespace-nowrap text-white shadow-lg"
      >
        <span className="absolute top-1/2 -start-1 size-3 -translate-y-1/2 rotate-45 bg-black" />
        {label}
      </span>
    ) : null;

  if (onToggle) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-current={active ? "page" : undefined}
        data-rail-toggle=""
        onClick={() => {
          setTip(null);
          onToggle();
        }}
        className={className}
        {...hover}
      >
        <Icon aria-hidden className="size-6" strokeWidth={1.5} />
        {bubble}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={className}
      {...hover}
    >
      <Icon aria-hidden className="size-6" strokeWidth={1.5} />
      {bubble}
    </Link>
  );
}

/** The pages of one area, sliding out beside the rail. */
function Flyout({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const { canSee, t } = useWorkspace();
  const box = useRef<HTMLDivElement>(null);
  const groups = areaGroups(item.section as Area, canSee);

  useEffect(() => {
    const outside = (event: Event) => {
      const target = event.target as Element;
      if (box.current?.contains(target) || target.closest?.("[data-rail-toggle]")) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div ref={box} className="rail-flyout fixed top-16 bottom-0 start-[4.5rem] z-[45] w-56">
      <button
        type="button"
        aria-label={t("Close menu")}
        title={t("Close menu")}
        onClick={onClose}
        className="absolute top-4 -end-[18px] z-10 inline-flex size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-colors hover:bg-surface-muted"
      >
        <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
      </button>
      <div
        role="menu"
        aria-label={t(item.label)}
        className="h-full overflow-y-auto border-e border-line bg-surface py-4 text-ink shadow-xl"
      >
        {groups.map((group, index) => (
          <div key={group.title}>
            {index > 0 ? <hr className="mx-5 my-3 border-line" /> : null}
            <p className="px-6 pt-4 pb-2 text-[17px] font-semibold">{t(group.title)}</p>
            {group.links.map((link) => {
              const current = isActiveLink(link, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  aria-current={current ? "page" : undefined}
                  onClick={onClose}
                  className={`mx-3 block rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                    current ? "bg-[#f0ecff] font-medium" : "hover:bg-surface-muted"
                  }`}
                >
                  {t(link.label)}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountMenu() {
  const { me, company, branch, companies, branches, companyWide, setCompany, setBranch, locale, setLocale, t, name } =
    useWorkspace();
  const freshStart = useFreshStart();
  const display = fullName(me);

  const signOut = async () => {
    await session.logout().catch(() => null);
    await freshStart("/login");
  };

  return (
    <Menu
      label={
        <>
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full border-2 border-[#a8dcf5] bg-[#e6f6fd] text-sm font-semibold text-[#0b7cab]"
          >
            {initials(display)}
          </span>
          <span className="sr-only">{display}</span>
        </>
      }
      align="end"
      variant="ghost"
      chevron={false}
      title={display}
      className="!rounded-full !p-0.5"
      menuClassName="!w-[22rem] !rounded-2xl !p-4 !shadow-xl [&_[role=menuitem]]:!px-3 [&_[role=menuitem]]:!py-2.5 [&_[role=menuitem]]:!text-[15px]"
    >
      <div className="flex items-center gap-4 px-3 pt-2 pb-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e6f6fd] text-lg font-semibold text-[#0b7cab]"
        >
          {initials(display)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-bold">{display}</span>
          <span className="block truncate text-sm text-ink-soft">
            {name(company)}
            {branch ? ` · ${name(branch)}` : ""}
          </span>
        </span>
      </div>
      {companies.length > 1 ? (
        <>
          <MenuDivider />
          <MenuHeading>{t("Switch company")}</MenuHeading>
          {companies.map((item) => (
            <MenuItem
              key={item.id}
              aria-checked={item.id === company.id}
              onClick={() => setCompany(item.id)}
            >
              <span className="me-2 font-mono text-xs text-ink-soft">{item.code}</span>
              {name(item)}
            </MenuItem>
          ))}
        </>
      ) : null}
      {branches.length > 1 || companyWide ? (
        <>
          <MenuDivider />
          <MenuHeading>{t("Branch")}</MenuHeading>
          {companyWide ? (
            <MenuItem aria-checked={branch === null} onClick={() => setBranch(null)}>
              {t("All branches")}
            </MenuItem>
          ) : null}
          {branches.map((item) => (
            <MenuItem
              key={item.id}
              aria-checked={item.id === branch?.id}
              onClick={() => setBranch(item.id)}
            >
              {name(item)}
            </MenuItem>
          ))}
        </>
      ) : null}
      <MenuDivider />
      <MenuHeading>{t("Language")}</MenuHeading>
      {(["en", "ar"] as Locale[]).map((option) => (
        <MenuItem
          key={option}
          aria-checked={locale === option}
          onClick={() => setLocale(option)}
        >
          {option === "en" ? "English" : "العربية"}
        </MenuItem>
      ))}
      <MenuDivider />
      <MenuItem onClick={signOut}>{t("Log out")}</MenuItem>
    </Menu>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canSee } = useWorkspace();
  // Remembers the page it opened on, so going anywhere else closes it.
  const [flyoutState, setFlyoutState] = useState<{ href: string; at: string } | null>(null);
  const flyout = flyoutState?.at === pathname ? flyoutState.href : null;
  const setFlyout = (href: string | null) =>
    setFlyoutState(href ? { href, at: pathname } : null);
  const closeFlyout = useCallback(() => setFlyoutState(null), []);

  const links = NAV.filter(
    (item) =>
      (!item.permission || canSee(item.permission)) &&
      (!item.section || areaGroups(item.section, canSee).length > 0),
  );
  const openItem = links.find((item) => item.href === flyout && item.section) ?? null;
  // Areas with their own side menu take the full width.
  const inSection = links.some((item) => item.section && isActive(item, pathname));

  return (
    <div className="min-h-dvh ps-[4.5rem]">
      <aside className="fixed top-16 bottom-0 start-0 z-40 flex w-[4.5rem] flex-col items-center bg-panel pt-3 pb-4 text-panel-ink">
        <nav aria-label="Main" className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {links.map((item) => (
            <RailLink
              key={item.href}
              item={item}
              active={isActive(item, pathname)}
              open={flyout === item.href}
              onToggle={
                item.section ? () => setFlyout(flyout === item.href ? null : item.href) : undefined
              }
            />
          ))}
        </nav>
      </aside>
      {openItem ? <Flyout key={openItem.href} item={openItem} pathname={pathname} onClose={closeFlyout} /> : null}

      <header className="sticky top-0 z-40 -ms-[4.5rem] flex h-16 items-center justify-between gap-3 border-b border-line bg-surface ps-5 pe-4 sm:pe-6">
        <Link href="/overview" aria-label="Al-Burhan home" className="text-ink">
          <Brand large />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <AccountMenu />
        </div>
      </header>

      <main className={inSection ? "px-4 py-5 sm:px-6" : "mx-auto max-w-[100rem] px-4 py-5 sm:px-6"}>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const { data: me, error, isLoading } = useMe();

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);

  if (isLoading || !me) {
    if (error && error.status !== 401) {
      return <Loading label="Can't load your account. Refresh to try again." />;
    }
    return <Loading />;
  }

  if (me.companies.length === 0) {
    return (
      <Loading label="Your account has no company access yet. Ask an administrator to assign you a role." />
    );
  }

  return (
    <WorkspaceProvider me={me} locale={locale}>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
