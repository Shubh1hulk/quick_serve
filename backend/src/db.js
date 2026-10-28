const path = require("path");
const fs = require("fs");
const { CATEGORIES, PRODUCTS, BANNERS } = require("./seedData");

let isPostgres = false;
let pgPool = null;
let sqliteDb = null;

const dbUrl = process.env.DATABASE_URL || "";

if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
  isPostgres = true;
  const { Pool } = require("pg");
  const useSsl = process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false };
  pgPool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : useSsl
  });
  console.log("📦 Connected to PostgreSQL database (Production / Cloud)");
} else {
  const Database = require("better-sqlite3");
  const dbDir = path.resolve(__dirname, "../../database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "quickserve.db");
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  console.log(`📦 Connected to SQLite database at ${dbPath}`);
}

// Convert '?' placeholders to '$1, $2, ...' for Postgres
function formatSql(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function query(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(formatSql(sql), params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  }
}

async function get(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(formatSql(sql), params);
    return res.rows[0] || null;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.get(...params) || null;
  }
}

async function run(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(formatSql(sql), params);
    return { changes: res.rowCount, lastInsertRowid: null };
  } else {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

async function initDb() {
  console.log("🛠️ Initializing database tables...");

  const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      name VARCHAR(50) PRIMARY KEY,
      description TEXT,
      count INTEGER DEFAULT 0,
      min_off INTEGER DEFAULT 0
    );
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      brand VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      mrp NUMERIC(10, 2) NOT NULL,
      rating NUMERIC(3, 1) DEFAULT 4.0,
      reviews INTEGER DEFAULT 0,
      emoji VARCHAR(10),
      image VARCHAR(255),
      cut VARCHAR(255),
      hd VARCHAR(255),
      specs TEXT,
      offer TEXT,
      stock INTEGER DEFAULT 50,
      assured BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBannersTable = `
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      kicker VARCHAR(100),
      tagline VARCHAR(255),
      options TEXT,
      depth NUMERIC(4, 2) DEFAULT 0.15,
      display_order INTEGER DEFAULT 0
    );
  `;

  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      customer_name VARCHAR(120) NOT NULL,
      customer_email VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      shipping_address TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL,
      delivery_fee NUMERIC(10, 2) NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cod',
      payment_status VARCHAR(50) DEFAULT 'pending',
      order_status VARCHAR(50) DEFAULT 'confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash VARCHAR(128) PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createOrderEventsTable = `
    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      status VARCHAR(40) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPaymentsTable = `
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64),
      amount NUMERIC(10, 2) NOT NULL,
      method VARCHAR(40) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'created',
      provider VARCHAR(40) NOT NULL DEFAULT 'mock',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createDeliveryLocationsTable = `
    CREATE TABLE IF NOT EXISTS delivery_locations (
      order_id VARCHAR(64) PRIMARY KEY,
      latitude NUMERIC(10, 7) NOT NULL,
      longitude NUMERIC(10, 7) NOT NULL,
      accuracy_m NUMERIC(8, 2),
      speed_kmh NUMERIC(8, 2),
      heading NUMERIC(6, 2),
      eta_minutes INTEGER,
      provider VARCHAR(40) DEFAULT 'manual',
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await run(createCategoriesTable);
  await run(createProductsTable);
  await run(createBannersTable);
  await run(createOrdersTable);
  await run(createUsersTable);
  await run(createSessionsTable);
  await run(createOrderEventsTable);
  await run(createPaymentsTable);
  await run(createDeliveryLocationsTable);

  if (isPostgres) {
    await run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER");
  } else {
    const orderColumns = await query("PRAGMA table_info(orders)");
    if (!orderColumns.some(column => column.name === "user_id")) {
      await run("ALTER TABLE orders ADD COLUMN user_id INTEGER");
    }
  }

  // Check if products need seeding
  const existingProduct = await get("SELECT id FROM products LIMIT 1");
  if (!existingProduct) {
    console.log("🌱 Database is empty. Seeding initial data...");

    for (const cat of CATEGORIES) {
      await run(
        `INSERT INTO categories (name, description, count, min_off) VALUES (?, ?, ?, ?)
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.description, 0, cat.min_off]
      );
    }

    for (const prod of PRODUCTS) {
      await run(
        `INSERT INTO products (id, brand, name, category, price, mrp, rating, reviews, emoji, image, cut, hd, specs, offer, stock, assured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [
          prod.id,
          prod.brand,
          prod.name,
          prod.category,
          prod.price,
          prod.mrp,
          prod.rating,
          prod.reviews,
          prod.emoji,
          prod.image,
          prod.cut,
          prod.hd,
          JSON.stringify(prod.specs || []),
          prod.offer,
          prod.stock,
          prod.assured ? 1 : 0
        ]
      );
    }

    for (const b of BANNERS) {
      await run(
        `INSERT INTO banners (id, product_id, kicker, tagline, options, depth, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [b.id, b.productId, b.kicker, b.tagline, JSON.stringify(b.options || []), b.depth, b.display_order]
      );
    }

    // Update category counts
    for (const cat of CATEGORIES) {
      const row = await get("SELECT COUNT(*) as cnt FROM products WHERE category = ?", [cat.name]);
      const cnt = row ? row.cnt : 0;
      await run("UPDATE categories SET count = ? WHERE name = ?", [cnt, cat.name]);
    }

    console.log("✅ Seed data inserted successfully!");
  } else {
    console.log("✅ Database tables verified.");
  }
}

module.exports = {
  isPostgres,
  query,
  get,
  run,
  initDb
};
