import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenBasket Billing",
  description: "Point of sale, inventory, and sales reporting for grocery stores.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

