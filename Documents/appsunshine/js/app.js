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
// PRODUCT CATALOG — Catálogo NSP Guatemala (Agosto 2025)
// ============================================
const PRODUCTS = [

  // ── Antioxidante ──────────────────────────────────────────────────────
  {
    id: 'power-acai',
    name: 'Power Açai',
    desc: 'Potente antioxidante de bayas de açaí. Combate el estrés oxidativo y revitaliza el organismo.',
    price: 593,
    emoji: '🫐',
    categories: ['antioxidante', 'energia'],
    featured: false,
    stock: true,
  },

  // ── Belleza ───────────────────────────────────────────────────────────
  {
    id: 'aloe-vera-gel',
    name: 'Aloe Vera Gel',
    desc: 'Gel puro de aloe vera para piel, cabello y mucosas. Hidratante y regenerador natural.',
    price: 207,
    emoji: '🌵',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus1679_aloe_vera_gel-1920.webp',
    categories: ['belleza', 'digestivo'],
    featured: false,
    stock: true,
  },
  {
    id: 'hsn-w',
    name: 'HSN-W',
    desc: 'Fórmula para cabello, piel y uñas. Biotina, zinc y aminoácidos estructurales.',
    price: 210,
    emoji: '💅',
    categories: ['belleza'],
    featured: false,
    stock: true,
  },

  // ── Bienestar General ─────────────────────────────────────────────────
  {
    id: 'cx',
    name: 'C-X',
    desc: 'Apoyo al sistema reproductor femenino. Fitoestrógenos naturales para equilibrio hormonal.',
    price: 313,
    emoji: '🌸',
    categories: ['bienestar'],
    featured: false,
    stock: true,
  },
  {
    id: 'k-herb',
    name: 'K',
    desc: 'Soporte renal y urinario. Hierbas diuréticas que favorecen la eliminación de líquidos.',
    price: 220,
    emoji: '💧',
    categories: ['bienestar', 'detox'],
    featured: false,
    stock: true,
  },
  {
    id: 'maca',
    name: 'Maca',
    desc: 'Raíz andina adaptógena. Aumenta vitalidad, energía y libido naturalmente.',
    price: 257,
    emoji: '🌾',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus1117_maca_bottle-1920.webp',
    categories: ['bienestar', 'energia'],
    featured: false,
    stock: true,
  },
  {
    id: 'mens-formula',
    name: "Men's Formula",
    desc: 'Fórmula masculina con saw palmetto y zinc. Salud prostática y vitalidad.',
    price: 338,
    emoji: '💪',
    categories: ['bienestar'],
    featured: false,
    stock: true,
  },
  {
    id: 'tei-fu-lotion',
    name: 'Tei-Fu Massage Lotion',
    desc: 'Loción de masaje con aceites esenciales mentolados. Alivia dolores musculares y fatiga.',
    price: 315,
    emoji: '🧴',
    categories: ['bienestar'],
    featured: false,
    stock: true,
  },
  {
    id: 'tei-fu-oil',
    name: 'Tei-Fu Aceite Esencial',
    desc: 'Aceite esencial concentrado. Inhalar para aliviar congestión y estrés; uso tópico para dolores.',
    price: 208,
    emoji: '🌿',
    categories: ['bienestar'],
    featured: false,
    stock: true,
  },
  {
    id: 'ury',
    name: 'URY',
    desc: 'Soporte para el sistema urinario. Reduce inflamación y apoya la función renal.',
    price: 298,
    emoji: '🫘',
    categories: ['bienestar'],
    featured: false,
    stock: true,
  },
  {
    id: 'zambroza',
    name: 'Zambroza',
    desc: 'Superfórmula de mangostán y frutas exóticas. Antioxidante, energizante e inmunológica. ⭐ Más buscado',
    price: 410,
    emoji: '🍇',
    categories: ['bienestar', 'antioxidante', 'energia'],
    featured: true,
    stock: true,
  },

  // ── Detox ─────────────────────────────────────────────────────────────
  {
    id: 'bowel-build',
    name: 'Bowel Build',
    desc: 'Fórmula depurativa intestinal con fibras y hierbas. Limpieza profunda del colon. ⭐ Más buscado',
    price: 343,
    emoji: '🫙',
    categories: ['detox'],
    featured: true,
    stock: true,
  },
  {
    id: 'cascara-sagrada',
    name: 'Cáscara Sagrada',
    desc: 'Laxante suave natural. Regula el tránsito intestinal sin crear dependencia.',
    price: 195,
    emoji: '🌿',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/products/cascara-sagrada_1432x800-1-1920.webp',
    categories: ['detox', 'digestivo'],
    featured: false,
    stock: true,
  },
  {
    id: 'clorofila',
    name: 'Clorofila Líquida',
    desc: 'Clorofila concentrada. Desintoxicante, alcalinizante y desodorizante interno. ⭐ Más buscado',
    price: 220,
    emoji: '🟢',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus1683_liquid-chlorophyll-1920.webp',
    categories: ['detox'],
    featured: true,
    stock: true,
  },
  {
    id: 'lbs-ii',
    name: 'LBS II',
    desc: 'Fórmula depurativa de hierbas. Estimula el movimiento intestinal y elimina toxinas. ⭐ Más buscado',
    price: 252,
    emoji: '🌱',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus990_lower-bowel-stimulator-bottle-1920.webp',
    categories: ['detox'],
    featured: true,
    stock: true,
  },
  {
    id: 'liv-a',
    name: 'LIV-A',
    desc: 'Desintoxicante hepático. Cardo mariano y hierbas que regeneran y protegen el hígado. ⭐ Más buscado',
    price: 270,
    emoji: '🫀',
    categories: ['detox'],
    featured: true,
    stock: true,
  },
  {
    id: 'psyllium-hulls',
    name: 'Psyllium Hulls',
    desc: 'Fibra soluble de cáscara de psyllium. Limpia el colon y reduce el colesterol. ⭐ Más buscado',
    price: 383,
    emoji: '🌾',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus545_psyllium_hulls_bottle-1920.webp',
    categories: ['detox'],
    featured: true,
    stock: true,
  },

  // ── Digestivo ─────────────────────────────────────────────────────────
  {
    id: 'herbal-hp-fighter',
    name: 'Herbal H-P Fighter',
    desc: 'Combate el H. pylori y gastritis con hierbas naturales. Protege y restaura la mucosa gástrica. ⭐ Más buscado',
    price: 335,
    emoji: '🛡️',
    categories: ['digestivo'],
    featured: true,
    stock: true,
  },
  {
    id: 'jugo-aloe-vera',
    name: 'Jugo de Aloe Vera',
    desc: 'Jugo puro de aloe. Calma la inflamación gastrointestinal y favorece la digestión. ⭐ Más buscado',
    price: 290,
    emoji: '🥤',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus1680_aloe_vera_juice_32oz-1920.webp',
    categories: ['digestivo'],
    featured: true,
    stock: true,
  },
  {
    id: 'nogal-negro',
    name: 'Nogal Negro',
    desc: 'Antiparasitario natural. Limpia el tracto intestinal de parásitos y hongos.',
    price: 200,
    emoji: '🥜',
    categories: ['digestivo', 'detox'],
    featured: false,
    stock: true,
  },
  {
    id: 'p-14',
    name: 'P-14',
    desc: 'Probiótico con 14 cepas activas. Restaura la flora intestinal y refuerza la inmunidad.',
    price: 285,
    emoji: '🦠',
    categories: ['digestivo'],
    featured: false,
    stock: true,
  },
  {
    id: 'peppermint-oil',
    name: 'Peppermint Oil',
    desc: 'Aceite de menta piperita en cápsulas. Alivia la distensión abdominal y el colon irritable.',
    price: 217,
    emoji: '🌿',
    categories: ['digestivo'],
    featured: false,
    stock: true,
  },

  // ── Inmunológico ──────────────────────────────────────────────────────
  {
    id: 'alj-capsulas',
    name: 'ALJ Cápsulas',
    desc: 'Fórmula respiratoria con hierbas. Despeja las vías respiratorias y refuerza las defensas.',
    price: 267,
    emoji: '💊',
    categories: ['inmune'],
    featured: false,
    stock: true,
  },
  {
    id: 'alj-liquido',
    name: 'ALJ Líquido',
    desc: 'Versión líquida de la fórmula respiratoria ALJ. Acción rápida para congestión y resfriados.',
    price: 243,
    emoji: '🍯',
    categories: ['inmune'],
    featured: false,
    stock: true,
  },
  {
    id: 'jugo-noni',
    name: 'Jugo de Noni',
    desc: 'Jugo de noni puro. Potente inmunomodulador con más de 150 nutrientes bioactivos. ⭐ Más buscado',
    price: 612,
    emoji: '🍈',
    categories: ['inmune', 'antioxidante'],
    featured: true,
    stock: true,
  },
  {
    id: 'pau-darco',
    name: "Pau D'Arco",
    desc: 'Corteza del árbol Tabebuia. Antifúngico, antibacteriano y fortalecedor del sistema inmune.',
    price: 215,
    emoji: '🌳',
    categories: ['inmune'],
    featured: false,
    stock: true,
  },
  {
    id: 'echinacea',
    name: 'Ultimate Equinácea',
    desc: 'Equinácea de alta potencia. Activa las defensas ante infecciones virales y bacterianas.',
    price: 277,
    emoji: '🌺',
    categories: ['inmune'],
    featured: false,
    stock: true,
  },
  {
    id: 'una-de-gato',
    name: 'Uña de Gato',
    desc: 'Antiinflamatorio e inmunoestimulante. Ideal para artritis, infecciones y sistema inmune débil.',
    price: 318,
    emoji: '🐱',
    categories: ['inmune', 'articular'],
    featured: false,
    stock: true,
  },

  // ── Nutrición Deportiva ───────────────────────────────────────────────
  {
    id: 'solstic-energy',
    name: 'Solstic Energy',
    desc: 'Bebida energética natural con vitaminas B y ginseng. Sin azúcar, sin cafeína artificial.',
    price: 497,
    emoji: '⚡',
    categories: ['deportiva', 'energia'],
    featured: false,
    stock: true,
  },

  // ── Salud Articular ───────────────────────────────────────────────────
  {
    id: 'art-a',
    name: 'ART-A',
    desc: 'Fórmula articular con hierbas antiinflamatorias. Alivia dolor de articulaciones y rigidez.',
    price: 302,
    emoji: '🦴',
    categories: ['articular'],
    featured: false,
    stock: true,
  },
  {
    id: 'chondroitin',
    name: 'Chondroitin',
    desc: 'Condroitín sulfato de alta pureza. Regenera el cartílago y lubrica las articulaciones.',
    price: 405,
    emoji: '🦴',
    categories: ['articular'],
    featured: false,
    stock: true,
  },
  {
    id: 'glucosamine',
    name: 'Glucosamine',
    desc: 'Glucosamina natural. Reduce el dolor articular y mejora la movilidad.',
    price: 217,
    emoji: '🦵',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus903_glucosamine_bottle-1920.webp',
    categories: ['articular'],
    featured: false,
    stock: true,
  },

  // ── Salud Metabólica ──────────────────────────────────────────────────
  {
    id: 'ajo-alta-potencia',
    name: 'Ajo de Alta Potencia',
    desc: 'Extracto de ajo concentrado. Reduce el colesterol, presión arterial y actúa como antibiótico natural.',
    price: 358,
    emoji: '🧄',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },
  {
    id: 'chickweed',
    name: 'Chickweed',
    desc: 'Hierba diurética y depurativa. Apoya la pérdida de peso y la eliminación de toxinas.',
    price: 210,
    emoji: '🌿',
    categories: ['metabolica', 'detox'],
    featured: false,
    stock: true,
  },
  {
    id: 'fat-grabbers',
    name: 'Fat Grabbers',
    desc: 'Bloquea la absorción de grasas de la dieta. Quitosano natural de alta pureza.',
    price: 267,
    emoji: '🟡',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus3028_fat_grabbers_bottle-1920.webp',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },
  {
    id: 'flax-seed-oil',
    name: 'Flax Seed Oil',
    desc: 'Aceite de linaza rico en Omega-3. Salud cardiovascular, cerebral y control del colesterol.',
    price: 333,
    emoji: '🫒',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },
  {
    id: 'food-enzymes',
    name: 'Food Enzymes',
    desc: 'Complejo multienzimático digestivo. Mejora la absorción de nutrientes y elimina la pesadez.',
    price: 303,
    emoji: '⚙️',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/products/1836_foodenzymes_body-1920.webp',
    categories: ['metabolica', 'digestivo'],
    featured: false,
    stock: true,
  },
  {
    id: 'master-gland',
    name: 'Master Gland',
    desc: 'Fórmula glandular equilibradora. Apoya el sistema endocrino y la función hipofisaria.',
    price: 300,
    emoji: '🧠',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },
  {
    id: 'mega-chel',
    name: 'Mega-Chel',
    desc: 'Quelación oral con vitaminas y minerales. Limpia arterias y apoya la salud cardiovascular.',
    price: 390,
    emoji: '❤️',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus4201_mega-chel_bottle-1920.webp',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },
  {
    id: 'vari-gone',
    name: 'Vari-Gone',
    desc: 'Fórmula para várices y circulación. Fortalece las paredes venosas y reduce la inflamación.',
    price: 278,
    emoji: '🩸',
    categories: ['metabolica'],
    featured: false,
    stock: true,
  },

  // ── Vigor Mental ──────────────────────────────────────────────────────
  {
    id: 'aps-ii',
    name: 'APS II',
    desc: 'Adaptógeno para el manejo del estrés. Calma el sistema nervioso sin causar somnolencia.',
    price: 197,
    emoji: '🧘',
    categories: ['mental'],
    featured: false,
    stock: true,
  },
  {
    id: 'ginkgo-biloba',
    name: 'Ginkgo Biloba',
    desc: 'Mejora la circulación cerebral. Favorece memoria, concentración y lucidez mental.',
    price: 220,
    emoji: '🍂',
    categories: ['mental'],
    featured: false,
    stock: true,
  },
  {
    id: 'eight',
    name: 'Eight',
    desc: 'Complejo de 8 hierbas adaptógenas. Equilibra el sistema nervioso y aumenta la resistencia al estrés.',
    price: 213,
    emoji: '8️⃣',
    categories: ['mental'],
    featured: false,
    stock: true,
  },
  {
    id: 'nutri-calm',
    name: 'Nutri Calm',
    desc: 'Complejo B + vitamina C para el sistema nervioso. Reduce ansiedad, insomnio y agotamiento. ⭐ Más buscado',
    price: 462,
    emoji: '💛',
    img: 'https://uscoreprod.naturessunshine.com/cdn-cgi/image/width=400,height=auto,format=webp,quality=80,fit=contain/globalassets/nsp-products-catalog/variants/lus1617_nutri-calm_bottle-1920.webp',
    categories: ['mental', 'energia'],
    featured: true,
    stock: true,
  },
  {
    id: 'st-john-wort',
    name: "St. John's Wort",
    desc: 'Hipérico o hierba de San Juan. Antidepresivo natural que eleva el ánimo y reduce la ansiedad.',
    price: 263,
    emoji: '🌻',
    categories: ['mental'],
    featured: false,
    stock: true,
  },
  {
    id: 'str-j',
    name: 'STR-J',
    desc: 'Fórmula relajante con valeriana y hierbas calmantes. Reduce estrés y mejora el sueño.',
    price: 238,
    emoji: '😴',
    categories: ['mental'],
    featured: false,
    stock: true,
  },

  // ── Vitaminas y Minerales ─────────────────────────────────────────────
  {
    id: 'calcium-magnesium',
    name: 'Calcium-Magnesium',
    desc: 'Calcio y magnesio quelados. Huesos fuertes, función muscular y sistema nervioso saludable.',
    price: 210,
    emoji: '🦷',
    categories: ['vitaminas'],
    featured: false,
    stock: true,
  },
  {
    id: 'vitamin-e',
    name: 'Vitamin E Complete',
    desc: 'Vitamina E completa con tocoferoles mixtos. Antioxidante cardiovascular y protector celular.',
    price: 408,
    emoji: '🌟',
    categories: ['vitaminas', 'antioxidante'],
    featured: false,
    stock: true,
  },
];

// ============================================
// PROGRAMS (auto-add to cart)
// ============================================
const PROGRAMS = {
  'detox-colon': {
    name: 'Programa Detox Colon',
    productIds: ['lbs-ii', 'psyllium-hulls', 'clorofila'],
    price: 800,
    waMessage: 'Hola, quiero el *Programa Detox Colon* (LBS II + Psyllium Hulls + Clorofila Líquida) por Q800. ¿Cómo lo pido?',
  },
  'detox-higado': {
    name: 'Programa Detox Hígado',
    productIds: ['liv-a', 'clorofila', 'cascara-sagrada'],
    price: 630,
    waMessage: 'Hola, quiero el *Programa Detox Hígado* (LIV-A + Clorofila Líquida + Cáscara Sagrada) por Q630. ¿Cómo lo pido?',
  },
  'gastritis': {
    name: 'Programa Gastritis & H. Pylori',
    productIds: ['herbal-hp-fighter', 'jugo-aloe-vera', 'aloe-vera-gel'],
    price: 780,
    waMessage: 'Hola, quiero el *Programa Gastritis & H. Pylori* (Herbal H-P Fighter + Jugo de Aloe Vera + Aloe Vera Gel) por Q780. ¿Cómo lo pido?',
  },
  'energia': {
    name: 'Programa Más Energía',
    productIds: ['nutri-calm', 'zambroza', 'maca'],
    price: 1070,
    waMessage: 'Hola, quiero el *Programa Más Energía* (Nutri Calm + Zambroza + Maca) por Q1,070. ¿Cómo lo pido?',
  },
  'peso': {
    name: 'Programa Control de Peso',
    productIds: ['fat-grabbers', 'lbs-ii', 'chickweed'],
    price: 680,
    waMessage: 'Hola, quiero el *Programa Control de Peso* (Fat Grabbers + LBS II + Chickweed) por Q680. ¿Cómo lo pido?',
  },
  'inmunidad': {
    name: 'Programa Inmunidad Total',
    productIds: ['jugo-noni', 'echinacea', 'zambroza'],
    price: 1240,
    waMessage: 'Hola, quiero el *Programa Inmunidad Total* (Jugo de Noni + Ultimate Equinácea + Zambroza) por Q1,240. ¿Cómo lo pido?',
  },
  'articular': {
    name: 'Programa Salud Articular',
    productIds: ['glucosamine', 'chondroitin', 'una-de-gato'],
    price: 880,
    waMessage: 'Hola, quiero el *Programa Salud Articular* (Glucosamine + Chondroitin + Uña de Gato) por Q880. ¿Cómo lo pido?',
  },
  'estres': {
    name: 'Programa Anti-Estrés',
    productIds: ['nutri-calm', 'str-j', 'aps-ii'],
    price: 840,
    waMessage: 'Hola, quiero el *Programa Anti-Estrés* (Nutri Calm + STR-J + APS II) por Q840. ¿Cómo lo pido?',
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
      <div class="product-img${p.img ? ' product-img--photo' : ''}">
        ${p.img
          ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='${p.emoji}';this.parentElement.classList.remove('product-img--photo')">`
          : p.emoji}
      </div>
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
    antioxidante: 'Antioxidante',
    belleza:      'Belleza',
    bienestar:    'Bienestar General',
    detox:        'Detox',
    digestivo:    'Digestivo',
    inmune:       'Inmunológico',
    deportiva:    'Nutrición Deportiva',
    articular:    'Salud Articular',
    metabolica:   'Salud Metabólica',
    mental:       'Vigor Mental',
    vitaminas:    'Vitaminas y Minerales',
    energia:      'Energía',
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
