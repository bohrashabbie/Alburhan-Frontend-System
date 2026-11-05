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
