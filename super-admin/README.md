# Super admin (new) – separate workspace

Everything for the new super admin lives here, apart from the live product.
Nothing in this folder is deployed, and by default nothing here talks to production.

```
super-admin/
  panel/                    New super admin panel (Vite + React)
  api/                      New super admin backend: plans, coupons, offers, pricing, website promotions
  start-local-api.sh        Runs api/ against the local copy (port 5003)
  local-db/
    copy-from-production.sh Copies production MongoDB to a local database (read-only on production)
    sanitize.js             Removes tokens, credentials and secrets from the local copy
  local-backend/
    guard.js                Blocks remote MongoDB and all outbound network for the local backend
  start-local-backend.sh    Runs ../backend against the local copy, safely
```

## Run it

Three terminals, in this order:

```bash
# 1. Once, or whenever you want fresh data from production
super-admin/local-db/copy-from-production.sh
```

```bash
# 2. Backend on the local copy (http://localhost:5002)
super-admin/start-local-backend.sh
```

```bash
# 3. New super admin API (http://localhost:5003/sa-api/v1)
super-admin/start-local-api.sh
```

```bash
# 4. Panel (http://localhost:5173)
npm --prefix super-admin/panel run dev
```

Log in with your normal super admin email and password. Password hashes are copied,
so the same password works locally.

## Why nothing reaches production

- **Copy:** `copy-from-production.sh` only runs `mongodump` against production (a read).
  It restores into `mongodb://127.0.0.1:27017/kwickbot_superadmin_local`.
- **Clean copy:** `sanitize.js` removes WhatsApp/Meta tokens, store and CRM
  credentials, API keys, webhook secrets and URLs, reset tokens and sessions, and turns
  the WhatsApp Web bot off. It refuses to run on anything but the local database.
- **Local backend:** `start-local-backend.sh` starts `../backend` from `local-backend/`,
  so it loads a generated `.env` with only local values (every key from `backend/.env`
  is listed blank, so nothing can be filled in from production). Scheduled jobs are off,
  and JWT secrets are local, so production sessions don't work here.
- **Guard:** `local-backend/guard.js` is preloaded. It stops the process if anything
  connects to a MongoDB other than 127.0.0.1, and blocks every outbound network
  connection (email, WhatsApp/Meta, Razorpay, Gemini, Shopify, Atlas).
- **Panel:** `panel/.env` points at the local backend. Switching it to
  `https://admin.kwickbot.in` is the only way to use live data, and that is a deliberate
  edit.

Changes you make in the panel (plans, page access, deactivate, delete) only change
the local copy. Running the copy script again replaces it with fresh production data.

## Notes

- The backend's startup tasks (blog seed, plan-access migration, permission-profile
  seed) run against the local copy each time the local backend starts.
- "Log in as merchant", "Check connection" and "Email offline alert" can't reach Meta or
  email locally; they fail safely.

## The new backend (api/)

A separate Express service. It never changes `../backend`; it reads and writes the
same MongoDB collections (`pricingplans`, `coupons`) and reads `admins` and `invoices`.

| Path (under `/sa-api/v1`) | Who | What |
| --- | --- | --- |
| `/plans` | super admin | list, create, edit, publish, reorder, duplicate, archive/delete, restore |
| `/coupons` | super admin | coupons and offers: create, edit, on/off, delete |
| `/public/promotions` | anyone | running coupons/offers marked "Show on website" (website banner) |
| `/internal/quote`, `/internal/check-code`, `/internal/redeem` | main backend only (`X-Internal-Key`) | checkout price, coupon check, count a use |

Login is the main backend's: the same access token works here (same `JWT_ACCESS_SECRET`),
super admins only, never a "log in as merchant" token.

Standard plans (starter, growth, scale, crm_*, api_*, custom_automation) are **archived**,
not deleted, because the main backend's startup migration would recreate them.

### Pricing rules
Plan price + one-time setup fee, minus the **single biggest** of: the coupon typed,
any running offer, the merchant's personal discount. Discounts apply to the plan price,
not the setup fee, and never stack.

### Main backend hook (only addition to ../backend)
`backend/services/superAdminPricingHook.js` plus a few added lines in
`backend/controllers/public/authController.js` (nothing removed). Turned on only when the
main backend has both:

```
SUPER_ADMIN_API_URL=http://127.0.0.1:5003/sa-api/v1
SUPER_ADMIN_API_KEY=<same as INTERNAL_API_KEY in api/>
```

If they are not set, or the API is down or slow (2.5 s), checkout works exactly as before.

## Website banner (next-public)

`next-public/app/components/PromoBanner.jsx` shows a scrolling strip above the header
with coupons and offers marked **Show on website**, e.g. "Use code SAVE20 to get 20% off
Growth". Click a code to copy it; it pauses on hover; no animation with reduced motion.
Coupons without that switch still work at checkout and are never shown. The website
reaches the API at `/sa-api` (`SA_API_URL` in next.config, default `http://localhost:5003`).
If the API is not reachable, the banner is simply not shown.

## Going live later (not done)
1. Run `api/` on the server (PM2) with `MONGODB_URI`, `JWT_ACCESS_SECRET`, `INTERNAL_API_KEY`.
2. nginx: route `/sa-api/` to it.
3. Main backend `.env`: `SUPER_ADMIN_API_URL`, `SUPER_ADMIN_API_KEY`.
4. Deploy workflow: install and restart `api/`.
