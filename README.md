# GreenBasket Grocery Billing System

A focused grocery point-of-sale and inventory system, renovated from the supplied Logic Building using C microproject.

## What is included

- Next.js/TypeScript frontend for Vercel
- Flask REST API for Render
- PostgreSQL schema and Alembic migrations for Neon
- Transaction-safe checkout and stock deduction
- Inventory, sales history, daily reports, and printable receipts
- Standalone C implementation using arrays, structures, CSV files, and receipt files
- Automated backend tests and deployment documentation

## Local development

### Backend

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
alembic upgrade head
python -m app.commands
python -m app.seed_catalog
flask --app wsgi run --port 8000
```

For a quick local-only run, omit `DATABASE_URL` to use the ignored SQLite development database.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Deployment instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### C program

```powershell
cd c-program
gcc -std=c11 -Wall -Wextra -Wpedantic -O2 main.c -o grocery_billing.exe
.\grocery_billing.exe
```

## Billing rules

- Displayed prices are GST-inclusive.
- Decimal calculations use two-place commercial rounding.
- Weighted products accept fractional quantities; packaged products use whole quantities in normal operation.
- Discounts cannot exceed the subtotal.
- Stock deduction and bill creation are one database transaction.
- Historical bill lines preserve the name, price, tax rate, and unit used at checkout.

