# QuickServe - Modern E-Commerce Web Application

**QuickServe** is a fast, responsive, and production-ready e-commerce platform built with clean vanilla JavaScript on the frontend and an Express & SQL-powered backend.

## Architecture

```
e-commerce/
├── frontend/             # Responsive storefront (HTML5, CSS3 Glassmorphism, Vanilla JS)
│   ├── assets/           # Cutouts, product imagery, 3D models
│   ├── css/style.css     # Design system, themes, glassmorphism, responsive styles
│   ├── js/
│   │   ├── api.js        # Backend connector & sync manager
│   │   ├── app.js        # Storefront logic, filtering, cart, checkout modal
│   │   ├── data.js       # Offline catalog & fallback data
│   │   ├── herospin.js   # 360-degree interactive 3D WebGL product spin
│   │   ├── home.js       # Dynamic hero banner ads & category cards
│   │   └── store.js      # Cart and wishlist reactive state with localStorage
│   └── index.html        # Main storefront layout
│
├── backend/              # Node.js + Express 5 production REST API
│   ├── src/
│   │   ├── db.js         # Scalable database adapter (SQLite & Cloud PostgreSQL)
│   │   ├── seedData.js   # Initial catalog seed data
│   │   ├── server.js     # Express server with Helmet, Rate Limiter, Compression
│   │   └── routes/       # API endpoints (products, categories, banners, orders)
│   ├── .env.example      # Environment variables template
│   └── package.json
│
└── database/             # Database schemas & persistence
    ├── schema.sql        # Universal SQL DDL compatible with PostgreSQL & SQLite
    ├── quickserve.db     # Zero-config embedded SQLite database
    └── README.md
```

## Running the Application

### Option A: Fullstack Mode (Recommended)
Runs both the backend API and frontend together on port 5000:
```bash
npm run install:all
npm start
```
Open **http://localhost:5000/** in your browser.

### New account and operations features
- `/auth.html` provides customer registration and login.
- `/admin.html` provides protected order metrics and status management for an admin account configured through `backend/.env`.
- Non-COD checkout creates and confirms a payment intent through the configured payment provider abstraction. The default local provider is `mock`; connect a real provider before production use.
- Order tracking reads persisted status events from the API.
- Admins can publish courier latitude, longitude, speed, and ETA from `/admin.html`; customers see the latest location in the Track Order panel, which refreshes every 15 seconds.
- For automatic GPS updates, connect a courier/device provider to `PATCH /api/admin/orders/:id/location` or replace that admin endpoint with a signed courier webhook.

Run the automated API checks with:
```bash
npm test
```

Build and run the container with:
```bash
docker build -t quickserve .
docker run --rm -p 5000:5000 --env-file backend/.env quickserve
```

### Render + Neon setup
1. Create a Neon PostgreSQL database and copy its connection string.
2. Create a Render Web Service from this repository. Render can use the included `render.yaml` Blueprint.
3. Add the Neon connection string as `DATABASE_URL` in Render. Keep `DB_SSL=true`.
4. Add an admin email and a strong admin password in Render. Do not commit these values.
5. Leave `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` empty until Razorpay is ready. The app will use mock payments until both are present.
6. When Razorpay is enabled, set both keys in Render and use the Razorpay test keys first.

The only values needed from you later are the Neon connection string, admin account values, and Razorpay keys. They belong in Render environment variables or a local ignored `backend/.env`, never in source files.

### Option B: Standalone Frontend + Backend
1. **Start backend API**:
   ```bash
   cd backend
   npm start
   # Runs on http://localhost:5000
   ```
2. **Start frontend server**:
   ```bash
   cd frontend
   python3 -m http.server 5500
   # Runs on http://localhost:5500
   ```
The frontend automatically detects the API at `http://localhost:5000/api` and displays the **🟢 API Live** badge.

## Database: Zero-Cost & Scalable
- **Local Development**: Uses hassle-free SQLite (`database/quickserve.db`) out-of-the-box.
- **Production Cloud**: Set `DATABASE_URL` in `backend/.env` with your free-tier serverless PostgreSQL connection string (such as **Neon** or **Supabase**) to scale with zero maintenance costs.

## Features
- **Interactive 3D Product Spin**: 360-degree touch/mouse interaction in the hero section via Three.js.
- **Dark / Light Theme**: Instant mode toggle with local storage persistence.
- **Dynamic Search & Multi-Filters**: Filter by category, price slider, minimum rating, and sorting.
- **Reactive Cart & Wishlist**: Real-time totals, free delivery threshold calculation, drawer UI.
- **Secure Checkout & Order Placement**: Integrated order submission verifying prices and managing stock.
