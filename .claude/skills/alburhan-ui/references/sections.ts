export type SectionLink = { href: string; label: string; exact?: boolean };
export type SectionGroup = { title: string; links: SectionLink[] };
export type Area = "sales" | "clients" | "catalog" | "online" | "marketing" | "team";

/**
 * The pages inside each area of the app. The sidebar flyout and the menu beside each page both
 * read from here, so they always list the same places.
 */
export function areaGroups(area: Area, can: (permission: string) => boolean): SectionGroup[] {
  const groups: Record<Area, SectionGroup[]> = {
    sales: [
      {
        title: "Sales",
        links: [
          { href: "/sales/daily", label: "Daily sales summary" },
          { href: "/sales/register", label: "Register" },
          { href: "/sales/appointments", label: "Appointments" },
          { href: "/sales", label: "Sales", exact: true },
          { href: "/sales/payments", label: "Payments" },
        ],
      },
      {
        title: "Sold items",
        links: [
          { href: "/sales/gift-cards", label: "Gift cards", exact: true },
          { href: "/sales/gift-cards-sold", label: "Gift cards sold" },
          { href: "/sales/packages", label: "Packages sold" },
          { href: "/sales/memberships", label: "Memberships sold" },
        ],
      },
    ],
    clients: [
      {
        title: "Clients",
        links: [
          { href: "/clients", label: "Clients list", exact: true },
          ...(can("clients.merge") ? [{ href: "/clients/duplicates", label: "Duplicates" }] : []),
          ...(can("marketing.manage") ? [{ href: "/clients/segments", label: "Segments" }] : []),
          ...(can("clients.view") ? [{ href: "/forms", label: "Forms" }] : []),
        ],
      },
      {
        title: "Engage",
        links: [
          ...(can("marketing.manage") ? [{ href: "/clients/loyalty", label: "Loyalty" }] : []),
          ...(can("settings.manage") ? [{ href: "/clients/reviews", label: "Reviews" }] : []),
        ],
      },
    ],
    catalog: [
      {
        title: "Catalog",
        links: [
          { href: "/catalog", label: "Services", exact: true },
          { href: "/catalog/bundles", label: "Packages" },
          { href: "/catalog/addons", label: "Add-on options" },
          { href: "/inventory", label: "Products", exact: true },
        ],
      },
      {
        title: "Inventory",
        links: can("inventory.manage")
          ? [
              { href: "/inventory/stocktakes", label: "Stocktakes" },
              { href: "/inventory/orders", label: "Stock orders" },
              { href: "/inventory/transfers", label: "Transfers" },
              { href: "/inventory/suppliers", label: "Suppliers" },
            ]
          : [],
      },
      {
        title: "Resources",
        links: [{ href: "/catalog/resources", label: "Rooms and equipment" }],
      },
    ],
    online: [
      {
        title: "Online bookings",
        links: [
          { href: "/online", label: "Booking links", exact: true },
          { href: "/online/marketplace", label: "Marketplace profile" },
          { href: "/online/channels", label: "Google and social" },
          { href: "/settings/online-booking", label: "Booking rules" },
        ],
      },
      { title: "Your website", links: [{ href: "/online/website", label: "Website" }] },
    ],
    marketing: [
      {
        title: "Promote",
        links: [
          { href: "/marketing", label: "Deals", exact: true },
          { href: "/marketing/campaigns", label: "Campaigns" },
          { href: "/marketing/memberships", label: "Memberships" },
        ],
      },
      {
        title: "Messages",
        links: [
          { href: "/marketing/automations", label: "Automations" },
          { href: "/marketing/messages", label: "Message log" },
        ],
      },
    ],
    team: [
      {
        title: "Team",
        links: [
          { href: "/team", label: "Team members", exact: true },
          { href: "/team/shifts", label: "Shifts" },
          { href: "/team/timesheets", label: "Timesheets" },
          ...(can("pay_runs.manage") ? [{ href: "/team/pay-runs", label: "Pay runs" }] : []),
        ],
      },
      {
        title: "Setup",
        links: [
          { href: "/team/roles", label: "Roles" },
          ...(can("pay_runs.manage")
            ? [{ href: "/team/commissions", label: "Commission and wages" }]
            : []),
        ],
      },
    ],
  };
  return groups[area].filter((group) => group.links.length > 0);
}

export function isActiveLink(link: SectionLink, pathname: string) {
  return link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}
