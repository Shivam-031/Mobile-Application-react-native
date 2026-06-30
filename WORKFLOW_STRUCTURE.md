# 🌿 Green Yatra India — Workflow Structure

> How data and requests move through the three-app monorepo.
> `README.md` describes *what the app is*; `DEPLOYMENT_ROADMAP.md` describes *how to ship it*;
> this document describes **what happens to a user action from tap-to-render**.

---

## 🧭 Big Picture

Three apps, one source of truth (the `backend/` API). The mobile app is read-heavy with a thin write layer (orders, carbon logs, plant reports). The admin app is write-heavy (approvals, stock edits, role changes). Branches are the bridge — each state gets exactly one branch, each branch has exactly one EMPLOYEE manager, and that EMPLOYEE owns the products submitted under their state.

```
                    ┌───────────────────────────────────────────────┐
                    │                 MongoDB Atlas                 │
                    │  users · branches · products · plants · orders│
                    │  carbon · inventory · analytics · locations   │
                    └──────────────────────▲────────────────────────┘
                                           │
                       /api/v1/* (REST, JWT bearer)
                                           │
        ┌──────────────────────────────────┴──────────────────────────────────┐
        │                                 │                                   │
   ┌────┴──────────────┐         ┌────────┴──────────────┐         ┌─────────┴────────┐
   │  Admin (Next.js)  │         │ Backend (Express)     │         │ Mobile (RN)      │
   │  Master Admin UI  │         │  • JWT auth           │         │  USER + EMPLOYEE │
   │  approves/stocks  │◄───────►│  • role gates         │◄───────►│  browse + cart    │
   │  user mgmt        │         │  • rate-limit         │         │  carbon logger   │
   └───────────────────┘         │  • morgan logging     │         └──────────────────┘
                                 │  • Cloudinary uploads │
                                 │  • FCM push           │
                                 └───────────────────────┘
```

---

## 🧑‍🤝‍🧑 Roles & Their Capabilities

The auth boundary is enforced **server-side** via `protect` + `authorize(...roles)` middleware in
`backend/src/middleware/authMiddleware.js`. The frontend mirrors the same boundary as defence in depth.

| Capability                               | USER | EMPLOYEE | MASTER_ADMIN |
|------------------------------------------|:----:|:--------:|:------------:|
| Browse marketplace / plant species       |  ✅  |    ✅    |      ✅      |
| Place orders                             |  ✅  |    ✅    |      ✅      |
| Log own carbon footprint                 |  ✅  |    ✅    |      ✅      |
| Submit a product for their state         |  ❌  |    ✅    |      ✅      |
| Edit stock on their own products         |  ❌  |    ✅    |      ✅      |
| View branch-scoped analytics             |  ❌  |    ✅    |      ✅      |
| Approve / reject products                |  ❌  |    ❌    |      ✅      |
| Promote users, edit stock globally       |  ❌  |    ❌    |      ✅      |
| View platform-wide analytics dashboard   |  ❌  |    ❌    |      ✅      |

> The seed script (`backend/src/seeds/seedData.js`) creates one `MASTER_ADMIN` and 15 `EMPLOYEE`
> users — one per supported Indian state.

---

## 🔁 Core Workflows

### 1. Product Submission & Approval Funnel

This is the most important flow in the app. A product moves through **three states** (`pending` → `approved` / `rejected`), gated by role and visible across all three apps.

```
 EMPLOYEE                backend                  MASTER_ADMIN              MOBILE USER
 ────────                ───────                  ────────────              ───────────
 │                       │                         │                         │
 │ POST /products        │                         │                         │
 │ (status=pending,      │                         │                         │
 │  branchId=self)       │                         │                         │
 ├──────────────────────►│                         │                         │
 │                       │ save to Mongo           │                         │
 │                       │ branchId set from JWT   │                         │
 │                       │                         │                         │
 │                       │ GET /products?status=…  │                         │
 │                       │◄────────────────────────┤                         │
 │                       │                         │ Approvals page shows    │
 │                       │ render pending queue    │ every pending product   │
 │                       │                         │ (state, branch, photos) │
 │                       │                         │                         │
 │                       │ PATCH /products/:id/    │                         │
 │                       │   approve {status,      │                         │
 │                       │    adminNote}           │                         │
 │                       ├────────────────────────►│                         │
 │                       │                         │                         │
 │                       │ if approved, product    │                         │
 │                       │ now appears in          │                         │
 │                       │ GET /products (no filter)│                         │
 │                       │◄──────────────────────────────────────────────────┤
 │                       │                         │                         │
 │                       │                         │ Marketplace tab filters │
 │                       │                         │ status=approved only —  │
 │                       │                         │ so revoked/rejected     │
 │                       │                         │ items vanish live       │
```

**Where in the code:**
- Submit: `mobile/src/screens/product/...` or the admin branch-equivalent → `POST /products`
- Review: `admin/src/app/approvals/page.jsx` → `GET /products?status=all` → `PATCH /products/:id/approve`
- Display: `mobile/src/screens/marketplace/...` → `GET /products` (with `status: 'approved'` filter applied client- and server-side)

---

### 2. Order & Checkout Flow

```
 USER (Mobile)              backend                       Notes
 ────────────               ───────                       ─────
 │ Browse approved products │                              filtered server-side
 ├─────────────────────────►│                              GET /products?status=approved
 │ Tap "Add to cart"        │                              client-side Redux slice,
 │ (no server call)         │                              persisted in
 │                          │                              AsyncStorage until checkout
 │
 │ Checkout                 │
 │  → POST /orders          │
 │  (cart items, address)   │
 ├─────────────────────────►│                              creates Order doc with
 │                          │                              • userId from JWT
 │                          │                              • shipping address
 │                          │                              • totalAmount, totalCarbonSaved
 │                          │                              • status: 'placed'
 │
 │ 201 + order summary      │
 │◄─────────────────────────┤
 │
 │ My Orders tab            │
 │ GET /orders/my           │
 ├─────────────────────────►│
 │                          │ role-scoped query (req.user._id)
 │◄─────────────────────────┤
```

**Where in the code:**
- `mobile/src/store/slices/cartSlice.js` — local cart state (no server involvement)
- `mobile/src/screens/checkout/...` — calls `POST /orders`, then `GET /orders/my`
- `backend/src/modules/orders/` — order schema + controller

---

### 3. Carbon Footprint Logging

The carbon module is the gamification layer. Users log travel / energy choices; the backend computes
CO₂ impact and stores it; the admin analytics page aggregates platform-wide trends from it.

```
 USER                  CarbonCalculator screen          backend                   admin
 ────                  ─────────────────────            ───────                   ─────
 │ inputs (km, mode)    │
 ├─────────────────────►│
 │                      │ POST /carbon/calculate
 │                      │ { distance, transport, … }
 │                      ├──────────────────────────────►│
 │                      │                              │ compute CO₂ in kg
 │                      │                              │ persist Carbon doc
 │                      │                              │ linked to user
 │                      │◄─────────────────────────────┤
 │                      │ 201 + { totalCarbon, score } │
 │◄─────────────────────┤
 │ updates local Redux  │
 │ greenScore increment │
 │
 │                      │                              │ GET /analytics/dashboard
 │                      │                              │ aggregates ALL carbon
 │                      │                              │ across users
 │                      │                              ├───────────────────────►│
 │                      │                              │                       │ renders CO₂ trend
 │                      │                              │                       │ chart in
 │                      │                              │                       │ /admin/analytics
```

---

### 4. Branch & State Management

Branches are the per-state operational unit — exactly one per state, exactly one EMPLOYEE manager.

- **Created by:** `POST /branches` (admin-only) or by the seed script.
- **Read:** `GET /branches` (public) — feeds the mobile **India Map** screen (per-state aggregations) and the admin **State Management** page.
- **Owned products:** a Product has `branchId` (the EMPLOYEE's `_id`), not the branch's `_id`. This keeps the relationship user-centric so an Employee who leaves doesn't orphan their products.
- **Stats:** `Branch.stats.{ totalProducts, totalOrders, totalCarbonImpact, totalRevenue, plantCount }` are denormalized counters — the admin "State Management" page reads them directly so it's a single round trip per page load.

---

### 5. Mobile Map → Backend → Admin

This is the **core visualization loop** that ties mobile and admin together:

1. `mobile/src/screens/map/IndiaMapScreen` renders a per-state SVG heatmap (no basemap tiles), keyed off the `/locations/states/:name/stats` endpoint.
2. Tapping a state shows that state's products, plants, and carbon metrics — same data the admin sees under **State Management**.
3. The admin uses State Management to verify coverage, spot underrepresented states, and audit branch performance.

---

## 🔐 Auth Lifecycle

```
register ──► POST /auth/register ──► USER role + email/password (bcrypt-hashed, 12 rounds)
            │
            │  sets ADMIN_SIGNUP_KEY / EMPLOYEE_SIGNUP_KEY gate keys
            │  (env-driven) so random users can't self-promote.
            │
            ▼
login    ──► POST /auth/login    ──► accessToken (JWT, 7d, HS256)
            │                      refreshToken (JWT, 30d, stored hashed in DB)
            │                      Login rate-limited: 10 attempts / 15 min per IP
            │                      (authLimiter in backend/src/app.js)
            ▼
each request ──► `Authorization: Bearer <accessToken>`
            │     middleware/authMiddleware.js:
            │       protect      → verifies JWT, attaches req.user
            │       authorize()  → checks role against allowlist
            │
            │     401 → frontend interceptor clears cookies + redirects /login
            │     403 → same (stale / wrong-role token)
            │
            ▼
refresh   ──► POST /auth/refresh-token (manual trigger, not automatic yet)
              issues a new accessToken using the refresh token
```

> **Tokens live in cookies (admin) / AsyncStorage (mobile).** The admin uses `js-cookie`
> because Next.js middleware can read it; mobile uses AsyncStorage and re-attaches it
> via an axios interceptor in `mobile/src/services/apiService.js`.

---

## 📦 Request Lifecycle (Generic)

A single API call from any client looks like this end-to-end:

```
1. Client side
   ├── axios.get('/products?status=approved')
   ├── api.interceptors.request  → inject Authorization header from storage
   └── api.interceptors.response → on 401/403 → clear storage + redirect /login

2. Network
   └── HTTPS / CORS check
       (CORS allowlist is read from env CORS_ORIGINS in backend/src/config/cors.js;
        falls back to admin.greenyatra.in)

3. Backend — backend/src/app.js pipeline
   ├── helmet()                  → security headers
   ├── morgan('combined', { skip: healthz, … })
   │                             → redacts token/accessToken/refreshToken
   ├── express.json()            → body parser
   ├── express.urlencoded(...)
   ├── rate limiters             → authLimiter (10/15min), apiLimiter (elsewhere)
   ├── /api/v1 → route registry  (src/routes/index.js)
   │   ├── /auth        → authRoutes
   │   ├── /users       → userRoutes
   │   ├── /products    → productRoutes
   │   ├── /inventory   → inventoryRoutes
   │   ├── /plants      → plantRoutes
   │   ├── /carbon      → carbonRoutes
   │   ├── /orders      → orderRoutes
   │   ├── /locations   → locationRoutes
   │   ├── /analytics   → analyticsRoutes
   │   └── /branches    → branchRoutes
   └── per-route: protect → authorize(...roles) → controller → service → mongoose

4. Controller/Service
   ├── Validate input            (express-validator in middleware/validateMiddleware.js)
   ├── DB query                  (Mongoose models in src/modules/<feature>/model/)
   ├── Side effects              (Cloudinary upload, FCM push, etc — only when relevant)
   └── Response: { success, data, … } JSON

5. Client side (cont.)
   └── Update Redux / React Query cache → re-render
```

---

## 🖥️ Admin → Backend Page Map

| Admin page                | API endpoints used                                  | Role |
|---------------------------|-----------------------------------------------------|:----:|
| `/login`                  | `POST /auth/login`                                  | any  |
| `/dashboard`              | `GET /analytics/dashboard`                          | ADMIN|
| `/users`                  | `GET /users`, `PATCH /users/:id/role`               | ADMIN|
| `/products`               | `GET /products`                                     | ADMIN|
| `/approvals`              | `GET /products?status=all`, `PATCH /products/:id/approve` | ADMIN|
| `/inventory`              | `GET /inventory/admin`, `PATCH /inventory/admin/:id/stock` | ADMIN|
| `/plants`                 | `GET /plants`, `POST/PUT/DELETE`                    | ADMIN|
| `/states`                 | `GET /branches`, `GET /products`, `GET /plants`     | ADMIN|
| `/analytics`              | `GET /analytics/dashboard`                          | ADMIN|
| `/carbon-reports`         | (placeholder data + Recharts; awaiting real endpoint) | ADMIN|

---

## 📱 Mobile → Backend Screen Map

| Mobile screen                  | API endpoints used                                 |
|--------------------------------|----------------------------------------------------|
| `LoginScreen`                  | `POST /auth/login`                                 |
| `RegisterScreen`               | `POST /auth/register`                              |
| `HomeScreen`                   | `GET /analytics/dashboard`, `GET /products?featured`|
| `MarketplaceScreen`            | `GET /products?status=approved`                    |
| `ProductDetailScreen`          | `GET /products/:id`                                |
| `CartScreen`                   | local Redux only                                   |
| `CheckoutScreen`               | `POST /orders`, `GET /locations/states`            |
| `MyOrdersScreen`               | `GET /orders/my`                                   |
| `OrderDetailScreen`            | `GET /orders/:id`                                  |
| `CarbonCalculatorScreen`       | `POST /carbon/calculate`, `GET /carbon/history`    |
| `PlantExplorerScreen`          | `GET /plants`, `GET /plants/stats/summary`         |
| `IndiaMapScreen`               | `GET /locations/states`, `GET /locations/states/:name/stats` |
| `ProfileScreen`                | `GET /auth/me`, `GET /orders/my`                   |
| `NotificationsScreen`          | FCM device token + backend history (pending wire-up)|

---

## 🛂 Permission Boundaries (Recap, where enforced)

| Concern                  | Where enforced                                          |
|--------------------------|---------------------------------------------------------|
| Token validity           | `middleware/authMiddleware.js` → `protect`              |
| Role gating              | `middleware/authMiddleware.js` → `authorize(...roles)`  |
| Cross-origin             | `config/cors.js`, env `CORS_ORIGINS`                     |
| Brute-force login        | `authLimiter` in `backend/src/app.js` (10 / 15 min)      |
| Secret redaction in logs | morgan tokens (`safe-url`, `safe-body`) in `app.js`     |
| Strict role on frontend  | Defence-in-depth `<role>` gate in admin pages that |
|                          | call admin-only endpoints (e.g. `/inventory/admin`)    |

---

## 🔄 Data Lifecycle Summary

```
                      ┌─────────────┐
                      │   USER      │
                      └──────┬──────┘
                             │ register/login
                             ▼
   ┌─────────────────────────────────────────────────────┐
   │ MongoDB                                            │
   │  users  ─► orders ─► address snapshots             │
   │     │                                               │
   │     └──► carbon logs (1 per calculate call)        │
   │                                                     │
   │  branches ◄── EMPLOYEE (one per state)             │
   │     │                                               │
   │     └──► products (pending → approved/rejected)     │
   │                                                     │
   │  plants (singleton admin-curated)                   │
   └─────────────────────────────────────────────────────┘
         ▲                                ▲
         │ read                           │ write (only EMPLOYEE owns)
         │                                │
   ┌─────┴───────┐                ┌───────┴────────┐
   │   Mobile    │                │     Admin      │
   │   (USER)    │                │  (MASTER_ADMIN)│
   └─────────────┘                └────────────────┘
        read-heavy                      write-heavy
```

---

## 📂 Where to Find Things

| Concern                            | File(s)                                                  |
|------------------------------------|----------------------------------------------------------|
| Routing map                        | `backend/src/routes/index.js`                            |
| Auth + role middleware             | `backend/src/middleware/authMiddleware.js`               |
| Seed data (15 states, 39 products) | `backend/src/seeds/seedData.js`                          |
| CORS allowlist                     | `backend/src/config/cors.js`                             |
| Request log redaction              | `backend/src/app.js` (morgan tokens)                     |
| Admin API client + auth interceptor| `admin/src/lib/api.js`                                   |
| Mobile API client + auth interceptor| `mobile/src/services/apiService.js`                     |
| Mobile API base URL                | `mobile/src/constants/api.js` (`__DEV__` switch)        |
| Admin responsive shell             | `admin/src/components/common/AdminLayout.jsx`            |
| Shared admin table (mobile-aware)  | `admin/src/components/common/ResponsiveTable.jsx`        |
| Deployment infra                   | `deploy/render.yaml`, `deploy/Dockerfile.*`              |
| Setup walkthrough                  | `README.md`                                              |
| Launch plan                        | `DEPLOYMENT_ROADMAP.md`                                  |

---

> **One rule of thumb** — the backend is the only source of truth.
> Mobile and admin both reflect what the API returns; the seed script
> is the fastest way to give them something real to show.
