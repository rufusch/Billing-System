"use client";

import { useEffect, useState } from "react";
import { Eye, Printer, ReceiptText, Search, X } from "lucide-react";
import Receipt from "@/components/Receipt";
import { api } from "@/lib/api";
import type { Sale } from "@/lib/types";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [error, setError] = useState("");
  function load(term = "") { api<{ sales: Sale[] }>(`/sales?q=${encodeURIComponent(term)}`).then(({ sales }) => setSales(sales)).catch((reason) => setError(reason.message)); }
  useEffect(() => { load(); }, []);
  async function view(id: number) { try { const { sale } = await api<{ sale: Sale }>(`/sales/${id}`); setSelected(sale); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load bill."); } }
  return <div className="page-container"><header className="page-header"><div><p className="kicker">TRANSACTION RECORD</p><h1>Sales</h1><p>Find completed bills and reprint receipts.</p></div></header><section className="data-panel"><div className="panel-toolbar"><form className="search-box compact" onSubmit={(event) => { event.preventDefault(); load(query); }}><Search size={18} /><input placeholder="Bill number, customer, or phone" value={query} onChange={(event) => setQuery(event.target.value)} /><button>Search</button></form></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Bill number</th><th>Date & time</th><th>Customer</th><th>Payment</th><th>Cashier</th><th>Total</th><th /></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><b className="mono">{sale.bill_number}</b></td><td>{new Date(sale.created_at).toLocaleString("en-IN")}</td><td>{sale.customer_name || "Walk-in"}<small>{sale.customer_phone}</small></td><td><span className="badge neutral">{sale.payment_method.toUpperCase()}</span></td><td>{sale.cashier}</td><td><b>₹{Number(sale.total).toFixed(2)}</b></td><td><button className="icon-button" title="View bill" onClick={() => view(sale.id)}><Eye /></button></td></tr>)}</tbody></table></div>{!sales.length && <div className="empty-state"><ReceiptText /><h3>No bills found</h3><p>Completed sales will appear here.</p></div>}</section>{error && <p className="form-error page-error">{error}</p>}{selected && <div className="modal-backdrop"><div className="receipt-modal"><button className="modal-close" onClick={() => setSelected(null)}><X /></button><Receipt sale={selected} /><div className="modal-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button className="button button-primary" onClick={() => window.print()}><Printer size={17} />Print receipt</button></div></div></div>}</div>;
}

