/* ============================================
   VIDA SALUDABLE GUATEMALA — APP JS
   Cart, WhatsApp, Programs, Analytics
   ============================================ */

'use strict';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  whatsappNumber: '50245187707', // Replace with your number (no +, no spaces)
  storeName: 'Vida Saludable Guatemala',
  currency: 'Q',
};

// ============================================
// PRODUCT CATALOG
// ============================================
const PRODUCTS = [
  // Bajar de Peso
  {
    id: 'fat-grabbers',
    name: 'Fat Grabbers',
    desc: 'Bloquea la absorción de grasas. Chitosano natural de alta pureza.',
    price: 180,
    emoji: '🟡',
    categories: ['peso'],
    stock: true,
  },
  {
    id: 'carbo-grabbers',
    name: 'Carbo Grabbers',
    desc: 'Inhibe la digestión de carbohidratos. Extracto de frijol blanco.',
    price: 150,
    emoji: '🟠',
    categories: ['peso'],
    stock: true,
  },
  {
    id: 'lbs-ii',
    name: 'LBS-II',
    desc: 'Depurativo intestinal natural. Estimula la función digestiva.',
    price: 165,
    emoji: '🌱',
    categories: ['peso', 'digestion'],
    stock: true,
  },
  // Energía
  {
    id: 'nutri-calm',
    name: 'Nutri-Calm',
    desc: 'Vitaminas del complejo B para el sistema nervioso y anti-estrés.',
    price: 165,
    emoji: '💛',
    categories: ['energia'],
    stock: true,
  },
  {
    id: 'b-complex',
    name: 'B-Complex',
    desc: 'Complejo B completo para energía celular y metabolismo activo.',
    price: 145,
    emoji: '⚡',
    categories: ['energia', 'vitaminas'],
    stock: true,
  },
  {
    id: 'zambroza',
    name: 'Zambroza',
    desc: 'Superfrutos antioxidantes para vitalidad y sistema inmune.',
    price: 210,
    emoji: '🍇',
    categories: ['energia', 'vitaminas'],
    stock: true,
  },
  // Digestión
  {
    id: 'probiotic-11',
    name: 'Probiotic 11',
    desc: '11 cepas de probióticos para restaurar tu microbiota intestinal.',
    price: 195,
    emoji: '🦠',
    categories: ['digestion'],
    stock: true,
  },
  {
    id: 'aloe-vera-gel',
    name: 'Aloe Vera Gel',
    desc: 'Gel de aloe vera puro. Antiinflamatorio y regenerador intestinal.',
    price: 185,
    emoji: '🌵',
    categories: ['digestion'],
    stock: true,
  },
  {
    id: 'cascara-sagrada',
    name: 'Cascara Sagrada',
    desc: 'Laxante suave natural. Regula el tránsito intestinal.',
    price: 145,
    emoji: '🌿',
    categories: ['digestion'],
    stock: true,
  },
  // Vitaminas
  {
    id: 'chlorophyll',
    name: 'Chlorophyll Liquid',
    desc: 'Clorofila líquida concentrada. Desintoxicante y alcalinizante.',
    price: 195,
    emoji: '🟢',
    categories: ['peso', 'vitaminas'],
    stock: true,
  },
  {
    id: 'thai-go',
    name: 'Thai-Go',
    desc: 'Mangostán y superfrutos asiáticos. Antioxidante premium.',
    price: 220,
    emoji: '🍊',
    categories: ['vitaminas', 'energia'],
    stock: true,
  },
  {
    id: 'super-vitamins',
    name: 'Super Vitamins & Minerals',
    desc: 'Multivitamínico completo. Base nutricional para cualquier programa.',
    price: 185,
    emoji: '💊',
    categories: ['vitaminas', 'peso'],
    stock: true,
  },
];

// ============================================
// PROGRAMS (auto-add to cart)
// ============================================
const PROGRAMS = {
  'peso-rapido': {
    name: 'Programa Bajar de Peso Rápido',
    productIds: ['fat-grabbers', 'carbo-grabbers', 'lbs-ii'],
    price: 1170, // bundled price
    waMessage: 'Hola, quiero el *Programa Bajar de Peso Rápido* (Fat Grabbers + Carbo Grabbers + LBS-II) por Q1,170. ¿Cómo lo pido?',
  },
  'peso-progresivo': {
    name: 'Programa Bajar de Peso Progresivo',
    productIds: ['super-vitamins', 'chlorophyll', 'thai-go'],
    price: 600,
    waMessage: 'Hola, quiero el *Programa Bajar de Peso Progresivo* (Super Vitamins + Chlorophyll + Thai-Go) por Q600. ¿Cómo lo pido?',
  },
  'energia': {
    name: 'Programa Más Energía',
    productIds: ['nutri-calm', 'b-complex', 'zambroza'],
    price: 520,
    waMessage: 'Hola, quiero el *Programa Más Energía* (Nutri-Calm + B-Complex + Zambroza) por Q520. ¿Cómo lo pido?',
  },
  'digestion': {
    name: 'Programa Mejor Digestión',
    productIds: ['probiotic-11', 'aloe-vera-gel', 'cascara-sagrada'],
    price: 525,
    waMessage: 'Hola, quiero el *Programa Mejor Digestión* (Probiotic 11 + Aloe Vera Gel + Cascara Sagrada) por Q525. ¿Cómo lo pido?',
  },
};

// ============================================
// CART STATE
// ============================================
let cart = JSON.parse(localStorage.getItem('vsg_cart') || '[]');

function saveCart() {
  localStorage.setItem('vsg_cart', JSON.stringify(cart));
}

function getCartItemCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartUI() {
  const count = getCartItemCount();
  const countEl = document.getElementById('cartCount');
  if (countEl) countEl.textContent = count;

  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const totalEl = document.getElementById('cartTotal');

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío 🛒</p>';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${CONFIG.currency} ${(item.price * item.qty).toFixed(2)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          <span class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕ quitar</span>
        </div>
      </div>
    </div>
  `).join('');

  if (footerEl) footerEl.style.display = 'block';
  if (totalEl) totalEl.textContent = `${CONFIG.currency} ${getCartTotal().toFixed(2)}`;
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      qty: 1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`✓ ${product.name} agregado`);

  // Track FB Pixel AddToCart
  if (typeof fbq !== 'undefined') {
    fbq('track', 'AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      value: product.price,
      currency: 'GTQ',
    });
  }

  // Open cart after short delay
  setTimeout(() => openCart(), 300);
}

function addProgram(programId) {
  const program = PROGRAMS[programId];
  if (!program) return;

  // Remove existing program products to avoid duplicates, then add as bundle
  const existingBundle = cart.find(item => item.id === `bundle-${programId}`);
  if (existingBundle) {
    existingBundle.qty += 1;
  } else {
    cart.push({
      id: `bundle-${programId}`,
      name: program.name,
      price: program.price,
      emoji: '📦',
      qty: 1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`✓ ${program.name} agregado`);

  // Track FB Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', 'AddToCart', {
      content_name: program.name,
      content_ids: [`bundle-${programId}`],
      value: program.price,
      currency: 'GTQ',
    });
  }

  setTimeout(() => openCart(), 300);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCartUI();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  toggleCart();
}

// ============================================
// CART UI
// ============================================
function openCart() {
  document.getElementById('cartSidebar')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  if (sidebar?.classList.contains('open')) {
    closeCart();
  } else {
    openCart();
  }
}

// ============================================
// WHATSAPP ORDER
// ============================================
function sendOrderWhatsApp() {
  if (cart.length === 0) return;

  const lines = cart.map(item =>
    `• ${item.name} x${item.qty} — ${CONFIG.currency} ${(item.price * item.qty).toFixed(2)}`
  );
  const total = getCartTotal().toFixed(2);

  const message =
    `¡Hola! Soy cliente de *${CONFIG.storeName}*.\n\n` +
    `*Mi pedido:*\n${lines.join('\n')}\n\n` +
    `*Total: ${CONFIG.currency} ${total}*\n\n` +
    `Por favor, ¿cómo procedo con el pago y la entrega? 😊`;

  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encoded}`;

  // Track FB Pixel InitiateCheckout
  if (typeof fbq !== 'undefined') {
    fbq('track', 'InitiateCheckout', {
      value: parseFloat(total),
      currency: 'GTQ',
      num_items: getCartItemCount(),
    });
  }

  // Earn loyalty points if logged in
  if (typeof earnPoints === 'function') {
    const itemNames = cart.map(i => i.name);
    earnPoints(parseFloat(total), itemNames);
  }

  window.open(url, '_blank', 'noopener');
}

// ============================================
// CATALOG RENDER
// ============================================
function renderCatalog(filter = 'all') {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const filtered = filter === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.categories.includes(filter));

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1">No hay productos en esta categoría.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-categories="${p.categories.join(' ')}">
      <div class="product-img">${p.emoji}</div>
      <div class="product-body">
        <div class="product-category">${getCategoryLabel(p.categories[0])}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-price">${CONFIG.currency} ${p.price.toFixed(2)}</div>
      </div>
      <div class="product-actions">
        <button class="btn-add-cart" onclick="addToCart('${p.id}')">
          + Agregar al carrito
        </button>
        <a class="btn-wa-product"
           href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(`Hola, quiero información sobre *${p.name}* (Q${p.price}). ¿Está disponible?`)}"
           target="_blank" rel="noopener"
           onclick="trackWhatsApp('product-${p.id}')">
          📲 Preguntar por WhatsApp
        </a>
      </div>
    </div>
  `).join('');
}

function getCategoryLabel(cat) {
  const labels = {
    peso: 'Bajar de Peso',
    energia: 'Energía',
    digestion: 'Digestión',
    vitaminas: 'Vitaminas',
  };
  return labels[cat] || cat;
}

function filterCatalog(filter, btn) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCatalog(filter);
}

// ============================================
// NAVIGATION
// ============================================
function toggleMenu() {
  const nav = document.getElementById('mobileNav');
  nav?.classList.toggle('open');
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// Sticky header shadow on scroll
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (!header) return;
  if (window.scrollY > 10) {
    header.style.boxShadow = '0 2px 20px rgba(0,0,0,.12)';
  } else {
    header.style.boxShadow = '';
  }
}, { passive: true });

// ============================================
// TOAST NOTIFICATION
// ============================================
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('toastEl');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastEl';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================
// ANALYTICS TRACKING
// ============================================
function trackWhatsApp(source) {
  // Google Analytics 4 / GTM
  if (typeof dataLayer !== 'undefined') {
    dataLayer.push({
      event: 'whatsapp_click',
      event_category: 'engagement',
      event_label: source,
    });
  }
  // Meta Pixel Lead event
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', { content_name: source });
  }
}

// ============================================
// REMARKETING: Track cart abandonment
// ============================================
function setupRemarketing() {
  // Fire ViewContent when page loads
  if (typeof fbq !== 'undefined') {
    fbq('track', 'ViewContent', {
      content_type: 'product_group',
      content_name: 'Productos Naturales NSP Guatemala',
    });
  }

  // Fire AddToWishlist / remarketing audiences for users who browse programs
  const programCards = document.querySelectorAll('.program-card');
  programCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const program = card.dataset.program;
      if (program && typeof dataLayer !== 'undefined') {
        dataLayer.push({
          event: 'program_view',
          program_id: program,
        });
      }
    }, { once: true });
  });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderCatalog();
  updateCartUI();
  setupRemarketing();
});
