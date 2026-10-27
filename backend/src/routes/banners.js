const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/banners - list hero banners with joined product information
router.get("/", async (req, res, next) => {
  try {
    const banners = await db.query(`
      SELECT 
        b.id,
        b.product_id as "productId",
        b.kicker,
        b.tagline,
        b.options,
        b.depth,
        b.display_order,
        p.brand,
        p.name,
        p.category,
        p.price,
        p.mrp,
        p.rating,
        p.reviews,
        p.emoji,
        p.image,
        p.cut,
        p.hd,
        p.specs,
        p.offer,
        p.assured
      FROM banners b
      JOIN products p ON b.product_id = p.id
      ORDER BY b.display_order ASC
    `);

    const formatted = banners.map(b => ({
      ...b,
      options: typeof b.options === "string" ? JSON.parse(b.options || "[]") : b.options,
      specs: typeof b.specs === "string" ? JSON.parse(b.specs || "[]") : b.specs,
      assured: Boolean(b.assured)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
