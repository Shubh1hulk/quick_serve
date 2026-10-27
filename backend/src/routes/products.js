const express = require("express");
const router = express.Router();
const db = require("../db");

function parseProduct(p) {
  if (!p) return null;
  return {
    ...p,
    price: Number(p.price),
    mrp: Number(p.mrp),
    rating: Number(p.rating),
    reviews: Number(p.reviews),
    specs: typeof p.specs === "string" ? JSON.parse(p.specs || "[]") : p.specs,
    assured: Boolean(p.assured),
    stock: Number(p.stock)
  };
}

// GET /api/products/featured - curated featured highlights
router.get("/featured", async (req, res, next) => {
  try {
    const all = (await db.query("SELECT * FROM products")).map(parseProduct);
    
    const pctOff = (p) => Math.round((1 - p.price / p.mrp) * 100);
    const used = new Set();
    const pick = (list, badge) => {
      const p = list.find(x => !used.has(x.id));
      if (p) {
        used.add(p.id);
        return { ...p, badge };
      }
      return null;
    };

    const bestSeller = pick([...all].sort((a, b) => b.reviews - a.reviews), "BEST SELLER");
    const topDeal = pick([...all].sort((a, b) => pctOff(b) - pctOff(a)), "TOP DEAL");
    const topRated = pick([...all].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews), "TOP RATED");

    const featured = [bestSeller, topDeal, topRated].filter(Boolean);
    res.json({ success: true, count: featured.length, data: featured });
  } catch (err) {
    next(err);
  }
});

// GET /api/products - search, filter, paginate, sort
router.get("/", async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, minRating, sort, limit = 50, offset = 0 } = req.query;

    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category && category !== "All") {
      sql += " AND category = ?";
      params.push(category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += " AND (LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ? OR LOWER(specs) LIKE ?)";
      params.push(term, term, term, term);
    }

    if (minPrice && !isNaN(minPrice)) {
      sql += " AND price >= ?";
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(maxPrice)) {
      sql += " AND price <= ?";
      params.push(Number(maxPrice));
    }

    if (minRating && !isNaN(minRating)) {
      sql += " AND rating >= ?";
      params.push(Number(minRating));
    }

    // Sorting
    switch (sort) {
      case "low":
        sql += " ORDER BY price ASC";
        break;
      case "high":
        sql += " ORDER BY price DESC";
        break;
      case "rating":
        sql += " ORDER BY rating DESC, reviews DESC";
        break;
      case "discount":
        // (mrp - price) / mrp DESC
        sql += " ORDER BY ((mrp - price) / mrp) DESC";
        break;
      case "featured":
      default:
        sql += " ORDER BY reviews DESC, rating DESC";
        break;
    }

    // Pagination
    sql += " LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const rows = await db.query(sql, params);
    const parsed = rows.map(parseProduct);

    res.json({
      success: true,
      count: parsed.length,
      limit: Number(limit),
      offset: Number(offset),
      data: parsed
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - single product details
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const row = await db.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!row) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: parseProduct(row) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
