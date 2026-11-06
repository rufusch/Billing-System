# Architecture

The application is intentionally split into three deployment units:

1. **Vercel frontend** — Next.js and TypeScript. It presents the POS, inventory, sales, and report screens. A rewrite sends `/api/*` to Render, so the browser has one application origin.
2. **Render backend** — Flask REST API. It owns authentication, validation, pricing, GST calculations, bill numbering, stock changes, and reporting.
3. **Neon database** — PostgreSQL. It stores staff accounts, products, immutable sale snapshots, inventory movements, settings, and audit records.

The browser never receives database credentials and cannot calculate an authoritative sale total. Checkout locks the selected product rows and performs bill creation and stock deduction in the same transaction.

The `c-program` directory is a separate academic implementation. It demonstrates arrays of structures and file handling without pretending that C is running on Vercel.

