'use strict';
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',  -- admin | editor | operator
      status TEXT NOT NULL DEFAULT 'active',
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      short_description TEXT,
      full_description TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      sale_price NUMERIC(10,2),
      cost_price NUMERIC(10,2),
      stock INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'draft',  -- active | draft | out_of_stock
      featured BOOLEAN DEFAULT FALSE,
      cover_image TEXT,
      tags TEXT,
      weight TEXT,
      whatsapp_link TEXT,
      created_by INT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      is_cover BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL,  -- entry | exit | adjustment
      quantity INT NOT NULL,
      note TEXT,
      user_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      status TEXT NOT NULL DEFAULT 'new',  -- new | confirmed | preparing | shipped | delivered | cancelled
      total NUMERIC(10,2) DEFAULT 0,
      items JSONB DEFAULT '[]',
      notes TEXT,
      source TEXT DEFAULT 'whatsapp',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(id) ON DELETE CASCADE,
      label TEXT DEFAULT 'Oferta',
      discount_pct INT,
      start_date DATE,
      end_date DATE,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed default settings
  const defaults = [
    ['business_name', 'Vida Saludable Guatemala'],
    ['whatsapp', '50245187707'],
    ['address', 'Ciudad de Guatemala, Guatemala'],
    ['payment_methods', 'Transferencia, Efectivo, Tarjeta'],
    ['purchase_message', 'Gracias por tu pedido. Te contactamos en breve.'],
    ['low_stock_alert', '5'],
  ];
  for (const [key, value] of defaults) {
    await query(
      `INSERT INTO settings(key, value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING`,
      [key, value]
    );
  }

  // Seed default categories
  const cats = ['Bajar de Peso', 'Energía', 'Digestión', 'Vitaminas'];
  for (let i = 0; i < cats.length; i++) {
    await query(
      `INSERT INTO categories(name, sort_order, status) VALUES($1,$2,'active') ON CONFLICT DO NOTHING`,
      [cats[i], i + 1]
    );
  }
}

async function seedAdmin() {
  const bcrypt = require('bcryptjs');
  const email = process.env.ADMIN_EMAIL || 'admin@vidasaludable.gt';
  const password = process.env.ADMIN_PASSWORD || 'Admin2025!';
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO admin_users(name, email, password_hash, role)
     VALUES('Administrador', $1, $2, 'admin')
     ON CONFLICT(email) DO NOTHING`,
    [email, hash]
  );
}

module.exports = { query, ensureSchema, seedAdmin };
