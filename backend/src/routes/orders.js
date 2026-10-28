const express = require("express");
const router = express.Router();
const db = require("../db");
const { optionalAuthenticate } = require("../auth");
const { authenticate } = require("../auth");

const FREE_DELIVERY_THRESHOLD = 499;
const STANDARD_DELIVERY_FEE = 40;

// POST /api/orders - create a new order
router.post("/", optionalAuthenticate, async (req, res, next) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod = "cod"
    } = req.body;

    // Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }
    if (!customerEmail || !customerEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }
    if (!customerPhone || customerPhone.trim().length < 8) {
      return res.status(400).json({ success: false, message: "Valid phone number is required" });
    }
    if (!shippingAddress || shippingAddress.trim().length < 5) {
      return res.status(400).json({ success: false, message: "Complete shipping address is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item" });
    }

    // Verify each item against database
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const prodId = Number(item.id);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));

      const product = await db.get("SELECT id, name, brand, price, stock, image, cut FROM products WHERE id = ?", [prodId]);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product ID ${prodId} does not exist.` });
      }

      const itemPrice = Number(product.price);
      const itemTotal = itemPrice * qty;
      subtotal += itemTotal;

      orderItems.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: itemPrice,
        qty: qty,
        image: product.cut || product.image,
        total: itemTotal
      });

      // Update stock
      await db.run("UPDATE products SET stock = CASE WHEN stock - ? < 0 THEN 0 ELSE stock - ? END WHERE id = ?", [qty, qty, product.id]);
    }

    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    // Generate readable Order ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `QS-${dateStr}-${randomSuffix}`;

    await db.run(
      `INSERT INTO orders (
        id, user_id, customer_name, customer_email, customer_phone, shipping_address,
        items, subtotal, delivery_fee, total, payment_method, payment_status, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        req.user?.id || null,
        customerName.trim(),
        customerEmail.trim().toLowerCase(),
        customerPhone.trim(),
        shippingAddress.trim(),
        JSON.stringify(orderItems),
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        paymentMethod === "cod" ? "pending_cod" : "paid_mock",
        "confirmed"
      ]
    );
    await db.run("INSERT INTO order_events (id, order_id, status, note) VALUES (?, ?, ?, ?)", [Date.now(), orderId, "confirmed", "Order placed"]);

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: {
        orderId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        items: orderItems,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        orderStatus: "confirmed",
        estimatedDelivery: "3-5 business days",
        createdAt: new Date().toISOString(),
        tracking: [{ status: "confirmed", note: "Order placed", createdAt: new Date().toISOString() }]
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - retrieve order details
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const orders = await db.query(
      "SELECT id, customer_name, total, payment_method, payment_status, order_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [req.user.id, Math.min(100, Number(req.query.limit) || 50)]
    );
    res.json({ success: true, count: orders.length, data: orders.map(order => ({
      orderId: order.id,
      customerName: order.customer_name,
      total: Number(order.total),
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      createdAt: order.created_at
    })) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const order = await db.get("SELECT id, order_status FROM orders WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!["confirmed", "processing"].includes(order.order_status)) {
      return res.status(409).json({ success: false, message: "This order can no longer be cancelled" });
    }
    await db.run("UPDATE orders SET order_status = ? WHERE id = ?", ["cancelled", order.id]);
    await db.run("INSERT INTO order_events (id, order_id, status, note) VALUES (?, ?, ?, ?)", [Date.now(), order.id, "cancelled", "Cancelled by customer"]);
    res.json({ success: true, data: { orderId: order.id, orderStatus: "cancelled" } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const order = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const events = await db.query("SELECT status, note, created_at FROM order_events WHERE order_id = ? ORDER BY created_at ASC", [order.id]);
    const liveLocation = await db.get("SELECT * FROM delivery_locations WHERE order_id = ?", [order.id]);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        items: JSON.parse(order.items || "[]"),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        createdAt: order.created_at,
        tracking: events.map(event => ({ status: event.status, note: event.note, createdAt: event.created_at })),
        liveLocation: liveLocation ? {
          latitude: Number(liveLocation.latitude),
          longitude: Number(liveLocation.longitude),
          accuracyM: liveLocation.accuracy_m == null ? null : Number(liveLocation.accuracy_m),
          speedKmh: liveLocation.speed_kmh == null ? null : Number(liveLocation.speed_kmh),
          heading: liveLocation.heading == null ? null : Number(liveLocation.heading),
          etaMinutes: liveLocation.eta_minutes == null ? null : Number(liveLocation.eta_minutes),
          provider: liveLocation.provider,
          recordedAt: liveLocation.recorded_at
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/live - latest courier location
router.get("/:id/live", async (req, res, next) => {
  try {
    const order = await db.get("SELECT id, order_status FROM orders WHERE id = ?", [req.params.id]);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const location = await db.get("SELECT * FROM delivery_locations WHERE order_id = ?", [order.id]);
    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderStatus: order.order_status,
        available: Boolean(location),
        location: location ? {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          accuracyM: location.accuracy_m == null ? null : Number(location.accuracy_m),
          speedKmh: location.speed_kmh == null ? null : Number(location.speed_kmh),
          heading: location.heading == null ? null : Number(location.heading),
          etaMinutes: location.eta_minutes == null ? null : Number(location.eta_minutes),
          provider: location.provider,
          recordedAt: location.recorded_at
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders - list recent orders
router.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const orders = await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", [limit]);
    
    const formatted = orders.map(o => ({
      orderId: o.id,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      total: Number(o.total),
      paymentMethod: o.payment_method,
      orderStatus: o.order_status,
      createdAt: o.created_at
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
