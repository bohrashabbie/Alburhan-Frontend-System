"use client";

import {
  BookOpen,
  Blocks,
  CalendarDays,
  ChartLine,
  ChevronLeft,
  Globe,
  House,
  type LucideIcon,
  Megaphone,
  Bell,
  Search,
  Settings,
  Smile,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Brand } from "@/components/brand";
import {
  ButtonLink,
  Loading,
  Menu,
  MenuDivider,
  MenuHeading,
  MenuItem,
  MenuLink,
} from "@/components/ui";
import { session } from "@/lib/api";
import { fullName } from "@/lib/constants";
import { useFreshStart, useMe, useResource } from "@/lib/hooks";
import { type Area, areaGroups, isActiveLink } from "@/lib/sections";
import type { Alert, Client } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  anyScope?: boolean;
  area?: string;
  also?: string;
  /** Opens a flyout of this area's pages instead of going straight to one. */
  section?: Area;
};

const NAV: NavItem[] = [
  { href: "/overview", label: "Home", icon: House },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    permission: "appointments.manage",
    anyScope: true,
  },
  {
    href: "/sales/daily",
    label: "Sales",
    icon: Tag,
    permission: "sales.checkout",
    area: "/sales",
    section: "sales",
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Smile,
    permission: "clients.view",
    anyScope: true,
    section: "clients",
  },
  { href: "/catalog", label: "Catalog", icon: BookOpen, also: "/inventory", section: "catalog" },
  {
    href: "/online",
    label: "Online",
    icon: Globe,
    permission: "settings.manage",
    section: "online",
  },
  {
    href: "/marketing",
    label: "Marketing",
    icon: Megaphone,
    permission: "marketing.manage",
    section: "marketing",
  },
  { href: "/team", label: "Team", icon: Users, permission: "team.manage", section: "team" },
  {
    href: "/reports",
    label: "Reports",
    icon: ChartLine,
    permission: "reports.view",
    anyScope: true,
  },
  { href: "/addons", label: "Add-ons", icon: Blocks, permission: "settings.manage" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
];

function isActive(item: NavItem, pathname: string) {
  return [item.area ?? item.href, item.also]
    .filter(Boolean)
    .some((root) => pathname === root || pathname.startsWith(`${root}/`));
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
  const Icon = item.icon;
  // Fixed, because the rail scrolls and would otherwise clip the label.
  const [tip, setTip] = useState<number | null>(null);
  const show = (element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();
    setTip(bounds.top + bounds.height / 2);
  };

  const className = `relative flex size-12 shrink-0 items-center justify-center rounded-xl text-white transition-colors hover:bg-link active:bg-link ${
    active ? "bg-link" : ""
  } ${open ? "ring-2 ring-white" : ""}`;
  const hover = {
    onMouseEnter: (event: { currentTarget: HTMLElement }) => show(event.currentTarget),
    onMouseLeave: () => setTip(null),
    onFocus: (event: { currentTarget: HTMLElement }) => show(event.currentTarget),
    onBlur: () => setTip(null),
  };
  const label =
    tip !== null && !open ? (
      <span
        aria-hidden
        style={{ top: tip }}
        className="pointer-events-none fixed left-[4.75rem] z-50 -translate-y-1/2 rounded-lg bg-black px-4 py-2.5 text-[15px] leading-5 font-medium whitespace-nowrap text-white shadow-lg"
      >
        <span className="absolute top-1/2 -left-1 size-3 -translate-y-1/2 rotate-45 bg-black" />
        {item.label}
      </span>
    ) : null;

  if (onToggle) {
    return (
      <button
        type="button"
        aria-label={item.label}
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
        {label}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={className}
      {...hover}
    >
      <Icon aria-hidden className="size-6" strokeWidth={1.5} />
      {tip !== null ? (
        <span
          aria-hidden
          style={{ top: tip }}
          className="pointer-events-none fixed left-[4.75rem] z-50 -translate-y-1/2 rounded-lg bg-black px-4 py-2.5 text-[15px] leading-5 font-medium whitespace-nowrap text-white shadow-lg"
        >
          <span className="absolute top-1/2 -left-1 size-3 -translate-y-1/2 rotate-45 bg-black" />
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

/** The pages of one area, sliding out beside the sidebar. */
function Flyout({
  item,
  can,
  pathname,
  onClose,
}: {
  item: NavItem;
  can: (permission: string) => boolean;
  pathname: string;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const groups = areaGroups(item.section as Area, can);

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
    <div ref={box} className="rail-flyout fixed top-16 bottom-0 left-[4.5rem] z-[45] w-56">
      <button
        type="button"
        aria-label={`Close ${item.label} menu`}
        title="Close menu"
        onClick={onClose}
        className="absolute top-4 -right-[18px] z-10 inline-flex size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-colors hover:bg-surface-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <div
        role="menu"
        aria-label={item.label}
        className="h-full overflow-y-auto border-r border-line bg-surface py-4 text-ink shadow-xl"
      >
      {groups.map((group, index) => (
        <div key={group.title}>
          {index > 0 ? <hr className="mx-5 my-3 border-line" /> : null}
          <p className="px-6 pt-4 pb-2 text-[17px] font-semibold">{group.title}</p>
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
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ClientSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const query = search.trim();
  const { data: results } = useResource<Client[]>(
    open && query.length >= 2 ? `/clients?q=${encodeURIComponent(query)}` : null,
  );

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Client search"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-ink transition-colors hover:bg-surface-muted"
      >
        <Search aria-hidden className="size-5" />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              aria-label="Find a client"
              placeholder="Find a client"
              value={search}
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border border-line-strong bg-canvas py-1.5 pr-3 pl-9 text-sm placeholder:text-ink-faint"
            />
          </div>
          {query.length >= 2 && results ? (
            <ul className="mt-1 max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-soft">No clients found.</li>
              ) : null}
              {results.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    onClick={close}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-muted"
                  >
                    {fullName(client)}
                    <span className="ml-2 text-ink-soft">{client.mobile || client.email}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ago(moment: string) {
  const minutes = Math.round((Date.now() - new Date(moment).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / (60 * 24))} d ago`;
}

function Notifications() {
  const { data: alerts } = useResource<Alert[]>("/notifications");
  const count = alerts?.length ?? 0;

  return (
    <Menu
      label={
        <span className="relative flex">
          <Bell aria-hidden className="size-5" />
          {count > 0 ? (
            <span
              aria-hidden
              className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white"
            >
              {count}
            </span>
          ) : null}
          <span className="sr-only">
            {count > 0 ? `Notifications, ${count} to look at` : "Notifications"}
          </span>
        </span>
      }
      align="right"
      variant="ghost"
      chevron={false}
      className="!px-2.5 !py-1.5"
    >
      <MenuHeading>Notifications</MenuHeading>
      {count === 0 ? (
        <p className="w-72 px-3 py-4 text-sm text-ink-soft">You&apos;re all caught up.</p>
      ) : (
        alerts?.map((alert) => (
          <MenuLink key={`${alert.kind}-${alert.detail}-${alert.created_at}`} href={alert.link}>
            <span className="block w-64">
              <span className="block text-sm font-medium">{alert.title}</span>
              <span className="block truncate text-xs text-ink-soft">
                {alert.detail} · {ago(alert.created_at)}
              </span>
            </span>
          </MenuLink>
        ))
      )}
    </Menu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, error, isLoading } = useMe();
  const freshStart = useFreshStart();
  // Remembers the page it opened on, so going anywhere else closes it.
  const [flyoutState, setFlyoutState] = useState<{ href: string; at: string } | null>(null);
  const flyout = flyoutState?.at === pathname ? flyoutState.href : null;
  const setFlyout = (href: string | null) =>
    setFlyoutState(href ? { href, at: pathname } : null);
  const closeFlyout = useCallback(() => setFlyoutState(null), []);

  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
    else if (me && !me.business_id) router.replace("/onboarding");
    else if (me?.mfa_setup_required) router.replace("/mfa-setup");
  }, [error, me, router]);

  if (isLoading || !me || !me.business_id || me.mfa_setup_required) {
    if (error && error.status !== 401) {
      return <Loading label="Can't load your account. Refresh to try again." />;
    }
    return <Loading />;
  }

  const links = NAV.filter((item) => {
    if (!item.permission) return true;
    const scope = me.permissions[item.permission];
    return item.anyScope ? Boolean(scope) : scope === "all";
  });

  const signOut = async () => {
    await session.logout();
    await freshStart("/login");
  };

  const switchBusiness = async (businessId: string) => {
    await session.switchBusiness(businessId);
    await freshStart("/overview");
  };

  const openItem = links.find((item) => item.href === flyout && item.section) ?? null;
  const canSeeClients = Boolean(me.permissions["clients.view"]);
  const canSell = me.permissions["sales.checkout"] === "all";
  const wide = pathname === "/calendar";
  // Areas with their own side menu take the full width and centre their pages beside it.
  const inSection = links.some((item) => item.section && isActive(item, pathname));

  return (
    <div className="min-h-dvh pl-[4.5rem]">
      <aside className="fixed top-16 bottom-0 left-0 z-40 flex w-[4.5rem] flex-col items-center bg-panel pt-3 pb-4 text-panel-ink">
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
      {openItem ? (
        <Flyout
          key={openItem.href}
          item={openItem}
          can={(permission) => me.permissions[permission] === "all"}
          pathname={pathname}
          onClose={closeFlyout}
        />
      ) : null}

      <header className="sticky top-0 z-40 -ml-[4.5rem] flex h-16 items-center justify-between gap-3 border-b border-line bg-surface pr-4 pl-5 sm:pr-6">
        <Link href="/overview" aria-label="BCT home" className="text-ink">
          <Brand large />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {canSell ? (
            <ButtonLink href="/sales/new" variant="secondary" className="hidden sm:inline-flex">
              New sale
            </ButtonLink>
          ) : null}
          {canSeeClients ? <ClientSearch /> : null}
          <Notifications />
          <Menu
            label={
              <>
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full border-2 border-[#a8dcf5] bg-[#e6f6fd] text-sm font-semibold text-[#0b7cab]"
                >
                  {initials(fullName(me))}
                </span>
                <span className="sr-only">{fullName(me)}</span>
              </>
            }
            align="right"
            variant="ghost"
            chevron={false}
            title={fullName(me)}
            className="!rounded-full !p-0.5"
            menuClassName="!w-[22rem] !rounded-2xl !p-4 !shadow-xl [&_[role=menuitem]]:!px-3 [&_[role=menuitem]]:!py-2.5 [&_[role=menuitem]]:!text-[15px]"
          >
            <div className="flex items-center gap-4 px-3 pt-2 pb-4">
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e6f6fd] text-lg font-semibold text-[#0b7cab]"
              >
                {initials(fullName(me))}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold">{fullName(me)}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {me.memberships.find((item) => item.business_id === me.business_id)
                    ?.business_name ?? me.email}
                </span>
              </span>
            </div>
            <MenuDivider />
            <MenuLink href="/overview">Home</MenuLink>
            <MenuLink href="/settings">Settings</MenuLink>
            {me.memberships.length > 1 ? (
              <>
                <MenuDivider />
                <MenuHeading>Switch business</MenuHeading>
                {me.memberships.map((membership) => (
                  <MenuItem
                    key={membership.business_id}
                    aria-checked={membership.business_id === me.business_id}
                    onClick={() => switchBusiness(membership.business_id)}
                  >
                    {membership.business_name}
                  </MenuItem>
                ))}
              </>
            ) : null}
            <MenuDivider />
            <MenuItem onClick={signOut}>Log out</MenuItem>
          </Menu>
        </div>
      </header>

      <main
        className={
          wide
            ? "px-4 py-4 sm:px-6"
            : inSection
              ? "px-4 py-5 sm:px-6"
              : "mx-auto max-w-[100rem] px-4 py-5 sm:px-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
