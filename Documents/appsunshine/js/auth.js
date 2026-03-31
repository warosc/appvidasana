/* ============================================
   VIDA SALUDABLE GUATEMALA — AUTH + LOYALTY
   localStorage-based (static site compatible)
   ============================================ */
'use strict';

// ============================================
// CONSTANTS
// ============================================
const POINTS_PER_QUETZAL = 0.1;   // 1 pto por cada Q10
const POINTS_REDEEM_RATE  = 0.1;   // 100 pts = Q10 (Q0.10 por punto)

const TIERS = [
  { name: 'Bronce 🥉', min: 0,    next: 300,  color: '#CD7F32' },
  { name: 'Plata 🥈',  min: 300,  next: 700,  color: '#A8A9AD' },
  { name: 'Oro 🥇',    min: 700,  next: null, color: '#C8941A' },
];

const ORDER_STATUSES = {
  pending:    { label: 'Pendiente',     color: '#F59E0B', icon: '⏳' },
  confirmed:  { label: 'Confirmado',    color: '#3B82F6', icon: '✅' },
  shipped:    { label: 'En camino',     color: '#8B5CF6', icon: '🚚' },
  delivered:  { label: 'Entregado',     color: '#10B981', icon: '📦' },
};

// ============================================
// STORAGE HELPERS
// ============================================
const DB_KEY = 'vsg_users';
const SESSION_KEY = 'vsg_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
}
function saveUsers(users) {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
}
function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}
function saveSession(email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(email));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function getCurrentUser() {
  const email = getSession();
  if (!email) return null;
  return getUsers()[email] || null;
}
function updateUser(data) {
  const email = getSession();
  if (!email) return;
  const users = getUsers();
  users[email] = { ...users[email], ...data };
  saveUsers(users);
}

// ============================================
// TIER LOGIC
// ============================================
function getTier(points) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

// ============================================
// AUTH MODAL CONTROL
// ============================================
function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.add('open');
  document.getElementById('authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
  document.getElementById('authOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('formLogin').style.display   = isLogin ? '' : 'none';
  document.getElementById('formRegister').style.display = isLogin ? 'none' : '';
}

// ============================================
// REGISTER
// ============================================
function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const phone    = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  const users = getUsers();
  if (users[email]) {
    showAuthError('formRegister', 'Este correo ya está registrado. Inicia sesión.');
    return;
  }

  users[email] = {
    name,
    email,
    phone,
    password: btoa(password),   // basic obfuscation for localStorage
    points: 50,                  // 50 puntos de bienvenida
    orders: [],
    createdAt: new Date().toISOString(),
  };
  saveUsers(users);
  saveSession(email);
  closeAuthModal();
  onLoginSuccess();
  showToast(`¡Bienvenido ${name}! 🎁 Te regalamos 50 puntos de bienvenida`);
}

// ============================================
// LOGIN
// ============================================
function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const users = getUsers();
  const user  = users[email];

  if (!user || user.password !== btoa(password)) {
    showAuthError('formLogin', 'Correo o contraseña incorrectos.');
    return;
  }

  saveSession(email);
  closeAuthModal();
  onLoginSuccess();
  showToast(`¡Hola de nuevo, ${user.name}! 👋`);
}

// ============================================
// LOGOUT
// ============================================
function handleLogout() {
  clearSession();
  closeUserPanel();
  renderHeaderAuth();
  showToast('Sesión cerrada. ¡Hasta pronto! 👋');
}

// ============================================
// SESSION BOOTSTRAP
// ============================================
function onLoginSuccess() {
  renderHeaderAuth();
  renderUserPanel();
}

function renderHeaderAuth() {
  const user = getCurrentUser();
  const loginBtn = document.getElementById('loginBtn');
  const userBtn  = document.getElementById('userBtn');

  if (!loginBtn || !userBtn) return;

  if (user) {
    loginBtn.style.display = 'none';
    userBtn.style.display  = 'flex';
    document.getElementById('userBtnAvatar').textContent = user.name[0].toUpperCase();
    document.getElementById('userBtnPoints').textContent = `${user.points} pts`;
  } else {
    loginBtn.style.display = '';
    userBtn.style.display  = 'none';
  }
}

// ============================================
// USER PANEL
// ============================================
function openUserPanel() {
  renderUserPanel();
  document.getElementById('userPanel').classList.add('open');
  document.getElementById('userPanelOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUserPanel() {
  document.getElementById('userPanel').classList.remove('open');
  document.getElementById('userPanelOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderUserPanel() {
  const user = getCurrentUser();
  if (!user) return;

  const tier = getTier(user.points);
  const nextTier = TIERS.find(t => t.min > user.points);
  const progressPct = nextTier
    ? Math.min(100, ((user.points - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;
  const discount = (user.points * POINTS_REDEEM_RATE).toFixed(2);

  document.getElementById('panelAvatar').textContent  = user.name[0].toUpperCase();
  document.getElementById('panelName').textContent    = user.name;
  document.getElementById('panelEmail').textContent   = user.email;
  document.getElementById('panelPoints').textContent  = user.points.toLocaleString();
  document.getElementById('panelTier').textContent    = tier.name;
  document.getElementById('panelTier').style.color    = tier.color;
  document.getElementById('pointsBar').style.width    = `${progressPct}%`;
  document.getElementById('pointsBar').style.background = tier.color;
  document.getElementById('pointsValue').textContent  = `Q ${discount}`;
  document.getElementById('pointsNext').innerHTML     = nextTier
    ? `Faltan <strong>${nextTier.min - user.points}</strong> pts para ${TIERS.find(t => t.min === nextTier.min)?.name}`
    : '🏆 ¡Nivel máximo alcanzado!';

  renderOrders(user.orders);
}

function renderOrders(orders) {
  const el = document.getElementById('panelOrders');
  if (!orders || orders.length === 0) {
    el.innerHTML = '<p class="empty-state">Aún no tienes pedidos registrados 🛒</p>';
    return;
  }
  el.innerHTML = [...orders].reverse().map(o => {
    const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
    return `
      <div class="order-card">
        <div class="order-card-top">
          <span class="order-id">#${o.id}</span>
          <span class="order-status" style="color:${st.color}">${st.icon} ${st.label}</span>
        </div>
        <div class="order-products">${o.items.join(', ')}</div>
        <div class="order-meta">
          <span>${new Date(o.date).toLocaleDateString('es-GT')}</span>
          <strong>Q ${o.total.toFixed(2)}</strong>
        </div>
        <div class="order-points-earned">+${o.pointsEarned} puntos ganados</div>
      </div>`;
  }).join('');
}

// ============================================
// POINTS: earn on WhatsApp order
// Called from app.js after sendOrderWhatsApp()
// ============================================
function earnPoints(total, items) {
  const user = getCurrentUser();
  if (!user) return;

  const pts = Math.floor(total * POINTS_PER_QUETZAL);
  const orderId = Date.now().toString(36).toUpperCase();

  const order = {
    id: orderId,
    items,
    total,
    pointsEarned: pts,
    status: 'pending',
    date: new Date().toISOString(),
  };

  updateUser({
    points: user.points + pts,
    orders: [...(user.orders || []), order],
  });

  renderHeaderAuth();
  showToast(`🎉 ¡Ganaste ${pts} puntos! Total: ${user.points + pts} pts`);
}

// ============================================
// FORM ERROR HELPER
// ============================================
function showAuthError(formId, msg) {
  const form = document.getElementById(formId);
  let errEl = form.querySelector('.auth-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'auth-error';
    form.insertBefore(errEl, form.querySelector('button[type=submit]'));
  }
  errEl.textContent = msg;
  setTimeout(() => errEl.remove(), 4000);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderHeaderAuth();

  // Sync mobile sticky cart count
  const syncMobileCount = () => {
    const count = document.getElementById('cartCount')?.textContent || '0';
    const el = document.getElementById('mobileStickyCount');
    if (el) el.textContent = count;
  };
  // Observe cart count changes
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    new MutationObserver(syncMobileCount).observe(cartCountEl, { childList: true, characterData: true, subtree: true });
  }

  // Show mobile sticky bar on scroll
  const stickyBar = document.getElementById('mobileStickyBar');
  if (stickyBar) {
    window.addEventListener('scroll', () => {
      stickyBar.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
  }
});
