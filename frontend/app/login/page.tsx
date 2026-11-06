"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, ShoppingBasket } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace("/pos");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand brand-light"><span><ShoppingBasket size={22} /></span>GreenBasket</div>
        <div>
          <p className="kicker">STORE OPERATIONS</p>
          <h1>Billing that stays<br />out of the way.</h1>
          <p>Fast checkout, accurate stock, and a clear daily record—without a complicated interface.</p>
        </div>
        <small>Secure access for authorised store staff</small>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <span className="login-icon"><LockKeyhole size={22} /></span>
          <p className="kicker">STAFF SIGN IN</p>
          <h2>Welcome back</h2>
          <p className="subtle">Use the account created by your store administrator.</p>
          <label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-block" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={17} /></>}</button>
        </form>
      </section>
    </main>
  );
}

