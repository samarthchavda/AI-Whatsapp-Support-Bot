# Kwickbot admin (new super admin panel)

The redesigned super admin panel, built from scratch with Vite + React. Only accounts
with the `super_admin` role can log in; merchants keep using their dashboard.

The current dashboard in `../frontend` (merchant and super admin) is untouched and still
runs production. This folder is not part of the deploy yet. Pages move here one at a
time; until a page is rebuilt, its menu item opens the same page in the current dashboard.

## Run it

See `../README.md` for the full local setup (local database copy + local backend).

```bash
npm install
npm run dev            # http://localhost:5173
```

The dev server proxies `/api` and `/socket.io` to `VITE_API_PROXY`: by default the local backend
(`http://localhost:5002`, started with `../start-local-backend.sh`) on the local database copy.
Set `VITE_API_PROXY=https://admin.kwickbot.in` only when you deliberately want live data.

## Login and sessions

Login is the same as today, with no backend changes:

- `POST /api/auth/login` with email and password, the same call as the public site's `/login`
- only a `super_admin` result is accepted; a merchant login is refused and nothing is stored
- the token is stored under the same `accessToken`, `token` and `admin` keys
- a 401 triggers one `POST /api/auth/refresh` through the existing refresh cookie
- logout calls `POST /api/auth/logout` and clears the same keys as the current dashboard

On the same domain a super admin session works in both dashboards. Routes use the same
`/dashboard/super-admin/...` paths, so the switch-over is only a server change.

## Design direction

Built with [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky
([@heydamir](https://x.com/heydamir)), licensed CC BY 4.0.

- **Product.** The Kwickbot team's console for running merchant accounts, plans, WhatsApp health and revenue
- **Character.** Exact, calm, accountable
- **World.** An operations desk: a ledger of stores, numbers and payments
- **Moments.** The merchants table and the plan breakdown carry the data; everything else stays quiet
- **Signature.** A small live status dot for each merchant's WhatsApp connection, used only for connection state

Rules the code follows:

- Graphite neutral ramp for every surface, light by default, dark from the system or the theme toggle
- One accent, chat green (`--accent`), for the primary action, the selection and one key figure
- 4px spacing grid; sidebar 256 wide, nav rows 34 tall, page padding 32
- Geist for the interface, Geist Mono for meta and figures; weights 400 to 600; sentence case
- lucide icons at 16px with a 1.5 stroke, in the text colour
- No gradients, glows, emoji, uppercase tracked labels or looping animation
- Stat cards are a label, a figure and what it compares to

All values live in `src/styles/tokens.css`.

## Structure

```
src/
  lib/          api client, auth, navigation, formatting
  styles/       tokens, base, components, layout
  components/
    ui/         Button, Field, SelectField, Card, StatCard, EmptyState, ConfirmDialog
    layout/     AppShell, Sidebar, TopBar
  pages/        Login, NotRebuilt, superAdmin/Merchants, superAdmin/MerchantDetail
```

## Rebuilt so far

| Page | Status |
| --- | --- |
| Login | Done (same endpoint and storage, super admins only) |
| Merchants | Done (totals, searchable merchant table, merchants by plan) |
| Merchant detail | Done (usage, plan and billing form, log in as merchant, activate/deactivate, log out sessions, reset AI usage, delete with typed confirmation, page access, feature switches, WhatsApp numbers and check, offline alert email, store status) |
| Plans | Done (list with subscribers and checks, publish, reorder, duplicate, delete; editor for pricing, trial, billing options, pages, features, limits, support, visibility) |
| Coupons and offers | Done (percent or fixed, plans, monthly/yearly, dates, total and per-merchant limits, new customers only; offers apply automatically) |
| Everything else | Opens the current dashboard |
