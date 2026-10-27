# QuickServe Database Layer

The QuickServe database architecture is designed to be **easily scalable, hassle-free, and free of cost initially**:

## 1. Dual Engine Support
1. **Local Development (Default - Hassle Free & Zero Cost)**:
   - Uses embedded **SQLite** via `better-sqlite3` stored in `database/quickserve.db`.
   - Requires zero installation of external database servers, zero configuration, zero credentials.
   - Automatically migrates schema and seeds initial products on first run.

2. **Cloud Production (Seamless Autoscaling & Free Tier)**:
   - When deploying to production (e.g. Render, Railway, Vercel, Fly.io, AWS), configure `DATABASE_URL` in `backend/.env`.
   - Compatible with free-tier cloud serverless PostgreSQL providers:
     - **Neon Postgres** (Generous free tier with branching & autoscaling compute)
     - **Supabase** (Free managed PostgreSQL)
     - **Render / Railway / Aiven Postgres**
   - The backend detects `DATABASE_URL` and switches to production connection pool (`pg`) with automatic SSL.

## 2. Schema Structure (`schema.sql`)
- `categories`: Category names, descriptions, item counts, and minimum discount thresholds.
- `products`: Product catalog with brand, specs (JSON), pricing, stock, ratings, review counts, and imagery.
- `banners`: Hero banner ads linked to products with customizable option chips.
- `orders`: Confirmed customer orders with customer details, order items (JSON), breakdown, and payment status.
- Indexes:
  - `idx_products_category`
  - `idx_products_price`
  - `idx_products_rating`
  - `idx_orders_email`

## 3. Resetting / Re-seeding
To reset or re-seed the database at any time:
```bash
cd backend
npm run seed
```
