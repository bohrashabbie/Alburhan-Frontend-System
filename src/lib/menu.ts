/**
 * The main menu, in the order and with the names staff know from the system they used before
 * (Dashboard, Product, Purchase, POS, Invoice, …), so everything is where they expect it.
 * A link shows only when the user may see it; a group shows when it has at least one link.
 */
import {
  ArrowLeftRight,
  Banknote,
  CalendarClock,
  BarChart3,
  FileText,
  FolderKanban,
  Gauge,
  type LucideIcon,
  Landmark,
  Lightbulb,
  ReceiptText,
  Settings,
  ShoppingCart,
  Undo2,
  UserRound,
  UsersRound,
  Wallet,
  Truck,
} from "lucide-react";

import type { SectionLink } from "@/lib/sections";

export type MenuGroup = { key: string; label: string; icon: LucideIcon; href?: string; permission?: string; links: SectionLink[] };

export const MENU: MenuGroup[] = [
  { key: "dashboard", label: "Dashboard", icon: Gauge, href: "/overview", links: [] },
  {
    key: "product",
    label: "Product",
    icon: Lightbulb,
    links: [
      { href: "/catalog/categories", label: "Category", permission: "catalog.category.view" },
      { href: "/catalog/products", label: "Product list", permission: "catalog.product.view" },
      { href: "/catalog/price-lists", label: "Price lists", permission: "catalog.price_list.view" },
      { href: "/inventory/stock", label: "Stock levels", permission: "inventory.stock.view" },
      { href: "/inventory/moves", label: "Stock movements", permission: "inventory.stock.view" },
      { href: "/inventory/adjustments", label: "Adjustment list", permission: "inventory.adjustment.view" },
      { href: "/inventory/counts", label: "Stock count", permission: "inventory.count.view" },
      { href: "/inventory/reservations", label: "Reservations", permission: "inventory.reservation.view" },
      { href: "/inventory/reorder-rules", label: "Reorder rules", permission: "inventory.reorder_rule.view" },
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    icon: Truck,
    links: [
      { href: "/purchasing/orders", label: "Purchase list", permission: "purchasing.order.view" },
      { href: "/purchasing/receipts", label: "Goods receipts", permission: "purchasing.receipt.view" },
      { href: "/purchasing/bills", label: "Supplier bills", permission: "purchasing.invoice.view" },
      { href: "/purchasing/payments", label: "Supplier payments", permission: "purchasing.payment.view" },
    ],
  },
  {
    key: "pos",
    label: "POS",
    icon: ShoppingCart,
    links: [
      { href: "/pos/till", label: "Sell", permission: "pos.sale.create" },
      { href: "/pos/sales", label: "POS sales", permission: "pos.sale.view" },
      { href: "/pos/shifts", label: "Cash register", permission: "pos.shift.view" },
      { href: "/pos/registers", label: "Registers", permission: "pos.register.view" },
    ],
  },
  {
    key: "invoice",
    label: "Invoice",
    icon: ReceiptText,
    links: [
      { href: "/sales/invoices", label: "Invoice list", permission: "sales.invoice.view" },
      { href: "/sales/deliveries", label: "Delivery notes", permission: "sales.delivery.view" },
      { href: "/sales/receipts", label: "Payments received", permission: "sales.receipt.view" },
    ],
  },
  { key: "delivery-schedule", label: "Delivery schedule", icon: CalendarClock, href: "/sales/delivery-schedule", permission: "sales.delivery.view", links: [] },
  {
    key: "projects",
    label: "Projects",
    icon: FolderKanban,
    links: [
      { href: "/projects/list", label: "Projects", permission: "projects.project.view" },
      { href: "/projects/issues", label: "Materials to site", permission: "projects.issue.view" },
      { href: "/installation/schedule", label: "Installation schedule", permission: "installation.work_order.view" },
      { href: "/installation/work-orders", label: "Work orders", permission: "installation.work_order.view" },
      { href: "/installation/technicians", label: "Technicians", permission: "installation.technician.view" },
    ],
  },
  {
    key: "expense",
    label: "Expense",
    icon: Wallet,
    links: [
      { href: "/accounts/expenses", label: "Expense list", permission: "accounting.expense.view" },
      { href: "/accounts/expense-categories", label: "Expense category", permission: "accounting.expense_category.view" },
    ],
  },
  {
    key: "quotation",
    label: "Quotation",
    icon: FileText,
    links: [{ href: "/sales/quotations", label: "Quotation list", permission: "sales.quotation.view" }],
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: ArrowLeftRight,
    links: [{ href: "/inventory/transfers", label: "Transfer list", permission: "inventory.transfer.view" }],
  },
  {
    key: "return",
    label: "Return",
    icon: Undo2,
    links: [{ href: "/sales/credit-notes", label: "Sale return", permission: "sales.credit_note.view" }],
  },
  {
    key: "accounting",
    label: "Accounting",
    icon: Landmark,
    links: [
      { href: "/accounts/entries", label: "Journal entries", permission: "accounting.entry.view" },
      { href: "/accounts/chart", label: "Chart of accounts", permission: "accounting.account.view" },
      { href: "/accounts/balance-sheet", label: "Balance sheet", permission: "accounting.report.view" },
      { href: "/accounts/profit-and-loss", label: "Profit & loss", permission: "accounting.report.view" },
      { href: "/accounts/trial-balance", label: "Trial balance", permission: "accounting.report.view" },
      { href: "/accounts/ledger", label: "General ledger", permission: "accounting.report.view" },
      { href: "/accounts/vat-return", label: "VAT return", permission: "reports.compliance.view" },
      { href: "/accounts/filings", label: "Filings & e-invoicing", permission: "reports.compliance.view" },
      { href: "/accounts/journals", label: "Journals", permission: "accounting.journal.view" },
      { href: "/accounts/periods", label: "Periods", permission: "accounting.period.view" },
      { href: "/accounts/settings", label: "Default accounts", permission: "accounting.settings.view" },
    ],
  },
  {
    key: "salary",
    label: "Salary",
    icon: Banknote,
    links: [
      { href: "/hr/employees", label: "Employee", permission: "hr.employee.view" },
      { href: "/hr/salaries", label: "Salaries", permission: "hr.salary.view" },
      { href: "/hr/payroll", label: "Monthly salary", permission: "hr.payroll.view" },
      { href: "/hr/leave", label: "Leave requests", permission: "hr.leave.view" },
      { href: "/hr/departments", label: "Departments", permission: "hr.department.view" },
      { href: "/hr/leave-types", label: "Leave types", permission: "hr.leave_type.view" },
      { href: "/hr/settings", label: "HR settings", permission: "hr.settings.view" },
    ],
  },
  {
    key: "user",
    label: "User",
    icon: UsersRound,
    links: [
      { href: "/settings/users", label: "User list", permission: "users.user.view" },
      { href: "/partners/suppliers", label: "Supplier list", permission: "partners.supplier.view" },
    ],
  },
  {
    key: "customer",
    label: "Customer",
    icon: UserRound,
    links: [
      { href: "/partners/customers", label: "Customer list", permission: "partners.customer.view" },
      { href: "/accounts/ageing", label: "Customer balances", permission: "accounting.report.view" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    links: [
      { href: "/inventory/reorder", label: "Product quantity alert", permission: "inventory.report.view" },
      { href: "/inventory/slow-moving", label: "Slow-moving stock", permission: "inventory.report.view" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    links: [
      { href: "/settings/roles", label: "Role permission", permission: "access.role.view" },
      { href: "/settings/warehouses", label: "Warehouse", permission: "organization.warehouse.view" },
      { href: "/catalog/brands", label: "Brand", permission: "catalog.brand.view" },
      { href: "/catalog/units", label: "Unit", permission: "catalog.unit.view" },
      { href: "/settings/companies", label: "Companies", permission: "organization.company.view" },
      { href: "/settings/branches", label: "Branches", permission: "organization.branch.view" },
      { href: "/settings/exchange-rates", label: "Exchange rates" },
      { href: "/sales/settings", label: "Sales settings", permission: "sales.settings.view" },
    ],
  },
];

export function visibleMenu(canSee: (permission: string) => boolean) {
  return MENU.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.permission || canSee(link.permission)),
  })).filter((group) => (group.href ? !group.permission || canSee(group.permission) : group.links.length > 0));
}
