"use client";

import {
  Boxes,
  CalendarDays,
  Contact,
  FolderKanban,
  House,
  Landmark,
  Languages,
  Lightbulb,
  LogOut,
  PanelLeft,
  type LucideIcon,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { Brand } from "@/components/brand";
import { Loading, Menu, MenuDivider, MenuHeading, MenuItem, MenuLink } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { CommandPalette } from "@/components/command-palette";
import { Flag } from "@/components/country";
import { session } from "@/lib/api";
import { fullName } from "@/lib/format";
import { useFreshStart, useMe } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import { Reminders } from "@/components/reminders";
import { Sidebar } from "@/components/sidebar";
import type { Area } from "@/lib/sections";
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

// The areas of the app by address; the menu people see is in lib/menu.ts.
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
  { href: "/hr", label: "HR", icon: UsersRound, section: "hr" },
  { href: "/accounts", label: "Accounts", icon: Landmark, section: "accounts" },
  { href: "/settings", label: "Settings", icon: Settings, section: "settings" },
];

// Pages under these have their own layout, which keeps them mounted from one to the next.
const AREA_PATHS = NAV.filter((item) => item.section).map((item) => item.href);

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
    ["/my-leave", t("My leave"), CalendarDays, true],
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
  const { t } = useWorkspace();
  const [palette, setPalette] = useState(false);
  // null = the screen decides: shown on wide screens, tucked away on small ones.
  const [menu, setMenu] = useState<boolean | null>(null);

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

  const wide = () => window.matchMedia("(min-width: 1024px)").matches;
  const toggleMenu = () => setMenu((state) => !(state ?? wide()));
  // On a small screen the menu covers the page, so picking a page puts it away again.
  const afterPick = useCallback(() => {
    if (!wide()) setMenu(null);
  }, []);
  // Areas keep their pages mounted while moving between them; other pages fade in.
  const inSection = AREA_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const shown = menu === null ? "max-lg:-translate-x-full rtl:max-lg:translate-x-full" : menu ? "" : "-translate-x-full rtl:translate-x-full";

  return (
    <div className={`min-h-dvh transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${menu === false ? "" : "lg:ps-60"}`}>
      <aside
        inert={menu === false ? true : undefined}
        className={`fixed top-16 bottom-0 start-0 z-40 w-60 bg-panel text-panel-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${shown}`}
      >
        <Sidebar pathname={pathname} onNavigate={afterPick} />
      </aside>
      {menu ? <button type="button" aria-label={t("Close menu")} onClick={() => setMenu(null)} className="fixed inset-0 top-16 z-[39] bg-black/30 lg:hidden" /> : null}

      <header className={`sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface ps-3 pe-4 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:pe-6 ${menu === false ? "" : "lg:-ms-60"}`}>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={t("Menu")}
            title={t("Menu")}
            aria-expanded={menu ?? undefined}
            onClick={toggleMenu}
            className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted"
          >
            <PanelLeft aria-hidden className="size-5 rtl:-scale-x-100" strokeWidth={1.75} />
          </button>
          <Link href="/overview" aria-label="Al-Burhan home" className="shrink-0 text-ink">
            <Brand large />
          </Link>
        </div>
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
          <Reminders />
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
