"use client";

import { BarChart3, Boxes, LogOut, ReceiptText, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const navigation = [
  { href: "/pos", label: "New bill", icon: ShoppingBasket },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => router.replace("/login"))
      .finally(() => setReady(true));
  }, [router]);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  if (!ready) return <main className="loading-screen"><span className="spinner" />Loading store…</main>;
  if (!user) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/pos" className="brand"><span><ShoppingBasket size={20} /></span><div>GreenBasket<small>Billing system</small></div></Link>
        <nav aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={19} />{label}</Link>
          ))}
        </nav>
        <div className="staff-card"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.role}</small></div></div>
        <button className="sidebar-action" onClick={logout}><LogOut size={18} />Sign out</button>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}

