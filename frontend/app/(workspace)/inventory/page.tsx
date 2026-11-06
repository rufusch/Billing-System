"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackagePlus, Pencil, Plus, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

const emptyProduct = { sku: "", barcode: "", name: "", category: "General", unit: "pcs", price: "", gst_percent: "0", stock: "0", min_stock: "5", reorder_qty: "10" };

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [stocking, setStocking] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() { api<{ products: Product[] }>("/products?include_archived=true").then(({ products }) => setProducts(products)).catch((reason) => setError(reason.message)); }
  useEffect(load, []);
  const visible = useMemo(() => products.filter((product) => {
    const matches = [product.name, product.sku, product.barcode ?? "", product.category].some((value) => value.toLowerCase().includes(query.toLowerCase()));
    return matches && (!lowOnly || product.low_stock);
  }), [products, query, lowOnly]);
  const active = products.filter((product) => product.active);

  function openCreate() { setEditing(null); setForm({ ...emptyProduct }); setError(""); setFormOpen(true); }
  function openEdit(product: Product) {
    setEditing(product);
    setForm({ sku: product.sku, barcode: product.barcode ?? "", name: product.name, category: product.category, unit: product.unit, price: product.price, gst_percent: product.gst_percent, stock: product.stock, min_stock: product.min_stock, reorder_qty: product.reorder_qty });
    setError(""); setFormOpen(true);
  }
  function closeForm() { setEditing(null); setForm({ ...emptyProduct }); setFormOpen(false); }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (editing) await api(`/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      else await api("/products", { method: "POST", body: JSON.stringify(form) });
      closeForm(); load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save product."); }
    finally { setBusy(false); }
  }

  async function receiveStock(event: FormEvent) {
    event.preventDefault(); if (!stocking) return; setBusy(true); setError("");
    try { await api(`/products/${stocking.id}/stock`, { method: "POST", body: JSON.stringify({ quantity: stockQty }) }); setStocking(null); setStockQty(""); load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update stock."); }
    finally { setBusy(false); }
  }

  return <div className="page-container">
    <header className="page-header action-header"><div><p className="kicker">CATALOGUE & STOCK</p><h1>Inventory</h1><p>Maintain prices, tax rates, and stock thresholds.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={18} />Add product</button></header>
    <section className="metric-grid three"><article><span>Active products</span><strong>{active.length}</strong><small>Available at checkout</small></article><article><span>Low stock</span><strong>{active.filter((product) => product.low_stock).length}</strong><small>At or below minimum</small></article><article><span>Inventory value</span><strong>₹{active.reduce((sum, product) => sum + Number(product.stock) * Number(product.price), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong><small>At current selling price</small></article></section>
    <section className="data-panel"><div className="panel-toolbar"><div className="search-box compact"><Search size={18} /><input placeholder="Search products, SKU, or category" value={query} onChange={(event) => setQuery(event.target.value)} /></div><label className="check-filter"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />Low stock only</label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>In stock</th><th>Minimum</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id} className={!product.active ? "archived" : ""}><td><b>{product.name}</b><small>{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</small></td><td>{product.category}</td><td>₹{Number(product.price).toFixed(2)}</td><td>{Number(product.stock).toLocaleString("en-IN")} {product.unit}</td><td>{Number(product.min_stock).toLocaleString("en-IN")} {product.unit}</td><td>{!product.active ? <span className="badge muted">Archived</span> : product.low_stock ? <span className="badge warning"><AlertTriangle size={13} />Low stock</span> : <span className="badge success">In stock</span>}</td><td><div className="row-actions"><button title="Receive stock" onClick={() => { setStocking(product); setError(""); }}><PackagePlus /></button><button title="Edit product" onClick={() => openEdit(product)}><Pencil /></button></div></td></tr>)}</tbody></table></div>
      {!visible.length && <div className="empty-state"><Boxes /><h3>No inventory matches</h3><p>Adjust the search or stock filter.</p></div>}
    </section>
    {formOpen && <div className="modal-backdrop"><form className="form-modal" onSubmit={save}><button type="button" className="modal-close" onClick={closeForm}><X /></button><p className="kicker">{editing?.id ? "EDIT PRODUCT" : "NEW PRODUCT"}</p><h2>{editing?.id ? editing.name : "Add catalogue item"}</h2><div className="form-grid"><label>SKU<input required disabled={Boolean(editing?.id)} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label><label>Barcode<input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label><label className="span-two">Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label><label>Unit<select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>{["pcs", "kg", "g", "l", "ml", "pack"].map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Selling price<input type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>GST %<input type="number" min="0" max="100" step="0.01" required value={form.gst_percent} onChange={(event) => setForm({ ...form, gst_percent: event.target.value })} /></label>{!editing?.id && <label>Opening stock<input type="number" min="0" step="0.001" required value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>}<label>Low-stock level<input type="number" min="0" step="0.001" required value={form.min_stock} onChange={(event) => setForm({ ...form, min_stock: event.target.value })} /></label><label>Suggested reorder<input type="number" min="0" step="0.001" required value={form.reorder_qty} onChange={(event) => setForm({ ...form, reorder_qty: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={closeForm}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button></div></form></div>}
    {stocking && <div className="modal-backdrop"><form className="form-modal small" onSubmit={receiveStock}><button type="button" className="modal-close" onClick={() => setStocking(null)}><X /></button><p className="kicker">STOCK IN</p><h2>{stocking.name}</h2><p className="subtle">Current balance: {Number(stocking.stock).toLocaleString("en-IN")} {stocking.unit}</p><label>Quantity received<input autoFocus type="number" min="0.001" step="0.001" required value={stockQty} onChange={(event) => setStockQty(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setStocking(null)}>Cancel</button><button className="button button-primary" disabled={busy}>Update stock</button></div></form></div>}
  </div>;
}

