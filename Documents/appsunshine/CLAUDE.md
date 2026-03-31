# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vida Saludable Guatemala** — Sales platform for Nature's Sunshine Products (NSP) independent consultants in Guatemala. Two components:

1. **Static website** (`/`) — Landing page + ecommerce + blog
2. **WhatsApp bot** (`/bot/`) — Automated sales funnel via Twilio

> The Frutinve inventory system source lives under `OneDrive - Ufinet Latam/Documentos/OpticapPro/frutinve/` — separate project committed to git history.

## Structure

```
/
├── index.html              # Main landing page (SEO, catalog, cart, programs)
├── css/styles.css          # All styles (CSS variables, mobile-first)
├── js/app.js               # Cart logic, catalog render, WhatsApp send, analytics
├── blog/
│   ├── index.html          # Blog listing
│   └── *.html              # Individual SEO articles
├── bot/
│   ├── server.js           # Express + Twilio webhook + cron follow-ups
│   ├── flows.js            # Conversation state machine + response templates
│   ├── package.json
│   └── .env.example        # Required env vars
└── img/                    # Logos, OG images, favicon (add your own)
```

## Docker (recommended)

```bash
# First time — copy env file and fill credentials
cp bot/.env.example bot/.env

# Build and start both services
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# Logs
docker compose logs -f
docker compose logs -f web
docker compose logs -f bot

# Stop
docker compose down
```

Services after `up`:
- **Web** → http://localhost (nginx serving static site)
- **Bot** → http://localhost:3000/health

## WhatsApp Bot (without Docker)

```bash
cd bot
cp .env.example .env        # Fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, etc.
npm install
npm run dev                 # nodemon for development
npm start                   # production

# Expose locally for Twilio webhook during dev:
ngrok http 3000
# Then set webhook in Twilio console: https://<ngrok-url>/webhook
```

Key files:
- `flows.js` — All conversation logic: `processMessage(from, body, sessions)` → response string. Add new states to the `STATE` object and handle them in `processMessage()`.
- `server.js` — Webhook receiver, follow-up scheduler (node-cron), `/leads` and `/broadcast` internal endpoints (protected by `BOT_WEBHOOK_SECRET` header).

## Frontend Architecture

### Product & Program Data (`js/app.js`)
- `PRODUCTS[]` — Catalog with id, name, price, emoji, categories
- `PROGRAMS{}` — Bundles that map to product IDs + flat price + WhatsApp message
- Cart is stored in `localStorage` under key `vsg_cart`

### Key Functions
| Function | Purpose |
|---|---|
| `addToCart(productId)` | Add individual product |
| `addProgram(programId)` | Add bundle; fires FB Pixel `AddToCart` |
| `sendOrderWhatsApp()` | Formats cart as WhatsApp message and opens `wa.me` link |
| `renderCatalog(filter)` | Renders product grid filtered by category |
| `trackWhatsApp(source)` | Pushes to GTM `dataLayer` + fires FB Pixel `Lead` |

### Analytics Integration
- **Meta Pixel**: initialized in `<head>` of `index.html` — replace `TU_PIXEL_ID_AQUI`
- **Google Tag Manager**: initialized in `<head>` — replace `GTM-XXXXXXX`
- Events fired: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Lead`

## Configuration to Customize

| File | What to update |
|---|---|
| `js/app.js` | `CONFIG.whatsappNumber` — your Guatemala number (no `+`) |
| `index.html` | GTM ID, Meta Pixel ID, canonical URL, social links |
| `bot/.env` | Twilio credentials, WhatsApp FROM number |
| `bot/flows.js` | Product prices, program contents, response wording |
| All HTML files | `+50299999999` → your actual WhatsApp number |

## SEO Architecture

Each page has:
- `<title>` with primary keyword + brand
- `<meta name="description">` 150-160 chars
- Canonical URL
- Open Graph / Twitter Card
- JSON-LD structured data (Organization, WebSite, Article per blog post)
- `hreflang` not needed (GT-only site)

Blog articles use `Article` schema with `datePublished` / `dateModified`.

## Deployment

**Static site** (Netlify / Vercel / GitHub Pages):
- Upload root directory; no build step needed
- Set custom domain to `vidasaludableguatemala.com`

**WhatsApp bot** (Railway / Render / VPS):
- Set environment variables from `.env.example`
- Health check at `GET /health`
- Sessions are in-memory — restart clears them. For persistence, swap `sessions` and `leads` objects for Redis or a SQLite DB.
