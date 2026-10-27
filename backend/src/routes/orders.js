const express = require("express");
const router = express.Router();
const db = require("../db");

const FREE_DELIVERY_THRESHOLD = 499;
const STANDARD_DELIVERY_FEE = 40;

// POST /api/orders - create a new order
router.post("/", async (req, res, next) => {
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
      await db.run("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", [qty, product.id]);
    }

    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    // Generate readable Order ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `QS-${dateStr}-${randomSuffix}`;

    await db.run(
      `INSERT INTO orders (
        id, customer_name, customer_email, customer_phone, shipping_address,
        items, subtotal, delivery_fee, total, payment_method, payment_status, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
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
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - retrieve order details
router.get("/:id", async (req, res, next) => {
  try {
    const order = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

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
        createdAt: order.created_at
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
