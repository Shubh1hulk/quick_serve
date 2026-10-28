require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const db = require("./db");
const { hashPassword } = require("./auth");
const productsRouter = require("./routes/products");
const categoriesRouter = require("./routes/categories");
const bannersRouter = require("./routes/banners");
const ordersRouter = require("./routes/orders");
const authRouter = require("./routes/auth");
const paymentsRouter = require("./routes/payments");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/", apiLimiter);

// Optional: serve static frontend assets so backend can serve the full app in production
const frontendDir = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontendDir));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    appName: "QuickServe API",
    version: "1.0.0",
    database: db.isPostgres ? "PostgreSQL (Cloud/Neon)" : "SQLite (Local)",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/banners", bannersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/auth", authRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);

// 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// For any non-API route, if static frontend exists, serve index.html
app.use((req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error("❌ API Error:", err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
  });
});

// Initialize database and start listening
async function startServer() {
  try {
    await db.initDb();
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
      const existingAdmin = await db.get("SELECT id FROM users WHERE email = ?", [adminEmail]);
      if (!existingAdmin) {
        await db.run(
          "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
          [Date.now(), process.env.ADMIN_NAME || "QuickServe Admin", adminEmail, hashPassword(process.env.ADMIN_PASSWORD), "admin"]
        );
        console.log(`🔐 Admin account provisioned for ${adminEmail}`);
      }
    }
    const server = app.listen(PORT, () => {
      console.log(`🚀 QuickServe Backend API running at http://localhost:${PORT}`);
      console.log(`🔗 Health check available at http://localhost:${PORT}/api/health`);
    });
    return server;
  } catch (err) {
    console.error("Failed to start QuickServe server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
