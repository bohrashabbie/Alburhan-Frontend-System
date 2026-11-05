/** Shapes returned by the Django API (/api/v1). Money and rates arrive as strings. */

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

type Audited = {
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
};

export type Named = { name: string; name_ar?: string };

export type Currency = Named & {
  code: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
};

export type Country = Named & { code: string; default_currency: string; is_active: boolean };

export type Company = Audited &
  Named & {
    id: number;
    code: string;
    legal_name: string;
    country: string;
    currency: string;
    timezone: string;
    tax_registration_number: string;
    commercial_registration_number: string;
    address: string;
    phone: string;
    email: string;
    logo_url: string | null;
    is_active: boolean;
  };

export type BranchType = "head_office" | "showroom" | "projects" | "warehouse" | "factory" | "office";

export type Branch = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    branch_type: BranchType;
    address: string;
    phone: string;
    email: string;
    is_active: boolean;
  };

export type WarehouseType = "main" | "showroom" | "transit" | "project_site";

export type Warehouse = Audited &
  Named & {
    id: number;
    company: number;
    branch: number | null;
    code: string;
    warehouse_type: WarehouseType;
    address: string;
    is_active: boolean;
  };

export type ExchangeRate = Audited & {
  id: number;
  currency: string;
  to_currency: string;
  rate: string;
  effective_date: string;
  source: string;
};

export type Permission = {
  id: number;
  code: string;
  module: string;
  name: string;
  description: string;
  is_active: boolean;
};

export type Role = Audited &
  Named & {
    id: number;
    code: string;
    description: string;
    is_system: boolean;
    is_active: boolean;
    permissions: string[];
  };

export type UserRole = Audited & {
  id: number;
  user: number;
  username: string;
  role: number;
  role_name: string;
  company: number;
  company_code: string;
  branch: number | null;
  branch_name: string | null;
  is_active: boolean;
};

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language: "en" | "ar";
  is_active: boolean;
  default_company: number | null;
  default_branch: number | null;
  last_login: string | null;
  date_joined: string;
};

export type AccessGrant = {
  company: number;
  branch: number | null;
  role: string;
  role_name: string;
  permissions: string[];
};

export type Me = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_language: "en" | "ar";
  is_superuser: boolean;
  default_company: number | null;
  default_branch: number | null;
  companies: (Named & { id: number; code: string; country: string; currency: string })[];
  branches: (Named & { id: number; company: number; code: string; branch_type: BranchType })[];
  access: AccessGrant[];
};

// --- Catalog ---------------------------------------------------------------------------

export type Brand = Audited &
  Named & { id: number; code: string; is_own_brand: boolean; country: string | null; is_active: boolean };

export type CategoryGroup = "indoor" | "outdoor" | "magnetic_linear" | "accessory" | "service";

export type ProductCategory = Audited &
  Named & {
    id: number;
    code: string;
    group: CategoryGroup;
    parent: number | null;
    image_url: string | null;
    is_active: boolean;
    product_count: number;
  };

export type Unit = Audited &
  Named & { id: number; code: string; allow_decimal: boolean; is_active: boolean };

export type Product = Audited &
  Named & {
    id: number;
    sku: string;
    model_code: string;
    barcode: string | null;
    description: string;
    product_type: "stock" | "non_stock" | "service";
    category: number;
    category_name: string;
    brand: number | null;
    brand_name: string | null;
    uom: number;
    uom_code: string;
    application: "indoor" | "outdoor" | "both";
    wattage: string | null;
    lumens: number | null;
    cct: string;
    cri: number | null;
    beam_angle: string;
    ip_rating: string;
    ik_rating: string;
    input_voltage: string;
    dimming: string;
    driver: string;
    led_source: string;
    finish: string;
    body_material: string;
    dimensions: string;
    cutout: string;
    lifetime_hours: number | null;
    warranty_months: number | null;
    weight_kg: string | null;
    image_url: string | null;
    income_account: number | null;
    expense_account: number | null;
    is_active: boolean;
    notes: string;
  };

export type PriceList = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    currency: string;
    is_default: boolean;
    valid_from: string | null;
    valid_to: string | null;
    is_active: boolean;
    item_count: number;
  };

export type PriceListItem = Audited & {
  id: number;
  price_list: number;
  product: number;
  sku: string;
  product_name: string;
  min_quantity: string;
  unit_price: string;
  currency: string;
};

// --- Customers & suppliers ---------------------------------------------------------------

export type Contact = {
  id?: number;
  name: string;
  job_title: string;
  phone: string;
  email: string;
  is_primary: boolean;
};

export type Customer = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    customer_type: "individual" | "business" | "contractor" | "government";
    phone: string;
    mobile: string;
    email: string;
    civil_id: string;
    commercial_registration: string;
    tax_number: string;
    address: string;
    area: string;
    credit_limit: string;
    payment_terms_days: number;
    price_list: number | null;
    price_list_name: string | null;
    salesperson: number | null;
    notes: string;
    is_active: boolean;
    contacts: Contact[];
  };

export type Supplier = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    country: string | null;
    currency: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    tax_number: string;
    payment_terms_days: number;
    lead_time_days: number;
    intercompany: number | null;
    notes: string;
    is_active: boolean;
    contacts: Contact[];
  };

// --- Accounting ------------------------------------------------------------------------------

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type Account = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    account_type: AccountType;
    parent: number | null;
    parent_code: string | null;
    is_group: boolean;
    currency: string | null;
    is_reconcilable: boolean;
    is_active: boolean;
  };

export type Journal = Audited &
  Named & {
    id: number;
    company: number;
    code: string;
    journal_type: "general" | "sales" | "purchase" | "cash" | "bank";
    default_account: number | null;
    is_active: boolean;
  };

export type Period = Audited & {
  id: number;
  company: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  closed_at: string | null;
};

export type EntryLine = {
  id?: number;
  account: number;
  account_code?: string;
  account_name?: string;
  description: string;
  debit: string;
  credit: string;
  debit_base?: string;
  credit_base?: string;
  customer: number | null;
  supplier: number | null;
  branch: number | null;
};

export type JournalEntry = Audited & {
  id: number;
  company: number;
  journal: number;
  journal_code: string;
  number: string;
  date: string;
  reference: string;
  description: string;
  currency: string;
  exchange_rate: string;
  status: "draft" | "posted" | "cancelled";
  posted_at: string | null;
  reversal_of: number | null;
  reversed_by: number | null;
  source_type: string;
  total_debit: string;
  total_credit: string;
  lines: EntryLine[];
};

export type TrialBalanceRow = {
  account: number;
  code: string;
  name: string;
  name_ar: string;
  account_type: AccountType;
  opening: string;
  debit: string;
  credit: string;
  closing: string;
};

export type TrialBalance = {
  currency: string;
  date_from: string | null;
  date_to: string;
  rows: TrialBalanceRow[];
  totals: { opening: string; debit: string; credit: string; closing: string };
};

export type Ledger = {
  account: number;
  code: string;
  name: string;
  currency: string;
  date_from: string;
  date_to: string;
  opening: string;
  closing: string;
  rows: {
    entry: number;
    number: string;
    date: string;
    description: string;
    partner: string;
    debit: string;
    credit: string;
    balance: string;
  }[];
};

// --- Inventory ------------------------------------------------------------------------------

export type StockStatus = "available" | "in_transit" | "damaged" | "returned";

export type StockRow = {
  warehouse: number;
  warehouse_name: string;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  available: string;
  in_transit: string;
  damaged: string;
  returned: string;
  reserved: string;
  free: string;
  average_cost: string;
  value: string;
};

export type StockLevels = { currency: string; as_of: string; rows: StockRow[] };

export type StockMove = {
  id: number;
  date: string;
  warehouse: number;
  warehouse_name: string;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  status: StockStatus;
  quantity: string;
  unit_cost: string;
  value: string;
  move_type: "adjustment" | "count" | "transfer_out" | "transfer_in" | "receipt" | "issue" | "status";
  reference: string;
  note: string;
  created_at: string;
};

export type AdjustmentLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  status: StockStatus;
  quantity: string;
  unit_cost: string | null;
};

export type Adjustment = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  warehouse: number;
  warehouse_name: string;
  reason: "opening" | "correction" | "damage" | "status";
  counter_account: number | null;
  note: string;
  status: "draft" | "posted";
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  lines: AdjustmentLine[];
};

export type TransferLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  quantity: string;
  received_quantity?: string;
};

export type Transfer = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  from_warehouse: number;
  from_warehouse_name: string;
  to_warehouse: number;
  to_warehouse_name: string;
  note: string;
  status: "draft" | "in_transit" | "partial" | "received";
  dispatched_at: string | null;
  received_at: string | null;
  lines: TransferLine[];
};

export type CountLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  expected_quantity?: string;
  counted_quantity: string;
};

export type StockCount = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  warehouse: number;
  warehouse_name: string;
  note: string;
  status: "draft" | "posted";
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  lines: CountLine[];
};

export type Reservation = Audited & {
  id: number;
  company: number;
  warehouse: number;
  warehouse_name: string;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  quantity: string;
  status: "active" | "released" | "fulfilled";
  reference: string;
};

export type ReorderRule = Audited & {
  id: number;
  company: number;
  warehouse: number;
  warehouse_name: string;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  min_quantity: string;
  reorder_quantity: string;
  is_active: boolean;
};

export type ReorderRow = {
  rule: number;
  warehouse: number;
  warehouse_name: string;
  product: number;
  sku: string;
  product_name: string;
  free: string;
  min_quantity: string;
  suggested: string;
};

export type SlowMovingRow = {
  product: number;
  sku: string;
  product_name: string;
  quantity: string;
  value: string;
  last_out: string | null;
  last_in: string | null;
  days_idle: number;
};

// --- Sales ----------------------------------------------------------------------------------

export type SalesLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  product_type?: "stock" | "non_stock" | "service";
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
  net_amount?: string;
  tax_amount?: string;
  total_amount?: string;
};

type SalesHeader = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  branch: number;
  branch_name: string;
  customer: number;
  customer_name: string;
  salesperson: number | null;
  salesperson_name: string | null;
  currency: string;
  exchange_rate: string;
  reference: string;
  notes: string;
  subtotal: string;
  tax_total: string;
  total: string;
};

export type Quotation = SalesHeader & {
  status: "draft" | "sent" | "accepted" | "invoiced" | "expired" | "cancelled";
  valid_until: string | null;
  price_list: number | null;
  sent_at: string | null;
  invoice: number | null;
  invoice_number: string | null;
  lines: SalesLine[];
};

export type InvoiceLine = SalesLine & { delivered_quantity?: string; returned_quantity?: string };

export type Invoice = SalesHeader & {
  status: "draft" | "posted" | "partially_paid" | "paid" | "cancelled";
  due_date: string | null;
  warehouse: number | null;
  amount_paid: string;
  amount_credited: string;
  amount_due: string;
  delivery_status: "not_required" | "pending" | "partial" | "delivered";
  quotation_number: string | null;
  journal_number: string | null;
  posted_at: string | null;
  lines: InvoiceLine[];
};

export type DeliveryLine = {
  id?: number;
  invoice_line: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  ordered_quantity?: string;
  delivered_before?: string;
  quantity: string;
};

export type DeliveryNote = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  invoice: number;
  invoice_number: string;
  customer_name: string;
  warehouse: number;
  warehouse_name: string;
  delivered_to: string;
  address: string;
  driver: string;
  notes: string;
  status: "draft" | "posted";
  journal_number: string | null;
  posted_at: string | null;
  lines: DeliveryLine[];
};

export type Allocation = { id?: number; invoice: number; invoice_number?: string; invoice_total?: string; invoice_due?: string; amount: string };

export type Receipt = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  branch: number;
  branch_name: string;
  customer: number;
  customer_name: string;
  method: "cash" | "knet" | "card" | "bank_transfer" | "cheque";
  journal: number;
  journal_code: string;
  reference: string;
  currency: string;
  exchange_rate: string;
  amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  notes: string;
  status: "draft" | "posted";
  journal_number: string | null;
  posted_at: string | null;
  allocations: Allocation[];
};

export type CreditNoteLine = SalesLine & { invoice_line: number; restock: boolean };

export type CreditNote = SalesHeader & {
  status: "draft" | "posted";
  invoice: number;
  invoice_number: string;
  warehouse: number | null;
  reason: string;
  journal_number: string | null;
  posted_at: string | null;
  lines: CreditNoteLine[];
};

export type SalesSettings = {
  id: number;
  company: number;
  default_tax_rate: string;
  quotation_valid_days: number;
  default_payment_terms_days: number;
  max_line_discount_percent: string;
  invoice_notes: string;
};

export type CustomerBalance = { open_invoices: number; amount_due: string; advances: string; credit_limit: string };

// --- Point of sale ------------------------------------------------------------------------------

export type Register = Audited &
  Named & {
    id: number;
    company: number;
    branch: number;
    branch_name: string;
    code: string;
    warehouse: number;
    warehouse_name: string;
    price_list: number | null;
    price_list_name: string | null;
    cash_journal: number;
    cash_journal_name: string;
    card_journal: number;
    card_journal_name: string;
    walk_in_customer: number;
    walk_in_customer_name: string;
    walk_in_customer_name_ar: string;
    cash_difference_account: number | null;
    receipt_header: string;
    receipt_footer: string;
    is_active: boolean;
    open_shift: { id: number; number: string; opened_at: string; opened_by: number } | null;
  };

export type PosMethod = "cash" | "knet" | "card";

export type ShiftTotals = {
  sales_count: string;
  voided_count: string;
  sales_total: string;
  refunds_total: string;
  net_total: string;
  by_method: Record<PosMethod, string>;
  expected_cash: string;
};

export type Shift = {
  id: number;
  company: number;
  register: number;
  register_code: string;
  register_name: string;
  branch: number;
  branch_name: string;
  number: string;
  status: "open" | "closed";
  opened_by: number;
  opened_by_name: string | null;
  opened_at: string;
  opening_cash: string;
  closed_by: number | null;
  closed_by_name: string | null;
  closed_at: string | null;
  closing_cash: string;
  expected_cash: string;
  cash_difference: string;
  sales_count: number;
  sales_total: string;
  refunds_total: string;
  notes: string;
  difference_entry: number | null;
  totals: ShiftTotals;
};

export type PosPayment = {
  id: number;
  method: PosMethod;
  method_label: string;
  amount: string;
  reference: string;
  receipt: number | null;
  receipt_number: string | null;
};

export type PosSaleLine = {
  product: number;
  sku: string;
  name: string;
  name_ar: string;
  uom: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
  net_amount: string;
  tax_amount: string;
  total_amount: string;
};

export type PosSale = {
  id: number;
  company: number;
  shift: number;
  shift_number: string;
  register_code: string;
  register_name: string;
  branch: number;
  branch_name: string;
  number: string;
  date: string;
  customer: number;
  customer_name: string;
  customer_mobile: string;
  invoice: number;
  delivery: number | null;
  credit_note: number | null;
  credit_note_number: string | null;
  currency: string;
  subtotal: string;
  tax_total: string;
  total: string;
  tendered: string;
  change_given: string;
  status: "completed" | "voided";
  voided_at: string | null;
  voided_by: number | null;
  void_reason: string;
  cashier: string | null;
  receipt_header: string;
  receipt_footer: string;
  lines: PosSaleLine[];
  payments: PosPayment[];
  created_at: string;
};

export type PosProduct = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  name_ar: string;
  uom: string;
  allow_decimal: boolean;
  product_type: "stock" | "non_stock" | "service";
  category: number;
  image: string | null;
  price: string;
  stock: string | null;
};

export type PosCatalog = {
  price_list: { id: number; name: string } | null;
  currency: string;
  categories: { id: number; name: string; name_ar: string; image: string | null }[];
  products: PosProduct[];
};

// --- Purchasing ----------------------------------------------------------------------------------

export type PurchaseLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  product_type?: "stock" | "non_stock" | "service";
  description: string;
  quantity: string;
  unit_cost: string;
  discount_percent: string;
  tax_rate: string;
  net_amount?: string;
  tax_amount?: string;
  total_amount?: string;
  received_quantity?: string;
  invoiced_quantity?: string;
  receipt_line?: number | null;
  receipt_number?: string | null;
  account?: number | null;
  account_code?: string | null;
};

type PurchaseHeader = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  supplier: number;
  supplier_name: string;
  currency: string;
  exchange_rate: string;
  reference: string;
  notes: string;
  subtotal: string;
  tax_total: string;
  total: string;
};

export type PurchaseOrder = PurchaseHeader & {
  status: "draft" | "sent" | "partial" | "received" | "closed" | "cancelled";
  branch: number | null;
  branch_name: string | null;
  warehouse: number;
  warehouse_name: string;
  supplier_currency: string;
  expected_date: string | null;
  intercompany: boolean;
  receipt_status: "pending" | "partial" | "received";
  sent_at: string | null;
  lines: PurchaseLine[];
};

export type ReceivableRow = {
  order_line: number;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  ordered_quantity: string;
  received_before: string;
  quantity: string;
};

export type BillableRow = {
  receipt_line: number;
  receipt_number: string;
  product: number;
  sku: string;
  product_name: string;
  uom: string;
  quantity: string;
  unit_cost: string;
  discount_percent: string;
  tax_rate: string;
};

export type GoodsReceiptLine = {
  id?: number;
  order_line: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  ordered_quantity?: string;
  received_before?: string;
  quantity: string;
  unit_cost?: string;
  goods_value?: string;
  invoiced_quantity?: string;
};

export type GoodsReceipt = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  order: number;
  order_number: string;
  supplier: number;
  supplier_name: string;
  warehouse: number;
  warehouse_name: string;
  supplier_reference: string;
  freight_cost: string;
  customs_cost: string;
  goods_value: string;
  notes: string;
  status: "draft" | "posted";
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  lines: GoodsReceiptLine[];
};

export type SupplierBill = PurchaseHeader & {
  status: "draft" | "posted" | "partially_paid" | "paid" | "cancelled";
  supplier_number: string;
  due_date: string | null;
  order: number | null;
  order_number: string | null;
  amount_paid: string;
  amount_due: string;
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  cancelled_at: string | null;
  lines: PurchaseLine[];
};

export type SupplierPayment = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  supplier: number;
  supplier_name: string;
  method: "bank_transfer" | "cheque" | "cash" | "letter_of_credit";
  journal: number;
  journal_name: string;
  reference: string;
  currency: string;
  exchange_rate: string;
  amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  notes: string;
  status: "draft" | "posted";
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  allocations: { id?: number; invoice: number; invoice_number?: string; supplier_number?: string; amount: string }[];
};

export type SupplierBalance = { open_bills: number; amount_due: string; advances: string; currency: string };

// --- Projects ------------------------------------------------------------------------------------

export type BOQLine = {
  id?: number;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  product_type?: "stock" | "non_stock" | "service";
  description: string;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  amount?: string;
  issued_quantity?: string;
};

export type ProjectSummary = {
  boq_value: string;
  boq_cost: string;
  invoiced: string;
  received: string;
  outstanding: string;
  materials_cost: string;
  labour_cost: string;
  margin: string;
  margin_percent: string | null;
  reserved_units: string;
  invoice_count: number;
};

export type ProjectStatus = "lead" | "quoted" | "won" | "in_progress" | "completed" | "closed" | "lost";

export type Project = Audited &
  Named & {
    id: number;
    company: number;
    number: string;
    customer: number;
    customer_name: string;
    branch: number;
    branch_name: string;
    manager: number | null;
    manager_name: string | null;
    site_address: string;
    status: ProjectStatus;
    start_date: string | null;
    end_date: string | null;
    contract_value: string;
    retention_percent: string;
    notes: string;
    boq_value: string;
    summary?: ProjectSummary | null;
    boq?: BOQLine[];
  };

export type BOQProgress = BOQLine & { id: number; invoiced_quantity: string; issued_quantity: string };

export type MaterialIssueLine = {
  id?: number;
  boq_line: number | null;
  product: number;
  sku?: string;
  product_name?: string;
  uom?: string;
  quantity: string;
  unit_cost?: string;
  value?: string;
};

export type MaterialIssue = Audited & {
  id: number;
  company: number;
  number: string;
  date: string;
  project: number;
  project_number: string;
  project_name: string;
  customer_name: string;
  warehouse: number;
  warehouse_name: string;
  issued_to: string;
  notes: string;
  status: "draft" | "posted";
  cost_total: string;
  journal_entry: number | null;
  journal_number: string | null;
  posted_at: string | null;
  lines: MaterialIssueLine[];
};

// --- Installation --------------------------------------------------------------------------------

export type Technician = Audited &
  Named & {
    id: number;
    company: number;
    phone: string;
    user: number | null;
    branch: number | null;
    branch_name: string | null;
    skills: string;
    hourly_cost: string;
    is_active: boolean;
    open_jobs: number;
  };

export type WorkOrderStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type WorkOrder = Audited & {
  id: number;
  company: number;
  number: string;
  title: string;
  customer: number;
  customer_name: string;
  customer_mobile: string;
  project: number | null;
  project_number: string | null;
  project_name: string | null;
  source_invoice: number | null;
  source_invoice_number: string | null;
  branch: number;
  branch_name: string;
  site_address: string;
  contact_name: string;
  contact_phone: string;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_hours: string;
  technicians: number[];
  technician_names: string[];
  description: string;
  status: WorkOrderStatus;
  started_at: string | null;
  completed_at: string | null;
  completion_notes: string;
  signed_by: string;
  labour_hours: string;
  labour_cost: string;
  cancel_reason: string;
  invoice_numbers: string[];
};

export type CalendarDay = {
  date: string;
  jobs: {
    id: number;
    number: string;
    title: string;
    customer_name: string;
    project_number: string | null;
    branch_name: string;
    time: string | null;
    duration_hours: string;
    status: WorkOrderStatus;
    technicians: string[];
    site_address: string;
  }[];
};

// --- Reports -------------------------------------------------------------------------------------

export type Dashboard = {
  currency: string;
  today: string;
  sales: {
    today: string;
    today_count: number;
    month: string;
    month_count: number;
    previous_month: string;
    change_percent: string | null;
    series: { date: string; amount: string }[];
    by_branch: { branch: number; name: string; amount: string }[];
    top_products: { product: number; sku: string; name: string; quantity: string; amount: string }[];
  };
  receivables: { total: string; count: number; overdue: string; overdue_count: number };
  payables: { total: string; count: number; overdue: string };
  cash: { total: string; accounts: { account: number; code: string; name: string; balance: string }[] };
  stock_value: string;
  projects: { active: number; contract_value: string };
  jobs_today: number;
  open_shifts: number;
  purchase_orders: { open: number; value: string };
};

export type ReportGroup = { code: string; name: string; name_ar: string; rows: { account: number; code: string; name: string; name_ar: string; amount: string }[]; total: string };

export type ProfitAndLoss = {
  currency: string;
  date_from: string;
  date_to: string;
  income: ReportGroup[];
  cost_of_sales: ReportGroup[];
  expenses: ReportGroup[];
  totals: { income: string; cost_of_sales: string; gross_profit: string; expenses: string; net_profit: string; gross_margin_percent: string | null };
};

export type BalanceSheet = {
  currency: string;
  as_of: string;
  assets: ReportGroup[];
  liabilities: ReportGroup[];
  equity: ReportGroup[];
  current_earnings: string;
  totals: { assets: string; liabilities: string; equity: string; liabilities_and_equity: string; balanced: boolean };
};

export type AgeingRow = { partner: number; code: string; name: string; count: number; total: string; current: string; "1_30": string; "31_60": string; "61_90": string; over_90: string };

export type Ageing = { currency: string; kind: "receivable" | "payable"; as_of: string; rows: AgeingRow[]; totals: Omit<AgeingRow, "partner" | "code" | "name" | "count"> };

export type VatReturn = {
  currency: string;
  country: string;
  tax_registration_number: string;
  date_from: string;
  date_to: string;
  sales: { standard_rated_net: string; standard_rated_tax: string; zero_rated_net: string; credit_notes_net: string; credit_notes_tax: string; by_branch: { branch: number; name: string; net: string; tax: string }[] };
  purchases: { taxable_net: string; input_tax: string; untaxed_net: string };
  totals: { output_tax: string; input_tax: string; net_payable: string };
};
