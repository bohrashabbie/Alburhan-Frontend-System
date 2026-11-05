"use client";

import {
  Boxes,
  ChevronLeft,
  Contact,
  FolderKanban,
  House,
  Landmark,
  Languages,
  Lightbulb,
  LogOut,
  type LucideIcon,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Brand } from "@/components/brand";
import { Loading, Menu, MenuDivider, MenuHeading, MenuItem, MenuLink } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { CommandPalette } from "@/components/command-palette";
import { Flag } from "@/components/country";
import { session } from "@/lib/api";
import { fullName } from "@/lib/format";
import { useFreshStart, useMe } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import { type Area, areaGroups, isActiveLink } from "@/lib/sections";
import { useWorkspace, WorkspaceProvider } from "@/lib/workspace";

export type NavItem = {
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
export const NAV: NavItem[] = [
  { href: "/overview", label: "Home", icon: House },
  { href: "/sales", label: "Sales", icon: Tag, section: "sales" },
  { href: "/pos", label: "POS", icon: ShoppingCart, section: "pos" },
  { href: "/projects", label: "Projects", icon: FolderKanban, section: "projects" },
  { href: "/catalog", label: "Catalog", icon: Lightbulb, section: "catalog" },
  { href: "/partners", label: "Customers & suppliers", icon: Contact, section: "partners" },
  { href: "/inventory", label: "Inventory", icon: Boxes, section: "inventory" },
  { href: "/purchasing", label: "Purchasing", icon: Truck, section: "purchasing" },
  { href: "/installation", label: "Installation", icon: Wrench, section: "installation" },
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

  const className = `group/rail relative flex size-12 shrink-0 items-center justify-center rounded-xl text-white transition-[background-color,transform] duration-200 hover:bg-link active:scale-95 active:bg-link ${
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
        <Icon aria-hidden className="size-6 transition-transform duration-200 group-hover/rail:scale-110" strokeWidth={1.5} />
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
      <Icon aria-hidden className="size-6 transition-transform duration-200 group-hover/rail:scale-110" strokeWidth={1.5} />
      {bubble}
    </Link>
  );
}

/** The pages of one area, sliding out beside the rail. */
function Flyout({
  item,
  pathname,
  onClose,
  closing = false,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
  closing?: boolean;
}) {
  const { canSee, t } = useWorkspace();
  const box = useRef<HTMLDivElement>(null);
  // Each group knows where its links start, so they can fade in one after another.
  const raw = areaGroups(item.section as Area, canSee);
  const groups = raw.map((group, index) => ({
    ...group,
    order: raw.slice(0, index).reduce((count, previous) => count + previous.links.length + 1, 0),
  }));

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
    <div ref={box} data-closing={closing ? "" : undefined} className="rail-flyout fixed top-16 bottom-0 start-[4.5rem] z-[45] w-56">
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
            <p className="link-in px-6 pt-4 pb-2 text-[17px] font-semibold" style={{ animationDelay: `${60 + group.order * 24}ms` }}>{t(group.title)}</p>
            {group.links.map((link) => {
              const current = isActiveLink(link, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  aria-current={current ? "page" : undefined}
                  onClick={onClose}
                  style={{ animationDelay: `${60 + (group.order + group.links.indexOf(link) + 1) * 24}ms` }}
                  className={`link-in mx-3 block rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
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

export function AccountMenu() {
  const { me, company, branch, companies, branches, companyWide, canSee, setCompany, setBranch, locale, setLocale, t, name } =
    useWorkspace();
  const freshStart = useFreshStart();
  const display = fullName(me);
  const roles = me.is_superuser
    ? [t("Administrator")]
    : [...new Set(me.access.filter((grant) => grant.company === company.id).map((grant) => grant.role_name))];
  const openSearch = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));

  const signOut = async () => {
    await session.logout().catch(() => null);
    await freshStart("/login");
  };

  const go: [string, string, LucideIcon, boolean][] = [
    ["/profile", t("My profile"), UserRound, true],
    ["/overview", t("Home"), House, true],
    ["/till", t("Full-screen till"), ShoppingCart, canSee("pos.sale.create")],
    ["/settings/companies", t("Settings"), Settings, canSee("organization.company.view") || canSee("users.user.view")],
  ];

  return (
    <Menu
      label={
        <>
          <UserAvatar url={me.avatar_url} name={display} />
          <span className="sr-only">{display}</span>
        </>
      }
      align="end"
      variant="ghost"
      chevron={false}
      title={display}
      className="!rounded-full !p-0.5 transition-transform hover:scale-105"
      menuClassName="!w-[22rem] !rounded-2xl !p-2 !shadow-xl [&_[role=menuitem]]:!px-3 [&_[role=menuitem]]:!py-2.5 [&_[role=menuitem]]:!text-[15px]"
    >
      <Link href="/profile" className="flex items-center gap-3.5 rounded-xl p-3 transition-colors hover:bg-surface-muted">
        <UserAvatar url={me.avatar_url} name={display} size="size-14" text="text-lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg leading-6 font-bold">{display}</span>
          <span className="block truncate text-sm text-ink-soft">{me.email}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            {roles.slice(0, 3).map((role) => (
              <span key={role} className="rounded-full bg-[#f0ecff] px-2 py-0.5 text-[11px] font-medium text-link">
                {role}
              </span>
            ))}
          </span>
        </span>
      </Link>
      <p className="px-3 pb-1 text-xs text-ink-soft">
        {name(company)}
        {branch ? ` · ${name(branch)}` : ` · ${t("All branches")}`}
      </p>
      <MenuDivider />
      {go
        .filter(([, , , show]) => show)
        .map(([href, label, Icon]) => (
          <MenuLink key={href} href={href}>
            <Icon aria-hidden className="me-3 inline size-[18px] align-[-3px] text-ink-soft" strokeWidth={1.75} />
            {label}
          </MenuLink>
        ))}
      <MenuItem onClick={openSearch}>
        <Search aria-hidden className="me-3 inline size-[18px] align-[-3px] text-ink-soft" strokeWidth={1.75} />
        {t("Search or jump to…")}
        <kbd className="float-end rounded-md border border-line px-1.5 text-xs text-ink-soft">Ctrl K</kbd>
      </MenuItem>
      {companies.length > 1 ? (
        <>
          <MenuDivider />
          <MenuHeading>{t("Switch company")}</MenuHeading>
          {companies.map((item) => (
            <MenuItem key={item.id} aria-checked={item.id === company.id} onClick={() => setCompany(item.id)}>
              <Flag code={item.country} className="me-2.5 inline h-3 rounded-[2px] align-[-1px]" />
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
            <MenuItem key={item.id} aria-checked={item.id === branch?.id} onClick={() => setBranch(item.id)}>
              {name(item)}
            </MenuItem>
          ))}
        </>
      ) : null}
      <MenuDivider />
      <div className="flex items-center justify-between gap-3 px-3 py-1.5">
        <span className="flex items-center text-[15px]">
          <Languages aria-hidden className="me-3 size-[18px] text-ink-soft" strokeWidth={1.75} />
          {t("Language")}
        </span>
        <span className="inline-flex rounded-full border border-line-strong p-0.5">
          {(["en", "ar"] as Locale[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${locale === option ? "bg-accent text-white" : "text-ink-soft hover:text-ink"}`}
            >
              {option === "en" ? "EN" : "عربي"}
            </button>
          ))}
        </span>
      </div>
      <MenuDivider />
      <MenuItem onClick={signOut}>
        <LogOut aria-hidden className="me-3 inline size-[18px] align-[-3px] text-danger" strokeWidth={1.75} />
        <span className="text-danger">{t("Log out")}</span>
      </MenuItem>
    </Menu>
  );
}

/** The company and branch every screen works in; switch here without opening the account menu. */
export function WorkspaceChip() {
  const { company, branch, companies, branches, companyWide, setCompany, setBranch, name, t } = useWorkspace();
  const switchable = companies.length > 1 || branches.length > 1 || companyWide;
  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <Flag code={company.country} className="h-3.5 shrink-0 rounded-[2px]" />
      <span className="truncate font-medium">{name(company)}</span>
      <span className="hidden shrink-0 text-ink-soft lg:inline">· {branch ? name(branch) : t("All branches")}</span>
    </span>
  );
  if (!switchable) return <span className="hidden h-9 items-center rounded-full border border-line px-3 text-sm sm:flex">{label}</span>;
  return (
    <Menu label={label} align="end" variant="secondary" title={t("Switch company")} className="!h-9 !max-w-[30rem] !rounded-full !px-3" wrapperClassName="hidden sm:inline-block" menuClassName="!w-72">
      {companies.length > 1 ? (
        <>
          <MenuHeading>{t("Company")}</MenuHeading>
          {companies.map((item) => (
            <MenuItem key={item.id} aria-checked={item.id === company.id} onClick={() => setCompany(item.id)}>
              <Flag code={item.country} className="me-2 inline h-3 rounded-[2px] align-[-1px]" />
              {name(item)}
            </MenuItem>
          ))}
        </>
      ) : null}
      {branches.length > 1 || companyWide ? (
        <>
          {companies.length > 1 ? <MenuDivider /> : null}
          <MenuHeading>{t("Branch")}</MenuHeading>
          {companyWide ? <MenuItem aria-checked={branch === null} onClick={() => setBranch(null)}>{t("All branches")}</MenuItem> : null}
          {branches.map((item) => (
            <MenuItem key={item.id} aria-checked={item.id === branch?.id} onClick={() => setBranch(item.id)}>{name(item)}</MenuItem>
          ))}
        </>
      ) : null}
    </Menu>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canSee, t } = useWorkspace();
  const [palette, setPalette] = useState(false);

  // Ctrl/⌘+K anywhere, or "/" when not typing, opens the search.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
      if ((event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setPalette(true);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  // Remembers the page it opened on, so going anywhere else closes it.
  const [flyoutState, setFlyoutState] = useState<{ href: string; at: string } | null>(null);
  const flyout = flyoutState?.at === pathname ? flyoutState.href : null;
  const setFlyout = (href: string | null) =>
    setFlyoutState(href ? { href, at: pathname } : null);
  // The flyout plays its exit before it unmounts.
  const [leaving, setLeaving] = useState<string | null>(null);
  const closeFlyout = useCallback(() => {
    setFlyoutState((current) => {
      if (current) {
        setLeaving(current.href);
        window.setTimeout(() => setLeaving((href) => (href === current.href ? null : href)), 180);
      }
      return null;
    });
  }, []);

  const links = NAV.filter(
    (item) =>
      (!item.permission || canSee(item.permission)) &&
      (!item.section || areaGroups(item.section, canSee).length > 0),
  );
  const openItem = links.find((item) => item.href === flyout && item.section) ?? null;
  const leavingItem = !openItem && leaving ? (links.find((item) => item.href === leaving && item.section) ?? null) : null;
  const shownItem = openItem ?? leavingItem;
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
      {shownItem ? (
        <>
          <div aria-hidden data-closing={leavingItem ? "" : undefined} className="rail-scrim fixed inset-0 top-16 start-[4.5rem] z-[44] bg-black/10" />
          <Flyout key={shownItem.href} item={shownItem} pathname={pathname} onClose={closeFlyout} closing={Boolean(leavingItem)} />
        </>
      ) : null}

      <header className="sticky top-0 z-40 -ms-[4.5rem] flex h-16 items-center justify-between gap-3 border-b border-line bg-surface ps-5 pe-4 sm:pe-6">
        <Link href="/overview" aria-label="Al-Burhan home" className="shrink-0 text-ink">
          <Brand large />
        </Link>
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="mx-auto flex h-10 w-full max-w-md min-w-0 items-center gap-2.5 rounded-full border border-line-strong bg-surface-muted/50 px-4 text-sm text-ink-faint transition-colors hover:border-ink-faint hover:bg-surface"
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{t("Search or jump to…")}</span>
          <kbd className="ms-auto hidden shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-ink-soft sm:block">Ctrl K</kbd>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <WorkspaceChip />
          <AccountMenu />
        </div>
      </header>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <main key={inSection ? "area" : pathname} className={inSection ? "px-4 py-5 sm:px-6" : "page-in mx-auto max-w-[100rem] px-4 py-5 sm:px-6"}>
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
