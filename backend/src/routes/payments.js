const crypto = require("crypto");
const express = require("express");
const db = require("../db");

const router = express.Router();
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new (require("razorpay"))({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

router.post("/intent", async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || "card");
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "A valid amount is required" });
    if (!["card", "upi", "netbanking"].includes(method)) return res.status(400).json({ success: false, message: "Unsupported payment method" });

    const paymentId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const provider = razorpay ? "razorpay" : "mock";
    let providerOrder = null;
    if (razorpay) {
      providerOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: process.env.RAZORPAY_CURRENCY || "INR",
        receipt: paymentId
      });
    }
    await db.run("INSERT INTO payments (id, amount, method, status, provider) VALUES (?, ?, ?, ?, ?)", [paymentId, amount, method, "created", provider]);
    res.status(201).json({
      success: true,
      data: {
        paymentId,
        amount,
        method,
        status: "created",
        provider,
        providerOrderId: providerOrder?.id || null,
        publicKey: razorpay ? process.env.RAZORPAY_KEY_ID : null,
        currency: process.env.RAZORPAY_CURRENCY || "INR"
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/confirm", async (req, res, next) => {
  try {
    const payment = await db.get("SELECT * FROM payments WHERE id = ?", [req.params.id]);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.status !== "created") return res.json({ success: true, data: payment });
    if (payment.provider === "razorpay") {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, message: "Razorpay payment details are required" });
      }
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, message: "Payment signature verification failed" });
      }
    }
    await db.run("UPDATE payments SET status = ? WHERE id = ?", ["paid", payment.id]);
    res.json({ success: true, data: { ...payment, status: "paid" } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
