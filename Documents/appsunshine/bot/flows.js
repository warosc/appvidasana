/* ============================================
   WHATSAPP BOT CONVERSATION FLOWS
   Vida Saludable Guatemala
   ============================================ */

'use strict';

// ============================================
// PROGRAMS DATA
// ============================================
const PROGRAMS = {
  'peso-rapido': {
    name: 'Programa Bajar de Peso Rápido ⚡',
    products: ['✓ Fat Grabbers', '✓ Carbo Grabbers', '✓ LBS-II'],
    price: 'Q 1,170',
    benefit: 'Resultados visibles desde la primera semana',
  },
  'peso-progresivo': {
    name: 'Programa Bajar de Peso Progresivo 🌱',
    products: ['✓ Super Vitamins & Minerals', '✓ Chlorophyll Liquid', '✓ Thai-Go'],
    price: 'Q 600',
    benefit: 'Pérdida de peso saludable y sostenible',
  },
  'energia': {
    name: 'Programa Más Energía ⚡',
    products: ['✓ Nutri-Calm', '✓ B-Complex', '✓ Zambroza'],
    price: 'Q 520',
    benefit: 'Siente la diferencia desde los primeros días',
  },
  'digestion': {
    name: 'Programa Mejor Digestión 🌿',
    products: ['✓ Probiotic 11', '✓ Aloe Vera Gel', '✓ Cascara Sagrada'],
    price: 'Q 525',
    benefit: 'Bienestar intestinal en 7 días',
  },
};

// ============================================
// STATE KEYS
// ============================================
const STATE = {
  START: 'start',
  MAIN_MENU: 'main_menu',
  GOAL_PESO: 'goal_peso',
  GOAL_ENERGIA: 'goal_energia',
  GOAL_DIGESTION: 'goal_digestion',
  CATALOG: 'catalog',
  PROGRAM_DETAIL: 'program_detail',
  CONFIRM_ORDER: 'confirm_order',
  COLLECT_LOCATION: 'collect_location',
  COLLECT_PAYMENT: 'collect_payment',
  DONE: 'done',
  HUMAN_HANDOFF: 'human_handoff',
};

// ============================================
// FLOW ENGINE
// ============================================

/**
 * Process an incoming message and return the bot response.
 * @param {string} from - Sender phone number (e.g. whatsapp:+50212345678)
 * @param {string} body - Message text
 * @param {object} sessions - Session store (mutated in place)
 * @returns {string|null} - Response message, or null if no response needed
 */
function processMessage(from, body, sessions) {
  const text = body.trim().toLowerCase();

  // Initialize session
  if (!sessions[from]) {
    sessions[from] = { state: STATE.START, data: {} };
  }
  const session = sessions[from];

  // Global: human handoff triggers
  if (['asesor', 'humano', 'persona', 'agente', 'ayuda'].some(k => text.includes(k))) {
    session.state = STATE.HUMAN_HANDOFF;
    return responses.humanHandoff();
  }

  // Route by state
  switch (session.state) {
    case STATE.START:
    case STATE.MAIN_MENU:
      return handleMainMenu(text, session);

    case STATE.GOAL_PESO:
      return handlePesoGoal(text, session);

    case STATE.GOAL_ENERGIA:
      return handleEnergiaGoal(text, session);

    case STATE.GOAL_DIGESTION:
      return handleDigestionGoal(text, session);

    case STATE.CATALOG:
      return handleCatalog(text, session);

    case STATE.PROGRAM_DETAIL:
      return handleProgramDetail(text, session);

    case STATE.CONFIRM_ORDER:
      return handleConfirmOrder(text, session);

    case STATE.COLLECT_LOCATION:
      return handleCollectLocation(text, body, session);

    case STATE.COLLECT_PAYMENT:
      return handleCollectPayment(text, session);

    case STATE.DONE:
      return handleDone(text, session);

    default:
      session.state = STATE.MAIN_MENU;
      return responses.mainMenu();
  }
}

// ============================================
// STATE HANDLERS
// ============================================

function handleMainMenu(text, session) {
  // Greetings
  if (isGreeting(text)) {
    session.state = STATE.MAIN_MENU;
    return responses.welcome();
  }

  // Main menu options
  if (text === '1' || text.includes('bajar') || text.includes('peso')) {
    session.state = STATE.GOAL_PESO;
    return responses.pesoSpeed();
  }
  if (text === '2' || text.includes('energía') || text.includes('energia') || text.includes('cansancio')) {
    session.state = STATE.PROGRAM_DETAIL;
    session.data.selectedProgram = 'energia';
    return responses.programDetail('energia');
  }
  if (text === '3' || text.includes('digestión') || text.includes('digestion') || text.includes('intestino')) {
    session.state = STATE.PROGRAM_DETAIL;
    session.data.selectedProgram = 'digestion';
    return responses.programDetail('digestion');
  }
  if (text === '4' || text.includes('catálogo') || text.includes('catalogo') || text.includes('productos')) {
    session.state = STATE.CATALOG;
    return responses.catalog();
  }

  // Default: show main menu
  session.state = STATE.MAIN_MENU;
  return responses.mainMenu();
}

function handlePesoGoal(text, session) {
  if (text === '1' || text.includes('rápido') || text.includes('rapido')) {
    session.state = STATE.PROGRAM_DETAIL;
    session.data.selectedProgram = 'peso-rapido';
    return responses.programDetail('peso-rapido');
  }
  if (text === '2' || text.includes('progresivo') || text.includes('gradual') || text.includes('lento')) {
    session.state = STATE.PROGRAM_DETAIL;
    session.data.selectedProgram = 'peso-progresivo';
    return responses.programDetail('peso-progresivo');
  }
  return responses.pesoSpeed(); // re-prompt
}

function handleEnergiaGoal(text, session) {
  session.state = STATE.PROGRAM_DETAIL;
  session.data.selectedProgram = 'energia';
  return responses.programDetail('energia');
}

function handleDigestionGoal(text, session) {
  session.state = STATE.PROGRAM_DETAIL;
  session.data.selectedProgram = 'digestion';
  return responses.programDetail('digestion');
}

function handleCatalog(text, session) {
  // Any product interest → redirect to program selection
  session.state = STATE.MAIN_MENU;
  return responses.mainMenuAfterCatalog();
}

function handleProgramDetail(text, session) {
  if (text === '1' || isYes(text)) {
    session.state = STATE.COLLECT_LOCATION;
    return responses.collectLocation();
  }
  if (text === '2' || text.includes('info') || text.includes('más') || text.includes('mas')) {
    session.state = STATE.HUMAN_HANDOFF;
    return responses.moreInfo(session.data.selectedProgram);
  }
  if (isNo(text) || text === '3') {
    session.state = STATE.MAIN_MENU;
    return responses.backToMenu();
  }
  return responses.programDetailReprompt();
}

function handleConfirmOrder(text, session) {
  if (isYes(text)) {
    session.state = STATE.COLLECT_LOCATION;
    return responses.collectLocation();
  }
  if (isNo(text)) {
    session.state = STATE.MAIN_MENU;
    return responses.backToMenu();
  }
  return responses.confirmReprompt();
}

function handleCollectLocation(text, body, session) {
  // Accept any location text / shared location
  session.data.location = body;
  session.state = STATE.COLLECT_PAYMENT;
  return responses.collectPayment();
}

function handleCollectPayment(text, session) {
  session.data.paymentMethod = text;
  session.state = STATE.DONE;
  return responses.orderConfirmed(session.data);
}

function handleDone(text, session) {
  if (isGreeting(text) || text.includes('otro') || text.includes('más')) {
    session.state = STATE.MAIN_MENU;
    return responses.welcome();
  }
  return responses.orderFollowUp();
}

// ============================================
// RESPONSE TEMPLATES
// ============================================
const responses = {
  welcome() {
    return (
      '¡Hola! 👋 Bienvenido a *Vida Saludable Guatemala* 🌿\n\n' +
      'Somos consultores independientes de productos Nature\'s Sunshine (NSP).\n\n' +
      '¿En qué te gustaría mejorar hoy?\n\n' +
      '1️⃣ Bajar de peso\n' +
      '2️⃣ Más energía y vitalidad\n' +
      '3️⃣ Mejor digestión\n' +
      '4️⃣ Ver catálogo completo\n\n' +
      '_Escribe el número de tu opción_ 👇'
    );
  },

  mainMenu() {
    return (
      '🌿 *¿En qué podemos ayudarte?*\n\n' +
      '1️⃣ Bajar de peso\n' +
      '2️⃣ Más energía y vitalidad\n' +
      '3️⃣ Mejor digestión\n' +
      '4️⃣ Ver catálogo completo\n\n' +
      'Escribe el número de tu opción 👇'
    );
  },

  mainMenuAfterCatalog() {
    return (
      '¿Te interesó alguno de nuestros productos? 🌿\n\n' +
      'Para ayudarte mejor, dime tu objetivo:\n\n' +
      '1️⃣ Bajar de peso\n' +
      '2️⃣ Más energía\n' +
      '3️⃣ Mejor digestión\n\n' +
      'O escribe *asesor* para hablar con una persona.'
    );
  },

  pesoSpeed() {
    return (
      'Perfecto 💪 *¿Cómo quieres bajar de peso?*\n\n' +
      '1️⃣ *Rápido* — Resultados intensivos en pocas semanas\n' +
      '2️⃣ *Progresivo* — Pérdida sostenible y saludable\n\n' +
      'Escribe 1 o 2 👇'
    );
  },

  programDetail(programId) {
    const p = PROGRAMS[programId];
    if (!p) return responses.mainMenu();
    return (
      `✨ *Te recomendamos:*\n\n` +
      `📦 *${p.name}*\n\n` +
      p.products.join('\n') + '\n\n' +
      `💰 *Precio: ${p.price}*\n` +
      `✅ ${p.benefit}\n\n` +
      `*¿Deseas pedirlo?*\n\n` +
      `1️⃣ Sí, quiero ordenar\n` +
      `2️⃣ Quiero más información\n` +
      `3️⃣ Ver otras opciones`
    );
  },

  programDetailReprompt() {
    return 'Por favor escribe *1* para ordenar, *2* para más info o *3* para ver otras opciones. 😊';
  },

  moreInfo(programId) {
    const p = PROGRAMS[programId] || { name: 'este programa' };
    return (
      `¡Claro! 😊 Un asesor te contactará en breve con toda la información sobre *${p.name}*.\n\n` +
      `También puedes visitar nuestra web:\n` +
      `🌐 vidasaludableguatemala.com\n\n` +
      `¡Gracias por tu interés! 🌿`
    );
  },

  collectLocation() {
    return (
      '¡Perfecto! 🙌 ¡Estamos procesando tu pedido!\n\n' +
      '📍 *¿Cuál es tu dirección de entrega?*\n\n' +
      'Puedes escribir tu dirección o compartir tu ubicación de WhatsApp.\n\n' +
      '_Entregamos en toda Guatemala en 24-72 horas._'
    );
  },

  collectPayment() {
    return (
      '✅ *Dirección registrada.*\n\n' +
      '💳 *¿Cuál es tu método de pago preferido?*\n\n' +
      '• Transferencia bancaria (Banrural, BAC, Banco Industrial, G&T)\n' +
      '• Depósito en efectivo\n' +
      '• Tarjeta de crédito/débito\n' +
      '• Efectivo contra entrega (solo Ciudad de Guatemala)\n\n' +
      'Escribe tu método de pago 👇'
    );
  },

  orderConfirmed(data) {
    return (
      '🎉 *¡Pedido registrado con éxito!*\n\n' +
      `📍 Dirección: ${data.location || 'Por confirmar'}\n` +
      `💳 Pago: ${data.paymentMethod || 'Por confirmar'}\n\n` +
      '⏱️ Un asesor te contactará en los próximos *30 minutos* para confirmar los detalles y coordinar el pago.\n\n' +
      '📦 Tiempo de entrega: 24-72 horas hábiles.\n\n' +
      '¡Gracias por confiar en *Vida Saludable Guatemala*! 🌿\n\n' +
      '_¿Tienes alguna otra pregunta?_'
    );
  },

  orderFollowUp() {
    return (
      'Estamos aquí para lo que necesites 🌿\n\n' +
      '¿Te puedo ayudar en algo más?\n\n' +
      '• Escribe *menu* para ver opciones\n' +
      '• Escribe *asesor* para hablar con una persona\n' +
      '• Visita: vidasaludableguatemala.com'
    );
  },

  backToMenu() {
    return responses.mainMenu();
  },

  confirmReprompt() {
    return 'Escribe *sí* para confirmar tu pedido o *no* para cancelar. 😊';
  },

  humanHandoff() {
    return (
      '¡Claro! 😊 Voy a conectarte con uno de nuestros asesores.\n\n' +
      '⏱️ Tiempo de respuesta estimado: *5-15 minutos* (lunes a sábado, 8AM-8PM).\n\n' +
      'Mientras esperas, puedes ver nuestro catálogo en:\n' +
      '🌐 vidasaludableguatemala.com\n\n' +
      '¡Gracias por tu paciencia! 🌿'
    );
  },

  catalog() {
    return (
      '🌿 *Catálogo Vida Saludable Guatemala*\n\n' +
      '*💊 Para Bajar de Peso:*\n' +
      '• Fat Grabbers — Q 180\n' +
      '• Carbo Grabbers — Q 150\n' +
      '• LBS-II — Q 165\n\n' +
      '*⚡ Para Más Energía:*\n' +
      '• Nutri-Calm — Q 165\n' +
      '• B-Complex — Q 145\n' +
      '• Zambroza — Q 210\n\n' +
      '*🌱 Para Digestión:*\n' +
      '• Probiotic 11 — Q 195\n' +
      '• Aloe Vera Gel — Q 185\n' +
      '• Cascara Sagrada — Q 145\n\n' +
      '*🥗 Antioxidantes y Vitaminas:*\n' +
      '• Chlorophyll Liquid — Q 195\n' +
      '• Thai-Go — Q 220\n' +
      '• Super Vitamins & Minerals — Q 185\n\n' +
      '¿Cuál te interesa o cuál es tu objetivo de salud?'
    );
  },
};

// ============================================
// FOLLOW-UP MESSAGES (scheduled)
// ============================================
const FOLLOWUP_MESSAGES = {
  // 10 minutes after no response
  tenMinutes(name) {
    return (
      `Hola ${name || ''}! 👋\n\n` +
      '¿Te gustaría que un asesor te ayude personalmente a elegir el mejor programa para ti? 🌿\n\n' +
      'Estamos aquí para orientarte sin compromiso. 😊'
    );
  },

  // Next day follow-up
  nextDay(name) {
    return (
      `¡Hola ${name || ''}! 👋 *Vida Saludable Guatemala* aquí.\n\n` +
      '¿Aún deseas mejorar tu salud con productos naturales? 🌿\n\n' +
      'Tenemos programas desde *Q 520* con resultados comprobados.\n\n' +
      '¿Te cuento más? Escríbeme cuando quieras. 😊'
    );
  },

  // 3-day follow-up
  threeDays(name) {
    return (
      `¡Hola ${name || ''}! 🌿\n\n` +
      'Solo quería recordarte que tenemos disponibles nuestros *programas naturales NSP* para ayudarte con tu salud.\n\n' +
      '👉 Escribe *1* para ver cómo bajamos de peso\n' +
      '👉 Escribe *2* para más energía\n' +
      '👉 Escribe *3* para mejor digestión\n\n' +
      'O visita: *vidasaludableguatemala.com*'
    );
  },
};

// ============================================
// UTILITIES
// ============================================
function isGreeting(text) {
  const greetings = ['hola', 'hi', 'hello', 'buenas', 'buenos', 'buen día', 'buen dia', 'saludos', 'ola', 'hey', 'inicio', 'start', 'menu'];
  return greetings.some(g => text.includes(g));
}

function isYes(text) {
  return ['si', 'sí', 'yes', 'ok', 'dale', 'listo', 'quiero', 'ordena', '1', 'claro', 'confirmo', 'afirmativo'].some(w => text === w || text.startsWith(w));
}

function isNo(text) {
  return ['no', 'nope', 'cancelar', 'cancel', 'otro', 'otra', '3'].some(w => text === w || text.startsWith(w));
}

module.exports = { processMessage, FOLLOWUP_MESSAGES, STATE };
