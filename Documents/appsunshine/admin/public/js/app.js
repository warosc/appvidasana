'use strict';

/* ═══════════════════════════════════════════════════════
   CONFIG & STATE
═══════════════════════════════════════════════════════ */
const API = '/api';
let TOKEN = localStorage.getItem('vsg_admin_token') || null;
let ME    = JSON.parse(localStorage.getItem('vsg_admin_me') || 'null');

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  if (opts.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { doLogout(); return null; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
  return data;
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.className = 'toast toast-' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

function fmtCurrency(n) { return 'Q ' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-GT') : '—'; }
function fmtDatetime(d) { return d ? new Date(d).toLocaleString('es-GT') : '—'; }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function statusBadge(s) {
  const map = {
    active:'badge-green', draft:'badge-gray', out_of_stock:'badge-red',
    new:'badge-blue', confirmed:'badge-green', preparing:'badge-yellow',
    shipped:'badge-purple', delivered:'badge-green', cancelled:'badge-red',
    admin:'badge-purple', editor:'badge-green', operator:'badge-blue',
  };
  return `<span class="badge ${map[s]||'badge-gray'}">${esc(s)}</span>`;
}

function openModal(title, bodyHTML, wide = false) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalBox').className = 'modal-box' + (wide ? ' modal-wide' : '');
  document.getElementById('modalBg').style.display = 'block';
  document.getElementById('modalBox').style.display = 'block';
}
function closeModal() {
  document.getElementById('modalBg').style.display = 'none';
  document.getElementById('modalBox').style.display = 'none';
}

function confirmDialog(msg, onOk) {
  openModal('Confirmar', `
    <div style="padding:1rem 0">
      <p style="margin-bottom:1.5rem">${esc(msg)}</p>
      <div style="display:flex;gap:.75rem;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-red" id="confirmOkBtn">Eliminar</button>
      </div>
    </div>`);
  document.getElementById('confirmOkBtn').onclick = () => { closeModal(); onOk(); };
}

function paginationHTML(page, total, perPage, onPage) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return '';
  let h = '<div class="pagination">';
  for (let i = 1; i <= pages; i++) {
    h += `<button class="page-btn${i===page?' active':''}" onclick="${onPage}(${i})">${i}</button>`;
  }
  return h + '</div>';
}

/* ═══════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════ */
async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Verificando…';
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPass').value,
      }),
    });
    if (!data) return;
    TOKEN = data.token; ME = data.user;
    localStorage.setItem('vsg_admin_token', TOKEN);
    localStorage.setItem('vsg_admin_me', JSON.stringify(ME));
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Ingresar al panel';
  }
}

function doLogout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('vsg_admin_token');
  localStorage.removeItem('vsg_admin_me');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

/* ═══════════════════════════════════════════════════════
   APP SHELL
═══════════════════════════════════════════════════════ */
function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  document.getElementById('sidebarUserName').textContent = ME?.name || '';

  // Hide admin-only items for non-admins
  if (ME?.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }

  // Handle hash routing
  window.addEventListener('hashchange', routeHash);
  routeHash();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function routeHash() {
  const view = (location.hash || '#dashboard').replace('#', '');
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });
  loadView(view);
}

const VIEW_TITLES = {
  dashboard:'Dashboard', products:'Productos', categories:'Categorías',
  inventory:'Inventario', orders:'Pedidos', promotions:'Promociones',
  reports:'Reportes', users:'Usuarios', settings:'Configuración', audit:'Historial',
};

async function loadView(view) {
  document.getElementById('topbarTitle').textContent = VIEW_TITLES[view] || view;
  document.getElementById('topbarActions').innerHTML = '';
  const container = document.getElementById('viewContainer');
  container.innerHTML = '<div class="loading-state">Cargando…</div>';
  const views = { dashboard, products, categories, inventory, orders, promotions, reports, users, settings, audit };
  if (views[view]) await views[view](container);
  else container.innerHTML = '<div class="empty-state">Vista no encontrada.</div>';

  // Close sidebar on mobile after navigation
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD VIEW
═══════════════════════════════════════════════════════ */
async function dashboard(container) {
  const data = await apiFetch('/dashboard');
  if (!data) return;
  const { totalProducts, activeProducts, todaySales, monthSales, recentOrders, topProducts, lowStockAlerts } = data;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e8f5e9">📦</div>
        <div class="stat-info">
          <div class="stat-value">${totalProducts}</div>
          <div class="stat-label">Productos totales</div>
          <div class="stat-sub">${activeProducts} activos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff8e1">💰</div>
        <div class="stat-info">
          <div class="stat-value">${fmtCurrency(todaySales)}</div>
          <div class="stat-label">Ventas hoy</div>
          <div class="stat-sub">Pedidos entregados</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#e3f2fd">📈</div>
        <div class="stat-info">
          <div class="stat-value">${fmtCurrency(monthSales)}</div>
          <div class="stat-label">Ventas del mes</div>
          <div class="stat-sub">${new Date().toLocaleString('es-GT',{month:'long'})}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce4ec">⚠️</div>
        <div class="stat-info">
          <div class="stat-value">${lowStockAlerts.length}</div>
          <div class="stat-label">Stock bajo</div>
          <div class="stat-sub">Requieren atención</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3>Pedidos recientes</h3></div>
        <table class="table">
          <thead><tr><th>#</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead>
          <tbody>
            ${recentOrders.length ? recentOrders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${esc(o.customer_name||'—')}</td>
                <td>${statusBadge(o.status)}</td>
                <td>${fmtCurrency(o.total)}</td>
                <td>${fmtDate(o.created_at)}</td>
              </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Sin pedidos</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><h3>Productos más vendidos</h3></div>
        <div class="bar-chart">
          ${topProducts.length ? topProducts.map(p => `
            <div class="bar-row">
              <span class="bar-label">${esc(p.name)}</span>
              <div class="bar-wrap">
                <div class="bar-fill" style="width:${Math.min(100, (p.sold/topProducts[0].sold)*100)}%"></div>
              </div>
              <span class="bar-val">${p.sold} uds</span>
            </div>`).join('') : '<p class="empty-state">Sin datos</p>'}
        </div>
      </div>

      ${lowStockAlerts.length ? `
      <div class="card">
        <div class="card-header"><h3>Alertas de stock bajo</h3></div>
        <table class="table">
          <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
          <tbody>
            ${lowStockAlerts.map(p => `
              <tr>
                <td>${esc(p.name)}</td>
                <td><span class="badge badge-red">${p.stock}</span></td>
                <td>${p.min_stock}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   PRODUCTS VIEW
═══════════════════════════════════════════════════════ */
let prodPage = 1, prodSearch = '', prodStatus = '', prodCat = '';
async function products(container) {
  const [cats] = await Promise.all([apiFetch('/categories')]);
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-green" onclick="openProductForm()">+ Nuevo producto</button>`;

  container.innerHTML = `
    <div class="filters-bar">
      <input class="form-control search-input" placeholder="Buscar producto…" id="prodSearchInput" value="${esc(prodSearch)}" oninput="prodSearch=this.value;prodPage=1;reloadProducts()">
      <select class="form-control" id="prodStatusSel" onchange="prodStatus=this.value;prodPage=1;reloadProducts()">
        <option value="">Todos los estados</option>
        <option value="active" ${prodStatus==='active'?'selected':''}>Activo</option>
        <option value="draft" ${prodStatus==='draft'?'selected':''}>Borrador</option>
        <option value="out_of_stock" ${prodStatus==='out_of_stock'?'selected':''}>Sin stock</option>
      </select>
      <select class="form-control" id="prodCatSel" onchange="prodCat=this.value;prodPage=1;reloadProducts()">
        <option value="">Todas las categorías</option>
        ${(cats||[]).map(c=>`<option value="${c.id}" ${prodCat==c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div id="prodTable"></div>`;

  await reloadProducts();
}

async function reloadProducts() {
  const params = new URLSearchParams({ page: prodPage, limit: 15 });
  if (prodSearch) params.set('search', prodSearch);
  if (prodStatus) params.set('status', prodStatus);
  if (prodCat)    params.set('category', prodCat);
  const data = await apiFetch('/products?' + params);
  if (!data) return;
  const { rows, total } = data;
  const container = document.getElementById('prodTable');
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <table class="table table-hover">
        <thead><tr><th>Imagen</th><th>Nombre / SKU</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(p => `
            <tr>
              <td><img class="thumb" src="${p.cover_image||'/img/placeholder.png'}" alt="" onerror="this.src='/img/placeholder.png'"></td>
              <td>
                <strong>${esc(p.name)}</strong><br>
                <small class="text-muted">${p.sku?'SKU: '+esc(p.sku):''}</small>
              </td>
              <td>${esc(p.category_name||'—')}</td>
              <td>
                ${p.sale_price ? `<del class="text-muted">${fmtCurrency(p.price)}</del><br><strong>${fmtCurrency(p.sale_price)}</strong>` : fmtCurrency(p.price)}
              </td>
              <td><span class="badge ${p.stock<=p.min_stock?'badge-red':'badge-green'}">${p.stock}</span></td>
              <td>${statusBadge(p.status)}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-ghost" onclick="openProductForm(${p.id})" title="Editar">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="openProductImages(${p.id})" title="Imágenes">🖼️</button>
                <button class="btn btn-sm btn-ghost" onclick="duplicateProduct(${p.id})" title="Duplicar">📋</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteProduct(${p.id},'${esc(p.name)}')" title="Eliminar">🗑️</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="7" class="empty-state">Sin productos</td></tr>'}
        </tbody>
      </table>
      ${paginationHTML(prodPage, total, 15, 'goToProdPage')}
    </div>`;
}
window.goToProdPage = (n) => { prodPage = n; reloadProducts(); };

async function openProductForm(id) {
  const [cats, prod] = await Promise.all([
    apiFetch('/categories'),
    id ? apiFetch('/products/' + id) : Promise.resolve(null),
  ]);
  const p = prod || {};
  openModal(id ? 'Editar producto' : 'Nuevo producto', `
    <form id="prodForm" onsubmit="saveProduct(event, ${id||'null'})">
      <div class="form-grid-2">
        <label class="form-label">Nombre *
          <input class="form-control" name="name" value="${esc(p.name||'')}" required>
        </label>
        <label class="form-label">SKU
          <input class="form-control" name="sku" value="${esc(p.sku||'')}">
        </label>
        <label class="form-label">Categoría
          <select class="form-control" name="category_id">
            <option value="">Sin categoría</option>
            ${(cats||[]).map(c=>`<option value="${c.id}" ${p.category_id==c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </label>
        <label class="form-label">Estado
          <select class="form-control" name="status">
            <option value="draft" ${p.status==='draft'?'selected':''}>Borrador</option>
            <option value="active" ${p.status==='active'?'selected':''}>Activo</option>
            <option value="out_of_stock" ${p.status==='out_of_stock'?'selected':''}>Sin stock</option>
          </select>
        </label>
        <label class="form-label">Precio (Q) *
          <input class="form-control" type="number" step="0.01" name="price" value="${p.price||''}" required>
        </label>
        <label class="form-label">Precio oferta (Q)
          <input class="form-control" type="number" step="0.01" name="sale_price" value="${p.sale_price||''}">
        </label>
        <label class="form-label">Precio costo (Q)
          <input class="form-control" type="number" step="0.01" name="cost_price" value="${p.cost_price||''}">
        </label>
        <label class="form-label">Stock
          <input class="form-control" type="number" name="stock" value="${p.stock||0}">
        </label>
        <label class="form-label">Stock mínimo
          <input class="form-control" type="number" name="min_stock" value="${p.min_stock||5}">
        </label>
        <label class="form-label">Peso
          <input class="form-control" name="weight" value="${esc(p.weight||'')}">
        </label>
        <label class="form-label">Etiquetas
          <input class="form-control" name="tags" value="${esc(p.tags||'')}" placeholder="tag1,tag2">
        </label>
        <label class="form-label">Link de WhatsApp
          <input class="form-control" name="whatsapp_link" value="${esc(p.whatsapp_link||'')}">
        </label>
      </div>
      <label class="form-label">Descripción corta
        <textarea class="form-control" name="short_description" rows="2">${esc(p.short_description||'')}</textarea>
      </label>
      <label class="form-label">Descripción completa
        <textarea class="form-control" name="full_description" rows="4">${esc(p.full_description||'')}</textarea>
      </label>
      <label class="form-label">Imagen de portada (URL o subir)
        <div class="upload-zone" id="coverUploadZone" onclick="triggerCoverUpload()">
          ${p.cover_image ? `<img src="${esc(p.cover_image)}" style="max-height:80px;border-radius:6px">` : '📷 Clic para subir imagen de portada'}
        </div>
        <input type="file" id="coverFileInput" accept="image/*" style="display:none" onchange="uploadCoverImage(this)">
        <input class="form-control" name="cover_image" id="coverImageUrl" value="${esc(p.cover_image||'')}" placeholder="O pega URL de imagen" style="margin-top:.5rem">
      </label>
      <label class="form-label" style="display:flex;align-items:center;gap:.75rem;margin-top:.5rem">
        <input type="checkbox" name="featured" ${p.featured?'checked':''} style="width:auto"> Producto destacado
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Guardar producto</button>
      </div>
    </form>`, true);
}

function triggerCoverUpload() { document.getElementById('coverFileInput').click(); }
async function uploadCoverImage(input) {
  if (!input.files[0]) return;
  const fd = new FormData(); fd.append('file', input.files[0]);
  try {
    const res = await apiFetch('/upload', { method: 'POST', body: fd });
    document.getElementById('coverImageUrl').value = res.url;
    document.getElementById('coverUploadZone').innerHTML = `<img src="${res.url}" style="max-height:80px;border-radius:6px">`;
  } catch(e) { toast(e.message, 'error'); }
}

async function saveProduct(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  body.featured = e.target.querySelector('[name="featured"]').checked;
  try {
    if (id) {
      await apiFetch('/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
      toast('Producto actualizado');
    } else {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
      toast('Producto creado');
    }
    closeModal();
    reloadProducts();
  } catch(err) { toast(err.message, 'error'); }
}

async function duplicateProduct(id) {
  try {
    await apiFetch('/products/' + id + '/duplicate', { method: 'POST' });
    toast('Producto duplicado'); reloadProducts();
  } catch(e) { toast(e.message, 'error'); }
}

function deleteProduct(id, name) {
  confirmDialog(`¿Eliminar el producto "${name}"?`, async () => {
    try {
      await apiFetch('/products/' + id, { method: 'DELETE' });
      toast('Producto eliminado'); reloadProducts();
    } catch(e) { toast(e.message, 'error'); }
  });
}

async function openProductImages(productId) {
  const data = await apiFetch('/products/' + productId + '/images');
  const imgs = data || [];
  openModal('Galería de imágenes', `
    <div id="imgGallery" style="display:flex;flex-wrap:wrap;gap:.75rem;padding:.5rem 0">
      ${imgs.map(img => `
        <div class="img-thumb-wrap" id="img-${img.id}">
          <img src="${esc(img.image_url)}" style="width:90px;height:90px;object-fit:cover;border-radius:6px">
          <button class="img-del-btn" onclick="deleteProductImage(${img.id},${productId})" title="Eliminar">✕</button>
        </div>`).join('')}
    </div>
    <div class="upload-zone" onclick="document.getElementById('galleryFileInput').click()">
      + Agregar imagen
    </div>
    <input type="file" id="galleryFileInput" accept="image/*" multiple style="display:none" onchange="uploadGalleryImages(this,${productId})">
  `);
}

async function uploadGalleryImages(input, productId) {
  for (const file of input.files) {
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await apiFetch('/upload', { method: 'POST', body: fd });
      await apiFetch('/products/' + productId + '/images', { method: 'POST', body: JSON.stringify({ image_url: res.url }) });
    } catch(e) { toast(e.message, 'error'); }
  }
  openProductImages(productId);
}

async function deleteProductImage(imgId, productId) {
  try {
    await apiFetch('/products/' + productId + '/images/' + imgId, { method: 'DELETE' });
    document.getElementById('img-' + imgId)?.remove();
    toast('Imagen eliminada');
  } catch(e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════
   CATEGORIES VIEW
═══════════════════════════════════════════════════════ */
async function categories(container) {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-green" onclick="openCategoryForm()">+ Nueva categoría</button>`;
  await reloadCategories(container);
}

async function reloadCategories(container) {
  const data = await apiFetch('/categories');
  const c = document.getElementById('catTable') || container;
  if (!c) return;
  const html = `
    <div class="card" id="catTable">
      <table class="table table-hover">
        <thead><tr><th>Imagen</th><th>Nombre</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${(data||[]).length ? (data||[]).map(cat => `
            <tr>
              <td>${cat.image_url ? `<img class="thumb" src="${esc(cat.image_url)}" alt="">` : '<span style="opacity:.3">Sin imagen</span>'}</td>
              <td>${esc(cat.name)}</td>
              <td>${cat.sort_order}</td>
              <td>${statusBadge(cat.status)}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-ghost" onclick="openCategoryForm(${cat.id})">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteCategory(${cat.id},'${esc(cat.name)}')">🗑️</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Sin categorías</td></tr>'}
        </tbody>
      </table>
    </div>`;
  if (document.getElementById('catTable')) {
    document.getElementById('catTable').outerHTML = html;
  } else {
    container.innerHTML = html;
  }
}

async function openCategoryForm(id) {
  const cat = id ? await apiFetch('/categories/' + id) : {};
  openModal(id ? 'Editar categoría' : 'Nueva categoría', `
    <form id="catForm" onsubmit="saveCategory(event,${id||'null'})">
      <label class="form-label">Nombre *
        <input class="form-control" name="name" value="${esc((cat||{}).name||'')}" required>
      </label>
      <label class="form-label">URL de imagen
        <input class="form-control" name="image_url" value="${esc((cat||{}).image_url||'')}">
      </label>
      <label class="form-label">Orden
        <input class="form-control" type="number" name="sort_order" value="${(cat||{}).sort_order||0}">
      </label>
      <label class="form-label">Estado
        <select class="form-control" name="status">
          <option value="active" ${(cat||{}).status==='active'?'selected':''}>Activo</option>
          <option value="inactive" ${(cat||{}).status==='inactive'?'selected':''}>Inactivo</option>
        </select>
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Guardar</button>
      </div>
    </form>`);
}

async function saveCategory(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await apiFetch('/categories/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else    await apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) });
    toast(id ? 'Categoría actualizada' : 'Categoría creada');
    closeModal();
    reloadCategories(document.getElementById('viewContainer'));
  } catch(e) { toast(e.message, 'error'); }
}

function deleteCategory(id, name) {
  confirmDialog(`¿Eliminar la categoría "${name}"?`, async () => {
    try {
      await apiFetch('/categories/' + id, { method: 'DELETE' });
      toast('Categoría eliminada');
      reloadCategories(document.getElementById('viewContainer'));
    } catch(e) { toast(e.message, 'error'); }
  });
}

/* ═══════════════════════════════════════════════════════
   INVENTORY VIEW
═══════════════════════════════════════════════════════ */
let invSearch = '', invPage = 1;
async function inventory(container) {
  container.innerHTML = `
    <div class="filters-bar">
      <input class="form-control search-input" placeholder="Buscar producto…" id="invSearchInput" value="${esc(invSearch)}" oninput="invSearch=this.value;invPage=1;reloadInventory()">
    </div>
    <div id="invTable"></div>`;
  await reloadInventory();
}

async function reloadInventory() {
  const params = new URLSearchParams({ page: invPage, limit: 20 });
  if (invSearch) params.set('search', invSearch);
  const data = await apiFetch('/inventory?' + params);
  if (!data) return;
  const { rows, total } = data;
  const c = document.getElementById('invTable');
  if (!c) return;
  c.innerHTML = `
    <div class="card">
      <table class="table table-hover">
        <thead><tr><th>Producto</th><th>Stock actual</th><th>Mínimo</th><th>Estado</th><th>Últimos movimientos</th><th></th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(p => `
            <tr>
              <td>${esc(p.name)}</td>
              <td><span class="badge ${p.stock<=p.min_stock?'badge-red':'badge-green'}">${p.stock}</span></td>
              <td>${p.min_stock}</td>
              <td>${statusBadge(p.status)}</td>
              <td class="text-muted" style="font-size:.8rem">${(p.last_movements||[]).map(m=>`${m.type>0?'+':''}${m.quantity} (${m.type})`).join(', ')||'—'}</td>
              <td><button class="btn btn-sm btn-green" onclick="openInventoryAdjust(${p.id},'${esc(p.name)}',${p.stock})">Ajustar</button></td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty-state">Sin registros</td></tr>'}
        </tbody>
      </table>
      ${paginationHTML(invPage, total, 20, 'goToInvPage')}
    </div>`;
}
window.goToInvPage = (n) => { invPage = n; reloadInventory(); };

function openInventoryAdjust(productId, name, currentStock) {
  openModal('Ajustar inventario', `
    <form id="invForm" onsubmit="saveInventoryAdjust(event,${productId})">
      <p style="margin-bottom:1rem">Producto: <strong>${esc(name)}</strong> — Stock actual: <strong>${currentStock}</strong></p>
      <label class="form-label">Tipo de movimiento
        <select class="form-control" name="type">
          <option value="entry">Entrada</option>
          <option value="exit">Salida</option>
          <option value="adjustment">Ajuste directo</option>
        </select>
      </label>
      <label class="form-label">Cantidad *
        <input class="form-control" type="number" name="quantity" min="1" required>
      </label>
      <label class="form-label">Nota
        <input class="form-control" name="note" placeholder="Motivo del ajuste">
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Confirmar</button>
      </div>
    </form>`);
}

async function saveInventoryAdjust(e, productId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.product_id = productId;
  try {
    await apiFetch('/inventory/adjust', { method: 'POST', body: JSON.stringify(body) });
    toast('Inventario actualizado'); closeModal(); reloadInventory();
  } catch(e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════
   ORDERS VIEW
═══════════════════════════════════════════════════════ */
let ordPage = 1, ordStatus = '';
async function orders(container) {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-green" onclick="openOrderForm()">+ Nuevo pedido</button>`;
  container.innerHTML = `
    <div class="filters-bar">
      <select class="form-control" onchange="ordStatus=this.value;ordPage=1;reloadOrders()">
        <option value="">Todos los estados</option>
        ${['new','confirmed','preparing','shipped','delivered','cancelled'].map(s =>
          `<option value="${s}" ${ordStatus===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div id="ordTable"></div>`;
  await reloadOrders();
}

async function reloadOrders() {
  const params = new URLSearchParams({ page: ordPage, limit: 15 });
  if (ordStatus) params.set('status', ordStatus);
  const data = await apiFetch('/orders?' + params);
  if (!data) return;
  const { rows, total } = data;
  const c = document.getElementById('ordTable');
  if (!c) return;
  c.innerHTML = `
    <div class="card">
      <table class="table table-hover">
        <thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th>Estado</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(o => `
            <tr>
              <td>#${o.id}</td>
              <td>${esc(o.customer_name||'—')}</td>
              <td>${esc(o.customer_phone||'—')}</td>
              <td>${statusBadge(o.status)}</td>
              <td>${fmtCurrency(o.total)}</td>
              <td>${fmtDate(o.created_at)}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-ghost" onclick="openOrderDetail(${o.id})">👁️</button>
                <button class="btn btn-sm btn-ghost" onclick="openOrderStatusForm(${o.id},'${o.status}')">🔄</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="7" class="empty-state">Sin pedidos</td></tr>'}
        </tbody>
      </table>
      ${paginationHTML(ordPage, total, 15, 'goToOrdPage')}
    </div>`;
}
window.goToOrdPage = (n) => { ordPage = n; reloadOrders(); };

async function openOrderDetail(id) {
  const o = await apiFetch('/orders/' + id);
  if (!o) return;
  const items = Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []);
  openModal(`Pedido #${id}`, `
    <div class="order-detail">
      <div class="form-grid-2" style="margin-bottom:1rem">
        <div><strong>Cliente:</strong> ${esc(o.customer_name||'—')}</div>
        <div><strong>Teléfono:</strong> ${esc(o.customer_phone||'—')}</div>
        <div><strong>Email:</strong> ${esc(o.customer_email||'—')}</div>
        <div><strong>Estado:</strong> ${statusBadge(o.status)}</div>
        <div><strong>Fuente:</strong> ${esc(o.source||'—')}</div>
        <div><strong>Fecha:</strong> ${fmtDatetime(o.created_at)}</div>
      </div>
      ${o.notes ? `<p><strong>Notas:</strong> ${esc(o.notes)}</p>` : ''}
      <table class="table" style="margin-top:1rem">
        <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${items.map(i=>`<tr><td>${esc(i.name||'')}</td><td>${i.qty||1}</td><td>${fmtCurrency(i.price)}</td><td>${fmtCurrency((i.price||0)*(i.qty||1))}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>${fmtCurrency(o.total)}</strong></td></tr></tfoot>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-green" onclick="openOrderStatusForm(${id},'${o.status}')">Cambiar estado</button>
    </div>`, true);
}

function openOrderStatusForm(id, currentStatus) {
  const statuses = ['new','confirmed','preparing','shipped','delivered','cancelled'];
  openModal('Cambiar estado del pedido', `
    <form onsubmit="saveOrderStatus(event,${id})">
      <label class="form-label">Estado
        <select class="form-control" name="status">
          ${statuses.map(s=>`<option value="${s}" ${s===currentStatus?'selected':''}>${s}</option>`).join('')}
        </select>
      </label>
      <label class="form-label">Notas (opcional)
        <textarea class="form-control" name="notes" rows="2"></textarea>
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Actualizar</button>
      </div>
    </form>`);
}

async function saveOrderStatus(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    await apiFetch('/orders/' + id, { method: 'PUT', body: JSON.stringify(body) });
    toast('Pedido actualizado'); closeModal(); reloadOrders();
  } catch(e) { toast(e.message, 'error'); }
}

function openOrderForm() {
  openModal('Nuevo pedido manual', `
    <form onsubmit="saveNewOrder(event)">
      <div class="form-grid-2">
        <label class="form-label">Nombre del cliente
          <input class="form-control" name="customer_name">
        </label>
        <label class="form-label">Teléfono
          <input class="form-control" name="customer_phone">
        </label>
        <label class="form-label">Email
          <input class="form-control" type="email" name="customer_email">
        </label>
        <label class="form-label">Total (Q)
          <input class="form-control" type="number" step="0.01" name="total">
        </label>
      </div>
      <label class="form-label">Notas
        <textarea class="form-control" name="notes" rows="3"></textarea>
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Crear pedido</button>
      </div>
    </form>`);
}

async function saveNewOrder(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.items = '[]'; body.source = 'manual';
  try {
    await apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) });
    toast('Pedido creado'); closeModal(); reloadOrders();
  } catch(e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════
   PROMOTIONS VIEW
═══════════════════════════════════════════════════════ */
async function promotions(container) {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-green" onclick="openPromoForm()">+ Nueva promoción</button>`;
  await reloadPromos(container);
}

async function reloadPromos(container) {
  const data = await apiFetch('/promotions');
  const c = document.getElementById('promoTable') || container;
  const html = `
    <div class="card" id="promoTable">
      <table class="table table-hover">
        <thead><tr><th>Producto</th><th>Etiqueta</th><th>Descuento</th><th>Vigencia</th><th>Activa</th><th>Acciones</th></tr></thead>
        <tbody>
          ${(data||[]).length ? (data||[]).map(p => `
            <tr>
              <td>${esc(p.product_name||'—')}</td>
              <td>${esc(p.label||'')}</td>
              <td>${p.discount_pct ? p.discount_pct + '%' : '—'}</td>
              <td>${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}</td>
              <td><label class="toggle"><input type="checkbox" ${p.active?'checked':''} onchange="togglePromo(${p.id},this.checked)"><span class="slider"></span></label></td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-ghost" onclick="openPromoForm(${p.id})">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="deletePromo(${p.id})">🗑️</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty-state">Sin promociones</td></tr>'}
        </tbody>
      </table>
    </div>`;
  if (document.getElementById('promoTable')) {
    document.getElementById('promoTable').outerHTML = html;
  } else {
    container.innerHTML = html;
  }
}

async function openPromoForm(id) {
  const [prods, promo] = await Promise.all([
    apiFetch('/products?limit=200'),
    id ? apiFetch('/promotions/' + id) : Promise.resolve(null),
  ]);
  const p = promo || {};
  openModal(id ? 'Editar promoción' : 'Nueva promoción', `
    <form onsubmit="savePromo(event,${id||'null'})">
      <label class="form-label">Producto *
        <select class="form-control" name="product_id" required>
          <option value="">Seleccionar…</option>
          ${((prods&&prods.rows)||[]).map(r=>`<option value="${r.id}" ${p.product_id==r.id?'selected':''}>${esc(r.name)}</option>`).join('')}
        </select>
      </label>
      <label class="form-label">Etiqueta
        <input class="form-control" name="label" value="${esc(p.label||'Oferta')}">
      </label>
      <label class="form-label">Descuento (%)
        <input class="form-control" type="number" min="1" max="99" name="discount_pct" value="${p.discount_pct||''}">
      </label>
      <div class="form-grid-2">
        <label class="form-label">Fecha inicio
          <input class="form-control" type="date" name="start_date" value="${(p.start_date||'').split('T')[0]}">
        </label>
        <label class="form-label">Fecha fin
          <input class="form-control" type="date" name="end_date" value="${(p.end_date||'').split('T')[0]}">
        </label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Guardar</button>
      </div>
    </form>`);
}

async function savePromo(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await apiFetch('/promotions/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else    await apiFetch('/promotions', { method: 'POST', body: JSON.stringify(body) });
    toast('Promoción guardada'); closeModal();
    reloadPromos(document.getElementById('viewContainer'));
  } catch(e) { toast(e.message, 'error'); }
}

async function togglePromo(id, active) {
  try { await apiFetch('/promotions/' + id, { method: 'PUT', body: JSON.stringify({ active }) }); }
  catch(e) { toast(e.message, 'error'); }
}

function deletePromo(id) {
  confirmDialog('¿Eliminar esta promoción?', async () => {
    try {
      await apiFetch('/promotions/' + id, { method: 'DELETE' });
      toast('Promoción eliminada');
      reloadPromos(document.getElementById('viewContainer'));
    } catch(e) { toast(e.message, 'error'); }
  });
}

/* ═══════════════════════════════════════════════════════
   REPORTS VIEW
═══════════════════════════════════════════════════════ */
async function reports(container) {
  const [salesData, prodData] = await Promise.all([
    apiFetch('/reports/sales'),
    apiFetch('/reports/products'),
  ]);

  const sales = salesData || {};
  const prods = prodData || [];

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e8f5e9">📦</div>
        <div class="stat-info">
          <div class="stat-value">${sales.total_orders||0}</div>
          <div class="stat-label">Pedidos totales</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff8e1">💰</div>
        <div class="stat-info">
          <div class="stat-value">${fmtCurrency(sales.total_revenue)}</div>
          <div class="stat-label">Ingresos totales</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#e3f2fd">🛍️</div>
        <div class="stat-info">
          <div class="stat-value">${fmtCurrency(sales.avg_order)}</div>
          <div class="stat-label">Ticket promedio</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3>Ventas por mes</h3></div>
        <div class="bar-chart">
          ${(sales.by_month||[]).length ? sales.by_month.map(m => `
            <div class="bar-row">
              <span class="bar-label">${esc(m.month)}</span>
              <div class="bar-wrap">
                <div class="bar-fill" style="width:${Math.min(100, (m.revenue/Math.max(...sales.by_month.map(x=>x.revenue||1)))*100)}%"></div>
              </div>
              <span class="bar-val">${fmtCurrency(m.revenue)}</span>
            </div>`).join('') : '<p class="empty-state">Sin datos</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Productos más vendidos</h3></div>
        <table class="table">
          <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
          <tbody>
            ${prods.length ? prods.slice(0,10).map(p=>`
              <tr>
                <td>${esc(p.name)}</td>
                <td>${p.units_sold||0}</td>
                <td>${fmtCurrency(p.revenue)}</td>
              </tr>`).join('') : '<tr><td colspan="3" class="empty-state">Sin datos</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><h3>Pedidos por estado</h3></div>
        <div class="bar-chart">
          ${(sales.by_status||[]).map(s=>`
            <div class="bar-row">
              <span class="bar-label">${esc(s.status)}</span>
              <div class="bar-wrap">
                <div class="bar-fill" style="width:${Math.min(100,(s.count/(sales.total_orders||1))*100)}%"></div>
              </div>
              <span class="bar-val">${s.count}</span>
            </div>`).join('')||'<p class="empty-state">Sin datos</p>'}
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   USERS VIEW (admin only)
═══════════════════════════════════════════════════════ */
async function users(container) {
  if (ME?.role !== 'admin') {
    container.innerHTML = '<div class="empty-state">Acceso restringido.</div>'; return;
  }
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-green" onclick="openUserForm()">+ Nuevo usuario</button>`;
  await reloadUsers(container);
}

async function reloadUsers(container) {
  const data = await apiFetch('/users');
  const c = document.getElementById('usersTable') || container;
  const html = `
    <div class="card" id="usersTable">
      <table class="table table-hover">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último login</th><th>Acciones</th></tr></thead>
        <tbody>
          ${(data||[]).length ? (data||[]).map(u=>`
            <tr>
              <td>${esc(u.name)}</td>
              <td>${esc(u.email)}</td>
              <td>${statusBadge(u.role)}</td>
              <td>${statusBadge(u.status)}</td>
              <td>${fmtDatetime(u.last_login)}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-ghost" onclick="openUserForm(${u.id})" ${u.id===ME?.id?'disabled':''}>✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteUser(${u.id},'${esc(u.name)}')" ${u.id===ME?.id?'disabled':''}>🗑️</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty-state">Sin usuarios</td></tr>'}
        </tbody>
      </table>
    </div>`;
  if (document.getElementById('usersTable')) {
    document.getElementById('usersTable').outerHTML = html;
  } else {
    container.innerHTML = html;
  }
}

async function openUserForm(id) {
  const u = id ? await apiFetch('/users/' + id) : {};
  openModal(id ? 'Editar usuario' : 'Nuevo usuario', `
    <form onsubmit="saveUser(event,${id||'null'})">
      <label class="form-label">Nombre *
        <input class="form-control" name="name" value="${esc((u||{}).name||'')}" required>
      </label>
      <label class="form-label">Email *
        <input class="form-control" type="email" name="email" value="${esc((u||{}).email||'')}" required>
      </label>
      <label class="form-label">${id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
        <input class="form-control" type="password" name="password" ${id?'':'required'}>
      </label>
      <label class="form-label">Rol
        <select class="form-control" name="role">
          <option value="editor" ${(u||{}).role==='editor'?'selected':''}>Editor</option>
          <option value="operator" ${(u||{}).role==='operator'?'selected':''}>Operador</option>
          <option value="admin" ${(u||{}).role==='admin'?'selected':''}>Administrador</option>
        </select>
      </label>
      <label class="form-label">Estado
        <select class="form-control" name="status">
          <option value="active" ${(u||{}).status==='active'?'selected':''}>Activo</option>
          <option value="inactive" ${(u||{}).status==='inactive'?'selected':''}>Inactivo</option>
        </select>
      </label>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-green">Guardar</button>
      </div>
    </form>`);
}

async function saveUser(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  if (!body.password) delete body.password;
  try {
    if (id) await apiFetch('/users/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else    await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
    toast(id ? 'Usuario actualizado' : 'Usuario creado'); closeModal();
    reloadUsers(document.getElementById('viewContainer'));
  } catch(e) { toast(e.message, 'error'); }
}

function deleteUser(id, name) {
  confirmDialog(`¿Eliminar el usuario "${name}"?`, async () => {
    try {
      await apiFetch('/users/' + id, { method: 'DELETE' });
      toast('Usuario eliminado');
      reloadUsers(document.getElementById('viewContainer'));
    } catch(e) { toast(e.message, 'error'); }
  });
}

/* ═══════════════════════════════════════════════════════
   SETTINGS VIEW (admin only)
═══════════════════════════════════════════════════════ */
async function settings(container) {
  if (ME?.role !== 'admin') {
    container.innerHTML = '<div class="empty-state">Acceso restringido.</div>'; return;
  }
  const data = await apiFetch('/settings');
  const s = {};
  (data || []).forEach(row => { s[row.key] = row.value; });

  container.innerHTML = `
    <div class="card" style="max-width:640px">
      <div class="card-header"><h3>Configuración del negocio</h3></div>
      <form id="settingsForm" onsubmit="saveSettings(event)">
        <label class="form-label">Nombre del negocio
          <input class="form-control" name="business_name" value="${esc(s.business_name||'')}">
        </label>
        <label class="form-label">WhatsApp (solo números, con código de país)
          <input class="form-control" name="whatsapp" value="${esc(s.whatsapp||'')}">
        </label>
        <label class="form-label">Dirección
          <input class="form-control" name="address" value="${esc(s.address||'')}">
        </label>
        <label class="form-label">Métodos de pago
          <input class="form-control" name="payment_methods" value="${esc(s.payment_methods||'')}" placeholder="Transferencia, Efectivo, Tarjeta">
        </label>
        <label class="form-label">Mensaje de compra
          <textarea class="form-control" name="purchase_message" rows="3">${esc(s.purchase_message||'')}</textarea>
        </label>
        <label class="form-label">Alerta stock bajo (cantidad mínima)
          <input class="form-control" type="number" name="low_stock_alert" value="${esc(s.low_stock_alert||'5')}">
        </label>
        <div style="padding-top:1rem">
          <button type="submit" class="btn btn-green">Guardar configuración</button>
        </div>
      </form>
    </div>`;
}

async function saveSettings(e) {
  e.preventDefault();
  const entries = Object.entries(Object.fromEntries(new FormData(e.target).entries()));
  try {
    await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(entries)) });
    toast('Configuración guardada');
  } catch(e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════
   AUDIT VIEW (admin only)
═══════════════════════════════════════════════════════ */
let auditPage = 1;
async function audit(container) {
  if (ME?.role !== 'admin') {
    container.innerHTML = '<div class="empty-state">Acceso restringido.</div>'; return;
  }
  container.innerHTML = `<div id="auditTable"></div>`;
  await reloadAudit();
}

async function reloadAudit() {
  const data = await apiFetch('/audit?page=' + auditPage + '&limit=30');
  if (!data) return;
  const { rows, total } = data;
  const c = document.getElementById('auditTable');
  if (!c) return;
  c.innerHTML = `
    <div class="card">
      <table class="table">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Detalles</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(a=>`
            <tr>
              <td style="white-space:nowrap">${fmtDatetime(a.created_at)}</td>
              <td>${esc(a.user_name||'—')}</td>
              <td><span class="badge badge-blue">${esc(a.action)}</span></td>
              <td>${esc(a.module)}</td>
              <td class="text-muted" style="font-size:.85rem">${esc(a.details||'')}</td>
            </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Sin registros</td></tr>'}
        </tbody>
      </table>
      ${paginationHTML(auditPage, total, 30, 'goToAuditPage')}
    </div>`;
}
window.goToAuditPage = (n) => { auditPage = n; reloadAudit(); };

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (TOKEN && ME) {
    showApp();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
});
