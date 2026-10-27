# QuickServe Backend API

Production-ready REST API built with Node.js and Express 5.

## Features
- **Security**: Hardened with `helmet`, CORS configuration, and parameterized SQL queries to prevent SQL injections.
- **DDoS / Abuse Protection**: Configured with `express-rate-limit` (300 requests / 15 minutes).
- **High Performance**: Gzip / Deflate compression via `compression` middleware and connection pooling.
- **Observability**: Request logging via `morgan`.
- **Database Scalability**: Universal database adapter supporting local SQLite (`quickserve.db`) and Cloud PostgreSQL (Neon / Supabase).
- **Static Assets Serving**: Can also serve the complete frontend application directly on port 5000 in production.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment (optional)**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Run the server**:
   ```bash
   npm start
   # or development mode with auto-reload:
   npm run dev
   ```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status, database engine, timestamp |
| `GET` | `/api/products` | Filter products (`category`, `search`, `minPrice`, `maxPrice`, `minRating`, `sort`, `limit`, `offset`) |
| `GET` | `/api/products/featured` | Curated product highlights (Best Seller, Top Deal, Top Rated) |
| `GET` | `/api/products/:id` | Single product detail by ID |
| `GET` | `/api/categories` | Categories list with item count, description, and cover item |
| `GET` | `/api/banners` | Hero ads carousel items with joined product info |
| `POST` | `/api/orders` | Place a verified order (validates prices against DB, adjusts stock) |
| `GET` | `/api/orders/:id` | Retrieve receipt and order status by Order ID |
| `GET` | `/api/orders` | List recent orders (admin overview) |
