"use client";

import { useEffect, useState } from "react";
import { Banknote, CalendarDays, CreditCard, IndianRupee, ReceiptText, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import type { DailyReport } from "@/lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const [date, setDate] = useState(TODAY);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState("");
  function load(value: string) { setError(""); api<{ report: DailyReport }>(`/reports/daily?date=${value}`).then(({ report }) => setReport(report)).catch((reason) => setError(reason.message)); }
  useEffect(() => {
    api<{ report: DailyReport }>(`/reports/daily?date=${TODAY}`)
      .then(({ report }) => setReport(report))
      .catch((reason) => setError(reason.message));
  }, []);
  return <div className="page-container"><header className="page-header action-header"><div><p className="kicker">DAILY SUMMARY</p><h1>Reports</h1><p>Review takings and payment reconciliation.</p></div><label className="date-control"><CalendarDays size={17} /><input type="date" value={date} onChange={(event) => { setDate(event.target.value); load(event.target.value); }} /></label></header>{report && <><section className="metric-grid three"><article><span>Net sales</span><strong>₹{Number(report.net_sales).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><small>After discounts</small></article><article><span>Bills issued</span><strong>{report.bill_count}</strong><small>Completed transactions</small></article><article><span>GST included</span><strong>₹{Number(report.gst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><small>Tax component</small></article></section><section className="report-grid"><article className="data-panel summary-card"><header><div><p className="kicker">PAYMENT RECONCILIATION</p><h2>Collection by method</h2></div><IndianRupee /></header><div className="payment-row"><span><i><Banknote /></i>Cash</span><b>₹{Number(report.payments.cash).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div><div className="payment-row"><span><i><Smartphone /></i>UPI</span><b>₹{Number(report.payments.upi).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div><div className="payment-row"><span><i><CreditCard /></i>Card</span><b>₹{Number(report.payments.card).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div></article><article className="data-panel summary-card"><header><div><p className="kicker">BILLING SUMMARY</p><h2>Day at a glance</h2></div><ReceiptText /></header><div className="payment-row"><span>Gross sales</span><b>₹{Number(report.gross_sales).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div><div className="payment-row"><span>Discounts given</span><b>−₹{Number(report.discounts).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div><div className="payment-row total"><span>Net collection</span><b>₹{Number(report.net_sales).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></div></article></section></>}{error && <p className="form-error page-error">{error}</p>}</div>;
}

