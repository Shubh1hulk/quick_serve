-- QuickServe Database Schema
-- Compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS categories (
  name VARCHAR(50) PRIMARY KEY,
  description TEXT,
  count INTEGER DEFAULT 0,
  min_off INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL REFERENCES categories(name) ON UPDATE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2) NOT NULL,
  rating NUMERIC(3, 1) DEFAULT 4.0,
  reviews INTEGER DEFAULT 0,
  emoji VARCHAR(10),
  image VARCHAR(255),
  cut VARCHAR(255),
  hd VARCHAR(255),
  specs TEXT, -- JSON array of strings
  offer TEXT,
  stock INTEGER DEFAULT 50,
  assured BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  kicker VARCHAR(100),
  tagline VARCHAR(255),
  options TEXT, -- JSON array of string options
  depth NUMERIC(4, 2) DEFAULT 0.15,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  shipping_address TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array of items {id, name, price, qty}
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cod',
  payment_status VARCHAR(50) DEFAULT 'pending',
  order_status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
