const express = require("express");
const db = require("../db");
const { authenticate, requireRole } = require("../auth");

const router = express.Router();
router.use(authenticate, requireRole("admin"));

router.get("/summary", async (req, res, next) => {
  try {
    const [orders, products, customers, revenue] = await Promise.all([
      db.get("SELECT COUNT(*) AS count FROM orders"),
      db.get("SELECT COUNT(*) AS count FROM products"),
      db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'"),
      db.get("SELECT COALESCE(SUM(total), 0) AS total FROM orders")
    ]);
    res.json({ success: true, data: { orders: Number(orders.count), products: Number(products.count), customers: Number(customers.count), revenue: Number(revenue.total) } });
  } catch (err) {
    next(err);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const orders = await db.query("SELECT id, customer_name, customer_email, total, payment_status, order_status, created_at FROM orders ORDER BY created_at DESC LIMIT ?", [Math.min(100, Number(req.query.limit) || 50)]);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await db.query("SELECT id, brand, name, category, price, stock, assured FROM products ORDER BY id ASC LIMIT ?", [Math.min(200, Number(req.query.limit) || 100)]);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.patch("/products/:id/stock", async (req, res, next) => {
  try {
    const stock = Math.floor(Number(req.body.stock));
    if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ success: false, message: "Stock must be a non-negative whole number" });
    const result = await db.run("UPDATE products SET stock = ? WHERE id = ?", [stock, req.params.id]);
    if (!result.changes) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: { productId: Number(req.params.id), stock } });
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    const allowed = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid order status" });
    const order = await db.get("SELECT id FROM orders WHERE id = ?", [req.params.id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    await db.run("UPDATE orders SET order_status = ? WHERE id = ?", [status, req.params.id]);
    await db.run("INSERT INTO order_events (id, order_id, status, note) VALUES (?, ?, ?, ?)", [Date.now(), req.params.id, status, req.body.note || null]);
    res.json({ success: true, data: { orderId: req.params.id, status } });
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:id/location", async (req, res, next) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracyM = req.body.accuracyM == null ? null : Number(req.body.accuracyM);
    const speedKmh = req.body.speedKmh == null ? null : Number(req.body.speedKmh);
    const heading = req.body.heading == null ? null : Number(req.body.heading);
    const etaMinutes = req.body.etaMinutes == null ? null : Math.max(0, Math.round(Number(req.body.etaMinutes)));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
    }
    const order = await db.get("SELECT id FROM orders WHERE id = ?", [req.params.id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    await db.run(
      `INSERT INTO delivery_locations (order_id, latitude, longitude, accuracy_m, speed_kmh, heading, eta_minutes, provider, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (order_id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude,
       accuracy_m = excluded.accuracy_m, speed_kmh = excluded.speed_kmh, heading = excluded.heading,
       eta_minutes = excluded.eta_minutes, provider = excluded.provider, recorded_at = CURRENT_TIMESTAMP`,
      [req.params.id, latitude, longitude, accuracyM, speedKmh, heading, etaMinutes, req.body.provider || "manual"]
    );
    res.json({ success: true, data: { orderId: req.params.id, latitude, longitude, accuracyM, speedKmh, heading, etaMinutes, provider: req.body.provider || "manual" } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
