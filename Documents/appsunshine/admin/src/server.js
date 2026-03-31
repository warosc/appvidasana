'use strict';
require('dotenv').config();
const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const sharp    = require('sharp');
const cors     = require('cors');
const { query, ensureSchema, seedAdmin } = require('./db');

const app    = express();
const SECRET = process.env.JWT_SECRET || 'change_me';
const UPLOADS = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Multer ──────────────────────────────────────────────────────────
fs.mkdirSync(UPLOADS, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('Formato no permitido'), ok);
  },
});

// ── Auth middleware ─────────────────────────────────────────────────
function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    try {
      req.user = jwt.verify(token, SECRET);
      if (roles.length && !roles.includes(req.user.role))
        return res.status(403).json({ error: 'Sin permiso' });
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido' });
    }
  };
}

async function log(userId, userName, action, module, recordId = null, details = null) {
  await query(
    `INSERT INTO audit_logs(user_id, user_name, action, module, record_id, details)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [userId, userName, action, module, recordId, details]
  ).catch(() => {});
}

// ── HEALTH ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── AUTH ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });
  const r = await query('SELECT * FROM admin_users WHERE email=$1 AND status=$2', [email.toLowerCase(), 'active']);
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  await query('UPDATE admin_users SET last_login=NOW() WHERE id=$1', [user.id]);
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', auth(), async (req, res) => {
  const r = await query('SELECT id,name,email,role,status,last_login FROM admin_users WHERE id=$1', [req.user.id]);
  res.json(r.rows[0] || null);
});

// ── DASHBOARD ───────────────────────────────────────────────────────
app.get('/api/dashboard', auth(), async (req, res) => {
  const [totalP, activeP, noStock, todayOrders, monthOrders, recentOrders, topProducts, alerts] =
    await Promise.all([
      query('SELECT COUNT(*) FROM products'),
      query("SELECT COUNT(*) FROM products WHERE status='active'"),
      query("SELECT COUNT(*) FROM products WHERE stock=0 AND status='active'"),
      query("SELECT COUNT(*),COALESCE(SUM(total),0) AS total FROM orders WHERE created_at >= CURRENT_DATE"),
      query("SELECT COUNT(*),COALESCE(SUM(total),0) AS total FROM orders WHERE created_at >= date_trunc('month',NOW())"),
      query("SELECT o.*,(SELECT name FROM admin_users WHERE id=o.id LIMIT 1) FROM orders ORDER BY created_at DESC LIMIT 5"),
      query(`SELECT p.name, COUNT(oi) AS sales FROM products p
             LEFT JOIN orders o ON o.items @> jsonb_build_array(jsonb_build_object('product_id',p.id::text))
             GROUP BY p.id, p.name ORDER BY sales DESC LIMIT 5`),
      query(`SELECT id,name,stock,min_stock FROM products WHERE stock <= min_stock AND status='active' ORDER BY stock LIMIT 10`),
    ]);

  res.json({
    totalProducts:   +totalP.rows[0].count,
    activeProducts:  +activeP.rows[0].count,
    outOfStock:      +noStock.rows[0].count,
    todaySales:      { count: +todayOrders.rows[0].count, total: +todayOrders.rows[0].total },
    monthSales:      { count: +monthOrders.rows[0].count, total: +monthOrders.rows[0].total },
    recentOrders:    recentOrders.rows,
    topProducts:     topProducts.rows,
    lowStockAlerts:  alerts.rows,
  });
});

// ── CATEGORIES ──────────────────────────────────────────────────────
app.get('/api/categories', auth(), async (_req, res) => {
  const r = await query('SELECT * FROM categories ORDER BY sort_order, name');
  res.json(r.rows);
});

app.post('/api/categories', auth(['admin', 'editor']), async (req, res) => {
  const { name, image_url, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const r = await query(
    'INSERT INTO categories(name, image_url, sort_order) VALUES($1,$2,$3) RETURNING *',
    [name, image_url || null, sort_order]
  );
  await log(req.user.id, req.user.name, 'CREATE', 'categories', r.rows[0].id, name);
  res.status(201).json(r.rows[0]);
});

app.put('/api/categories/:id', auth(['admin', 'editor']), async (req, res) => {
  const { name, image_url, status, sort_order } = req.body;
  const r = await query(
    'UPDATE categories SET name=COALESCE($1,name), image_url=COALESCE($2,image_url), status=COALESCE($3,status), sort_order=COALESCE($4,sort_order) WHERE id=$5 RETURNING *',
    [name, image_url, status, sort_order, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  await log(req.user.id, req.user.name, 'UPDATE', 'categories', req.params.id, name);
  res.json(r.rows[0]);
});

app.delete('/api/categories/:id', auth(['admin']), async (req, res) => {
  await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  await log(req.user.id, req.user.name, 'DELETE', 'categories', req.params.id);
  res.json({ ok: true });
});

// ── PRODUCTS ────────────────────────────────────────────────────────
app.get('/api/products', auth(), async (req, res) => {
  const { category, status, search, page = 1, limit = 50 } = req.query;
  let sql = `SELECT p.*, c.name AS category_name FROM products p
             LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (category) { params.push(category); sql += ` AND p.category_id=$${params.length}`; }
  if (status)   { params.push(status);   sql += ` AND p.status=$${params.length}`; }
  if (search)   { params.push(`%${search}%`); sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }
  sql += ` ORDER BY p.updated_at DESC LIMIT ${+limit} OFFSET ${(+page - 1) * +limit}`;
  const r = await query(sql, params);
  res.json(r.rows);
});

app.get('/api/products/:id', auth(), async (req, res) => {
  const [prod, imgs] = await Promise.all([
    query('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=$1', [req.params.id]),
    query('SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order', [req.params.id]),
  ]);
  if (!prod.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ...prod.rows[0], images: imgs.rows });
});

app.post('/api/products', auth(['admin', 'editor']), async (req, res) => {
  const { name, sku, category_id, short_description, full_description, price, sale_price,
          cost_price, stock, min_stock, status, featured, cover_image, tags, weight, whatsapp_link } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!price) return res.status(400).json({ error: 'Falta el precio.' });
  const r = await query(
    `INSERT INTO products(name,sku,category_id,short_description,full_description,price,sale_price,cost_price,
      stock,min_stock,status,featured,cover_image,tags,weight,whatsapp_link,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [name, sku||null, category_id||null, short_description||null, full_description||null,
     price, sale_price||null, cost_price||null, stock||0, min_stock||5,
     status||'draft', featured||false, cover_image||null, tags||null, weight||null, whatsapp_link||null, req.user.id]
  );
  await log(req.user.id, req.user.name, 'CREATE', 'products', r.rows[0].id, name);
  res.status(201).json(r.rows[0]);
});

app.put('/api/products/:id', auth(['admin', 'editor']), async (req, res) => {
  const fields = ['name','sku','category_id','short_description','full_description','price','sale_price',
                  'cost_price','stock','min_stock','status','featured','cover_image','tags','weight','whatsapp_link'];
  const sets = fields.map((f, i) => `${f}=COALESCE($${i+1},${f})`).join(',');
  const vals = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
  vals.push(req.params.id);
  const r = await query(
    `UPDATE products SET ${sets}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  await log(req.user.id, req.user.name, 'UPDATE', 'products', req.params.id, r.rows[0].name);
  res.json(r.rows[0]);
});

app.delete('/api/products/:id', auth(['admin']), async (req, res) => {
  const r = await query('SELECT name FROM products WHERE id=$1', [req.params.id]);
  await query('DELETE FROM products WHERE id=$1', [req.params.id]);
  await log(req.user.id, req.user.name, 'DELETE', 'products', req.params.id, r.rows[0]?.name);
  res.json({ ok: true });
});

app.post('/api/products/:id/duplicate', auth(['admin', 'editor']), async (req, res) => {
  const r = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
  const p = r.rows[0];
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const n = await query(
    `INSERT INTO products(name,category_id,short_description,full_description,price,sale_price,
      cost_price,stock,min_stock,status,featured,tags,weight,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13) RETURNING *`,
    [`${p.name} (copia)`, p.category_id, p.short_description, p.full_description, p.price,
     p.sale_price, p.cost_price, 0, p.min_stock, p.featured, p.tags, p.weight, req.user.id]
  );
  await log(req.user.id, req.user.name, 'DUPLICATE', 'products', n.rows[0].id, p.name);
  res.status(201).json(n.rows[0]);
});

// ── PRODUCT IMAGES ─────────────────────────────────────────────────
app.post('/api/products/:id/images', auth(['admin', 'editor']), async (req, res) => {
  const { image_url, is_cover } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Falta la URL de imagen' });
  const r = await query(
    'INSERT INTO product_images(product_id, image_url, is_cover) VALUES($1,$2,$3) RETURNING *',
    [req.params.id, image_url, is_cover || false]
  );
  if (is_cover) {
    await query('UPDATE products SET cover_image=$1 WHERE id=$2', [image_url, req.params.id]);
  }
  res.status(201).json(r.rows[0]);
});

app.delete('/api/products/:pid/images/:iid', auth(['admin', 'editor']), async (req, res) => {
  await query('DELETE FROM product_images WHERE id=$1 AND product_id=$2', [req.params.iid, req.params.pid]);
  res.json({ ok: true });
});

// ── UPLOAD ──────────────────────────────────────────────────────────
app.post('/api/upload', auth(), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  try {
    const outName  = req.file.filename.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    const outPath  = path.join(UPLOADS, outName);
    await sharp(req.file.path).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(outPath);
    fs.unlinkSync(req.file.path);
    res.json({ url: `/uploads/${outName}` });
  } catch {
    res.json({ url: `/uploads/${req.file.filename}` });
  }
});

// ── INVENTORY ───────────────────────────────────────────────────────
app.get('/api/inventory', auth(), async (req, res) => {
  const r = await query(
    `SELECT p.id, p.name, p.sku, p.stock, p.min_stock, p.status,
       (SELECT json_agg(m ORDER BY m.created_at DESC) FROM inventory_movements m WHERE m.product_id=p.id LIMIT 10) AS movements
     FROM products p ORDER BY p.stock ASC, p.name`
  );
  res.json(r.rows);
});

app.post('/api/inventory/adjust', auth(['admin', 'editor']), async (req, res) => {
  const { product_id, type, quantity, note } = req.body;
  if (!product_id || !type || quantity === undefined)
    return res.status(400).json({ error: 'Faltan datos' });

  const delta = type === 'exit' ? -Math.abs(quantity) : Math.abs(quantity);
  await query('UPDATE products SET stock = GREATEST(0, stock + $1), updated_at=NOW() WHERE id=$2', [delta, product_id]);
  const r = await query(
    'INSERT INTO inventory_movements(product_id, type, quantity, note, user_id) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [product_id, type, quantity, note || null, req.user.id]
  );
  await log(req.user.id, req.user.name, 'INVENTORY_ADJUST', 'inventory', product_id, `${type}: ${quantity}`);
  res.status(201).json(r.rows[0]);
});

// ── ORDERS ──────────────────────────────────────────────────────────
app.get('/api/orders', auth(), async (req, res) => {
  const { status, page = 1 } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
  sql += ` ORDER BY created_at DESC LIMIT 50 OFFSET ${(+page - 1) * 50}`;
  const r = await query(sql, params);
  res.json(r.rows);
});

app.post('/api/orders', auth(), async (req, res) => {
  const { customer_name, customer_phone, customer_email, total, items, notes, source } = req.body;
  const r = await query(
    'INSERT INTO orders(customer_name,customer_phone,customer_email,total,items,notes,source) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [customer_name||null, customer_phone||null, customer_email||null, total||0, JSON.stringify(items||[]), notes||null, source||'whatsapp']
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/orders/:id', auth(['admin', 'editor', 'operator']), async (req, res) => {
  const { status, notes } = req.body;
  const r = await query(
    'UPDATE orders SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING *',
    [status, notes, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  await log(req.user.id, req.user.name, 'ORDER_STATUS', 'orders', req.params.id, status);
  res.json(r.rows[0]);
});

// ── PROMOTIONS ──────────────────────────────────────────────────────
app.get('/api/promotions', auth(), async (_req, res) => {
  const r = await query('SELECT pr.*, p.name AS product_name FROM promotions pr LEFT JOIN products p ON p.id=pr.product_id ORDER BY pr.created_at DESC');
  res.json(r.rows);
});

app.post('/api/promotions', auth(['admin', 'editor']), async (req, res) => {
  const { product_id, label, discount_pct, start_date, end_date } = req.body;
  const r = await query(
    'INSERT INTO promotions(product_id, label, discount_pct, start_date, end_date) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [product_id||null, label||'Oferta', discount_pct||null, start_date||null, end_date||null]
  );
  res.status(201).json(r.rows[0]);
});

app.put('/api/promotions/:id', auth(['admin', 'editor']), async (req, res) => {
  const { label, discount_pct, start_date, end_date, active } = req.body;
  const r = await query(
    'UPDATE promotions SET label=COALESCE($1,label), discount_pct=COALESCE($2,discount_pct), start_date=COALESCE($3,start_date), end_date=COALESCE($4,end_date), active=COALESCE($5,active) WHERE id=$6 RETURNING *',
    [label, discount_pct, start_date, end_date, active, req.params.id]
  );
  res.json(r.rows[0]);
});

app.delete('/api/promotions/:id', auth(['admin']), async (req, res) => {
  await query('DELETE FROM promotions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── REPORTS ─────────────────────────────────────────────────────────
app.get('/api/reports/sales', auth(), async (req, res) => {
  const { period = '30d' } = req.query;
  const interval = period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days';
  const [daily, byStatus, total] = await Promise.all([
    query(`SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
           FROM orders WHERE created_at >= NOW() - INTERVAL '${interval}'
           GROUP BY DATE(created_at) ORDER BY date`),
    query(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status`),
    query(`SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders WHERE created_at >= NOW() - INTERVAL '${interval}'`),
  ]);
  res.json({ daily: daily.rows, byStatus: byStatus.rows, total: total.rows[0] });
});

app.get('/api/reports/products', auth(), async (_req, res) => {
  const r = await query(`
    SELECT p.name, p.stock, p.price, p.status,
           CASE WHEN p.stock=0 THEN 'agotado' WHEN p.stock <= p.min_stock THEN 'bajo' ELSE 'ok' END AS stock_status
    FROM products p ORDER BY p.stock ASC
  `);
  res.json(r.rows);
});

// ── USERS ────────────────────────────────────────────────────────────
app.get('/api/users', auth(['admin']), async (_req, res) => {
  const r = await query('SELECT id,name,email,role,status,last_login,created_at FROM admin_users ORDER BY created_at DESC');
  res.json(r.rows);
});

app.post('/api/users', auth(['admin']), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan datos obligatorios' });
  const hash = await bcrypt.hash(password, 10);
  const r = await query(
    'INSERT INTO admin_users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,status',
    [name, email.toLowerCase(), hash, role || 'editor']
  );
  await log(req.user.id, req.user.name, 'CREATE_USER', 'users', r.rows[0].id, email);
  res.status(201).json(r.rows[0]);
});

app.put('/api/users/:id', auth(['admin']), async (req, res) => {
  const { name, role, status, password } = req.body;
  let hash = null;
  if (password) hash = await bcrypt.hash(password, 10);
  const r = await query(
    `UPDATE admin_users SET name=COALESCE($1,name), role=COALESCE($2,role), status=COALESCE($3,status)${hash ? ', password_hash=$5' : ''} WHERE id=$4 RETURNING id,name,email,role,status`,
    hash ? [name, role, status, req.params.id, hash] : [name, role, status, req.params.id]
  );
  res.json(r.rows[0]);
});

app.delete('/api/users/:id', auth(['admin']), async (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  await query('DELETE FROM admin_users WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── SETTINGS ─────────────────────────────────────────────────────────
app.get('/api/settings', auth(), async (_req, res) => {
  const r = await query('SELECT key, value FROM settings');
  const obj = {};
  r.rows.forEach(row => { obj[row.key] = row.value; });
  res.json(obj);
});

app.put('/api/settings', auth(['admin']), async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await query(
      'INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=NOW()',
      [key, String(value)]
    );
  }
  await log(req.user.id, req.user.name, 'UPDATE', 'settings', null, JSON.stringify(req.body));
  res.json({ ok: true });
});

// ── AUDIT LOGS ───────────────────────────────────────────────────────
app.get('/api/audit', auth(['admin']), async (req, res) => {
  const r = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
  res.json(r.rows);
});

// ── SPA fallback ─────────────────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// ── BOOT ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
  let retries = 10;
  while (retries--) {
    try {
      await ensureSchema();
      await seedAdmin();
      break;
    } catch (e) {
      if (!retries) throw e;
      console.log(`Esperando base de datos... (${retries} intentos)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => {
    console.log(`\n🌿 VSG Admin Panel`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`👤 ${process.env.ADMIN_EMAIL || 'admin@vidasaludable.gt'}\n`);
  });
}

start().catch(err => { console.error(err); process.exit(1); });
