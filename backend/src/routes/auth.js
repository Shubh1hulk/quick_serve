const express = require("express");
const db = require("../db");
const { hashPassword, verifyPassword, createSession, authenticate, tokenHash } = require("../auth");

const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ success: false, message: "Name is required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Valid email is required" });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    if (await db.get("SELECT id FROM users WHERE email = ?", [email])) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const id = Date.now();
    await db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)", [id, name, email, hashPassword(password), "customer"]);
    const user = { id, name, email, role: "customer" };
    res.status(201).json({ success: true, data: { user, token: await createSession(id) } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await db.get("SELECT id, name, email, role, password_hash FROM users WHERE email = ?", [email]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    res.json({ success: true, data: { user: publicUser(user), token: await createSession(user.id) } });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: "Name is required" });
    await db.run("UPDATE users SET name = ? WHERE id = ?", [name, req.user.id]);
    res.json({ success: true, data: { user: { ...req.user, name } } });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await db.run("DELETE FROM sessions WHERE token_hash = ?", [tokenHash(req.authToken)]);
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
