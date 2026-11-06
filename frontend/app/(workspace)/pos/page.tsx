"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import Receipt from "@/components/Receipt";
import { api } from "@/lib/api";
import type { Product, Sale } from "@/lib/types";

type CartLine = Product & { quantity: number };

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState("cash");
  const [tendered, setTendered] = useState("");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api<{ products: Product[] }>("/products").then(({ products }) => setProducts(products)).catch((reason) => setError(reason.message)); }, []);
  useEffect(() => {
    searchRef.current?.focus();
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 24);
    return products.filter((item) => [item.name, item.sku, item.barcode ?? ""].some((value) => value.toLowerCase().includes(term))).slice(0, 24);
  }, [products, query]);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  function add(product: Product) {
    if (Number(product.stock) <= 0) return;
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) return current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, Number(line.stock)) } : line);
      return [...current, { ...product, quantity: 1 }];
    });
    setQuery("");
    searchRef.current?.focus();
  }

  function change(id: number, amount: number) {
    setCart((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.min(Number(line.stock), Math.max(0, line.quantity + amount)) } : line).filter((line) => line.quantity > 0));
  }

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!cart.length) return;
    setError("");
    setBusy(true);
    try {
      const { sale } = await api<{ sale: Sale }>("/sales", { method: "POST", body: JSON.stringify({
        items: cart.map((line) => ({ product_id: line.id, quantity: line.quantity })),
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_method: payment,
        amount_tendered: payment === "cash" ? tendered : undefined,
        discount: Number(discount) || 0,
      }) });
      setCompleted(sale);
      setProducts((current) => current.map((product) => {
        const sold = cart.find((line) => line.id === product.id);
        return sold ? { ...product, stock: (Number(product.stock) - sold.quantity).toFixed(3) } : product;
      }));
      setCart([]); setCustomerName(""); setCustomerPhone(""); setTendered(""); setDiscount("0");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="pos-layout">
      <section className="catalog-pane">
        <header className="page-header"><div><p className="kicker">POINT OF SALE</p><h1>New bill</h1><p>Search by item name, SKU, or barcode.</p></div><time>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</time></header>
        <div className="search-box"><Search size={20} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Start typing or scan a barcode" /><kbd>F2</kbd></div>
        <div className="product-grid">
          {filtered.map((product) => <button className="product-card" key={product.id} onClick={() => add(product)} disabled={Number(product.stock) <= 0}>
            <div><span className="sku">{product.sku}</span><span className={product.low_stock ? "stock low" : "stock"}>{Number(product.stock).toLocaleString("en-IN")} {product.unit}</span></div>
            <h3>{product.name}</h3><p>{product.category}</p><footer><strong>₹{Number(product.price).toFixed(2)}</strong><span><Plus size={17} /></span></footer>
          </button>)}
          {!filtered.length && <div className="empty-state"><Search /><h3>No products found</h3><p>Check the spelling or add the product in Inventory.</p></div>}
        </div>
      </section>
      <form className="bill-pane" id="current-bill" onSubmit={checkout}>
        <header><div><ShoppingCart size={21} /><div><h2>Current bill</h2><p>{cart.length} {cart.length === 1 ? "item" : "items"}</p></div></div>{cart.length > 0 && <button type="button" className="text-button danger" onClick={() => setCart([])}><Trash2 size={15} />Clear</button>}</header>
        <div className="customer-row"><input aria-label="Customer name" placeholder="Customer name (optional)" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /><input aria-label="Phone number" placeholder="Phone (optional)" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div>
        <div className="cart-lines">
          {!cart.length ? <div className="cart-empty"><ShoppingCart size={34} /><h3>No items added</h3><p>Select a product to begin this bill.</p></div> : cart.map((line) => <div className="cart-line" key={line.id}><div className="line-info"><b>{line.name}</b><span>₹{Number(line.price).toFixed(2)} / {line.unit}</span></div><div className="stepper"><button type="button" onClick={() => change(line.id, -1)}>{line.quantity === 1 ? <X size={14} /> : <Minus size={14} />}</button><b>{line.quantity}</b><button type="button" onClick={() => change(line.id, 1)}><Plus size={14} /></button></div><strong>₹{(Number(line.price) * line.quantity).toFixed(2)}</strong></div>)}
        </div>
        <div className="bill-controls">
          <label>Bill discount<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
          <fieldset><legend>Payment method</legend>{["cash", "upi", "card"].map((method) => <label key={method} className={payment === method ? "selected" : ""}><input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} />{method.toUpperCase()}</label>)}</fieldset>
          {payment === "cash" && <label>Amount received<input type="number" min={total} step="0.01" required value={tendered} onChange={(event) => setTendered(event.target.value)} placeholder={`At least ₹${total.toFixed(2)}`} /></label>}
        </div>
        <div className="bill-totals"><p><span>Subtotal</span><b>₹{subtotal.toFixed(2)}</b></p><p><span>Discount</span><b>−₹{(Number(discount) || 0).toFixed(2)}</b></p><p className="grand"><span>Total</span><b>₹{total.toFixed(2)}</b></p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-block checkout-button" disabled={!cart.length || busy}>{busy ? "Completing sale…" : <>Complete sale <Check size={18} /></>}</button>
      </form>
      {cart.length > 0 && <button type="button" className="mobile-cart-jump" onClick={() => document.getElementById("current-bill")?.scrollIntoView({ behavior: "smooth" })}><ShoppingCart size={17} /><span>Current bill · {cart.length} {cart.length === 1 ? "item" : "items"}</span><b>₹{total.toFixed(2)}</b></button>}
      {completed && <div className="modal-backdrop"><div className="receipt-modal"><button className="modal-close" onClick={() => setCompleted(null)} aria-label="Close"><X /></button><div className="success-mark"><Check /></div><h2>Sale completed</h2><p className="subtle">{completed.bill_number} has been recorded.</p><Receipt sale={completed} /><div className="modal-actions"><button className="button button-secondary" onClick={() => setCompleted(null)}>New bill</button><button className="button button-primary" onClick={() => window.print()}><Printer size={17} />Print receipt</button></div></div></div>}
    </div>
  );
}

