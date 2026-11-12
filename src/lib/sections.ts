/**
 * The pages of each area, used by both the rail flyout and the area's side menu.
 * A link shows only when the user holds its permission somewhere in the current company.
 */
export type SectionLink = { href: string; label: string; permission?: string; exact?: boolean };
export type SectionGroup = { title: string; links: SectionLink[] };
export type Area = "accounts" | "catalog" | "hr" | "installation" | "inventory" | "partners" | "pos" | "projects" | "purchasing" | "sales" | "settings";

const AREAS: Record<Area, SectionGroup[]> = {
  pos: [
    {
      title: "Till",
      links: [{ href: "/pos/till", label: "Sell", permission: "pos.sale.create" }],
    },
    {
      title: "Records",
      links: [
        { href: "/pos/sales", label: "Sales", permission: "pos.sale.view" },
        { href: "/pos/shifts", label: "Shifts", permission: "pos.shift.view" },
      ],
    },
    {
      title: "Setup",
      links: [{ href: "/pos/registers", label: "Registers", permission: "pos.register.view" }],
    },
  ],
  sales: [
    {
      title: "Selling",
      links: [
        { href: "/sales/quotations", label: "Quotations", permission: "sales.quotation.view" },
        { href: "/sales/invoices", label: "Invoices", permission: "sales.invoice.view" },
        { href: "/sales/deliveries", label: "Delivery notes", permission: "sales.delivery.view" },
      ],
    },
    {
      title: "Money",
      links: [
        { href: "/sales/receipts", label: "Receipts", permission: "sales.receipt.view" },
        { href: "/sales/credit-notes", label: "Credit notes", permission: "sales.credit_note.view" },
      ],
    },
    {
      title: "Setup",
      links: [{ href: "/sales/settings", label: "Sales settings", permission: "sales.settings.view" }],
    },
  ],
  projects: [
    {
      title: "Projects",
      links: [
        { href: "/projects/list", label: "Projects", permission: "projects.project.view" },
        { href: "/projects/issues", label: "Materials to site", permission: "projects.issue.view" },
      ],
    },
  ],
  installation: [
    {
      title: "Jobs",
      links: [
        { href: "/installation/schedule", label: "Schedule", permission: "installation.work_order.view" },
        { href: "/installation/work-orders", label: "Work orders", permission: "installation.work_order.view" },
      ],
    },
    {
      title: "Setup",
      links: [{ href: "/installation/technicians", label: "Technicians", permission: "installation.technician.view" }],
    },
  ],
  hr: [
    {
      title: "People",
      links: [
        { href: "/hr/employees", label: "Employees", permission: "hr.employee.view" },
        { href: "/hr/departments", label: "Departments", permission: "hr.department.view" },
      ],
    },
    {
      title: "Leave",
      links: [{ href: "/hr/leave", label: "Leave requests", permission: "hr.leave.view" }],
    },
    {
      title: "Pay",
      links: [
        { href: "/hr/salaries", label: "Salaries", permission: "hr.salary.view" },
        { href: "/hr/payroll", label: "Payroll", permission: "hr.payroll.view" },
      ],
    },
    {
      title: "Setup",
      links: [
        { href: "/hr/leave-types", label: "Leave types", permission: "hr.leave_type.view" },
        { href: "/hr/settings", label: "HR settings", permission: "hr.settings.view" },
      ],
    },
  ],
  purchasing: [
    {
      title: "Buying",
      links: [
        { href: "/purchasing/orders", label: "Purchase orders", permission: "purchasing.order.view" },
        { href: "/purchasing/receipts", label: "Goods receipts", permission: "purchasing.receipt.view" },
      ],
    },
    {
      title: "Money",
      links: [
        { href: "/purchasing/bills", label: "Supplier bills", permission: "purchasing.invoice.view" },
        { href: "/purchasing/payments", label: "Supplier payments", permission: "purchasing.payment.view" },
      ],
    },
  ],
  inventory: [
    {
      title: "Stock",
      links: [
        { href: "/inventory/stock", label: "Stock levels", permission: "inventory.stock.view" },
        { href: "/inventory/moves", label: "Movements", permission: "inventory.stock.view" },
      ],
    },
    {
      title: "Documents",
      links: [
        { href: "/inventory/transfers", label: "Transfers", permission: "inventory.transfer.view" },
        { href: "/inventory/adjustments", label: "Adjustments", permission: "inventory.adjustment.view" },
        { href: "/inventory/counts", label: "Stock counts", permission: "inventory.count.view" },
        { href: "/inventory/reservations", label: "Reservations", permission: "inventory.reservation.view" },
      ],
    },
    {
      title: "Planning",
      links: [
        { href: "/inventory/reorder", label: "Reorder alerts", permission: "inventory.report.view" },
        { href: "/inventory/slow-moving", label: "Slow-moving stock", permission: "inventory.report.view" },
        { href: "/inventory/reorder-rules", label: "Reorder rules", permission: "inventory.reorder_rule.view" },
      ],
    },
  ],
  accounts: [
    {
      title: "Bookkeeping",
      links: [{ href: "/accounts/entries", label: "Journal entries", permission: "accounting.entry.view" }],
    },
    {
      title: "Reports",
      links: [
        { href: "/accounts/profit-and-loss", label: "Profit & loss", permission: "accounting.report.view" },
        { href: "/accounts/balance-sheet", label: "Balance sheet", permission: "accounting.report.view" },
        { href: "/accounts/ageing", label: "Ageing", permission: "accounting.report.view" },
        { href: "/accounts/trial-balance", label: "Trial balance", permission: "accounting.report.view" },
        { href: "/accounts/ledger", label: "General ledger", permission: "accounting.report.view" },
      ],
    },
    {
      title: "Compliance",
      links: [
        { href: "/accounts/vat-return", label: "VAT return", permission: "reports.compliance.view" },
        { href: "/accounts/filings", label: "Filings & e-invoicing", permission: "reports.compliance.view" },
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
