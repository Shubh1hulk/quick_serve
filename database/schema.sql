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
  user_id INTEGER,
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

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(128) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  status VARCHAR(40) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64),
  amount NUMERIC(10, 2) NOT NULL,
  method VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  provider VARCHAR(40) NOT NULL DEFAULT 'mock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
