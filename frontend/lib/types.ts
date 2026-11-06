export type User = { id: number; name: string; email: string; role: "admin" | "cashier" };

export type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  unit: string;
  price: string;
  gst_percent: string;
  stock: string;
  min_stock: string;
  reorder_qty: string;
  active: boolean;
  low_stock: boolean;
};

export type SaleItem = {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  unit: string;
  quantity: string;
  unit_price: string;
  gst_percent: string;
  gst_amount: string;
  line_total: string;
};

export type Sale = {
  id: number;
  bill_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: string;
  discount: string;
  gst: string;
  total: string;
  payment_method: string;
  payment_reference: string | null;
  amount_tendered: string | null;
  change_due: string | null;
  created_at: string;
  cashier: string;
  items?: SaleItem[];
};

export type DailyReport = {
  date: string;
  bill_count: number;
  gross_sales: string;
  discounts: string;
  gst: string;
  net_sales: string;
  payments: Record<"cash" | "upi" | "card", string>;
};

