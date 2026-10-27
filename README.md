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
cd backend
npm install
npm start
```
Open **http://localhost:5000/** in your browser.

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
