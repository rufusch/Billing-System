import type { Sale } from "@/lib/types";

export default function Receipt({ sale }: { sale: Sale }) {
  return (
    <article className="receipt" id="print-receipt">
      <header><h2>GreenBasket Grocery</h2><p>Tax invoice</p><small>{sale.bill_number}</small></header>
      <dl className="receipt-meta">
        <div><dt>Date</dt><dd>{new Date(sale.created_at).toLocaleString("en-IN")}</dd></div>
        <div><dt>Cashier</dt><dd>{sale.cashier}</dd></div>
        {sale.customer_name && <div><dt>Customer</dt><dd>{sale.customer_name}</dd></div>}
      </dl>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
        {sale.items?.map((item) => <tr key={item.id}><td>{item.name}<small>₹{item.unit_price}/{item.unit}</small></td><td>{Number(item.quantity).toLocaleString("en-IN")}</td><td>₹{Number(item.line_total).toFixed(2)}</td></tr>)}
      </tbody></table>
      <dl className="receipt-totals">
        <div><dt>Subtotal</dt><dd>₹{sale.subtotal}</dd></div>
        <div><dt>Included GST</dt><dd>₹{sale.gst}</dd></div>
        {Number(sale.discount) > 0 && <div><dt>Discount</dt><dd>−₹{sale.discount}</dd></div>}
        <div className="grand"><dt>Total</dt><dd>₹{sale.total}</dd></div>
        <div><dt>Paid by</dt><dd>{sale.payment_method.toUpperCase()}</dd></div>
        {sale.change_due && <div><dt>Change</dt><dd>₹{sale.change_due}</dd></div>}
      </dl>
      <footer>Thank you for shopping with us.</footer>
    </article>
  );
}

