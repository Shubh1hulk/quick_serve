const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/categories - list all categories with metadata and cover image
router.get("/", async (req, res, next) => {
  try {
    const categories = await db.query("SELECT * FROM categories ORDER BY name ASC");
    
    // Enrich with cover product if needed
    const result = await Promise.all(
      categories.map(async (cat) => {
        const cover = await db.get(
          "SELECT id, brand, name, image, cut, emoji, reviews FROM products WHERE category = ? ORDER BY reviews DESC LIMIT 1",
          [cat.name]
        );
        return {
          name: cat.name,
          desc: cat.description,
          count: cat.count,
          minOff: cat.min_off,
          cover
        };
      })
    );

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
