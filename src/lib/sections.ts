/**
 * The pages of each area, used by both the rail flyout and the area's side menu.
 * A link shows only when the user holds its permission somewhere in the current company.
 */
export type SectionLink = { href: string; label: string; permission?: string; exact?: boolean };
export type SectionGroup = { title: string; links: SectionLink[] };
export type Area = "accounts" | "catalog" | "partners" | "settings";

const AREAS: Record<Area, SectionGroup[]> = {
  accounts: [
    {
      title: "Bookkeeping",
      links: [{ href: "/accounts/entries", label: "Journal entries", permission: "accounting.entry.view" }],
    },
    {
      title: "Reports",
      links: [
        { href: "/accounts/trial-balance", label: "Trial balance", permission: "accounting.report.view" },
        { href: "/accounts/ledger", label: "General ledger", permission: "accounting.report.view" },
      ],
    },
    {
      title: "Setup",
      links: [
        { href: "/accounts/chart", label: "Chart of accounts", permission: "accounting.account.view" },
        { href: "/accounts/journals", label: "Journals", permission: "accounting.journal.view" },
        { href: "/accounts/periods", label: "Periods", permission: "accounting.period.view" },
        { href: "/accounts/settings", label: "Default accounts", permission: "accounting.settings.view" },
      ],
    },
  ],
  catalog: [
    {
      title: "Products",
      links: [
        { href: "/catalog/products", label: "Products", permission: "catalog.product.view" },
        { href: "/catalog/price-lists", label: "Price lists", permission: "catalog.price_list.view" },
      ],
    },
    {
      title: "Setup",
      links: [
        { href: "/catalog/categories", label: "Product families", permission: "catalog.category.view" },
        { href: "/catalog/brands", label: "Brands", permission: "catalog.brand.view" },
        { href: "/catalog/units", label: "Units", permission: "catalog.unit.view" },
      ],
    },
  ],
  partners: [
    {
      title: "Customers & suppliers",
      links: [
        { href: "/partners/customers", label: "Customers", permission: "partners.customer.view" },
        { href: "/partners/suppliers", label: "Suppliers", permission: "partners.supplier.view" },
      ],
    },
  ],
  settings: [
    {
      title: "Organization",
      links: [
        { href: "/settings/companies", label: "Companies", permission: "organization.company.view" },
        { href: "/settings/branches", label: "Branches", permission: "organization.branch.view" },
        {
          href: "/settings/warehouses",
          label: "Warehouses",
          permission: "organization.warehouse.view",
        },
        { href: "/settings/exchange-rates", label: "Exchange rates" },
      ],
    },
    {
      title: "Access",
      links: [
        { href: "/settings/users", label: "Users", permission: "users.user.view" },
        { href: "/settings/roles", label: "Roles", permission: "access.role.view" },
      ],
    },
  ],
};

export function areaGroups(area: Area, canSee: (permission: string) => boolean) {
  return AREAS[area]
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => !link.permission || canSee(link.permission)),
    }))
    .filter((group) => group.links.length > 0);
}

export function isActiveLink(link: SectionLink, pathname: string) {
  return link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}
