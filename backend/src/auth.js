const crypto = require("crypto");
const db = require("./db");

const SESSION_DAYS = 7;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [tokenHash(token), userId, expiresAt]);
  return token;
}

async function authenticate(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });

    const session = await db.get(
      `SELECT users.id, users.name, users.email, users.role
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP`,
      [tokenHash(token)]
    );
    if (!session) return res.status(401).json({ success: false, message: "Session expired or invalid" });
    req.user = session;
    req.authToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token) {
      req.user = await db.get(
        `SELECT users.id, users.name, users.email, users.role
         FROM sessions JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash(token)]
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { hashPassword, verifyPassword, createSession, tokenHash, authenticate, optionalAuthenticate, requireRole };
