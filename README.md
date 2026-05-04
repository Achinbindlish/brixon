# Brixon — Full Developer Documentation

> **App Name:** Brixon  
> **Bundle ID:** `com.brixonitaly.inventory`  
> **Platform:** iOS (Capacitor Hybrid App)  
> **Purpose:** Fabric trading and supply platform — browse articles, check stock, place WhatsApp orders.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Supabase Backend](#5-supabase-backend)
6. [Edge Functions](#6-edge-functions)
7. [Google Sheets Integration](#7-google-sheets-integration)
8. [Authentication & Roles](#8-authentication--roles)
9. [App Screens & Routing](#9-app-screens--routing)
10. [Key Components](#10-key-components)
11. [State Management (React Query)](#11-state-management-react-query)
12. [WhatsApp Order Flow](#12-whatsapp-order-flow)
13. [Admin Panel](#13-admin-panel)
14. [iOS / Capacitor Setup](#14-ios--capacitor-setup)
15. [Build & Deployment](#15-build--deployment)
16. [Environment Variables](#16-environment-variables)
17. [Common Gotchas](#17-common-gotchas)

---

## 1. Project Overview

Brixon is a B2B fabric trading app for a company based in Italy. Sales reps log in and can:

- **Search** fabric articles by article number (single or bulk mode)
- **Check stock** availability and price
- **Place orders** — redirected to WhatsApp with a pre-filled message
- **Admins** can manage orders, inventory, users, app content, and Google Sheets sync

The frontend is a React + Vite web app, **embedded inside a Capacitor iOS shell**. The web build (`/dist`) is copied into the iOS project at `ios/App/App/public/`. The backend is fully powered by **Supabase**.

---

## 2. Architecture

```
┌───────────────────────────────────────────────┐
│               iOS App (Capacitor)             │
│   ┌───────────────────────────────────────┐   │
│   │        React (Vite SPA)               │   │
│   │   - React Router DOM (routing)        │   │
│   │   - TanStack Query (server state)     │   │
│   │   - Tailwind CSS + Radix UI           │   │
│   └────────────────┬──────────────────────┘   │
│                    │ HTTP / WebSocket          │
└────────────────────┼──────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │     Supabase        │
          │  ┌───────────────┐  │
          │  │  Auth (GoTrue)│  │
          │  │  PostgreSQL   │  │
          │  │  Edge Funcs   │  │
          │  │  Storage      │  │
          │  │  Realtime     │  │
          │  └───────────────┘  │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Google Sheets API │
          │  (Inventory source) │
          └─────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Mobile Shell | Capacitor 8.3.1 + iOS |
| Frontend Framework | React 18.3.1 |
| Build Tool | Vite |
| Routing | React Router DOM v6 |
| Server State | TanStack Query (React Query) |
| Styling | Tailwind CSS |
| UI Components | Radix UI (Dialog, AlertDialog, Tooltip, Toast) |
| Icons | Lucide React |
| Component Variants | Class Variance Authority (CVA) |
| Notifications | Sonner (toast) |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| Inventory Data | Google Sheets via Service Account |
| Order Channel | WhatsApp `wa.me` deep link |
| Language | JavaScript (JSX) — no TypeScript |

---

## 4. Project Structure

```
IOS/
└── ios/
    ├── debug.xcconfig              # Capacitor debug flag
    ├── App/
    │   ├── App.xcodeproj/          # Xcode project
    │   ├── CapApp-SPM/             # Swift Package dependencies
    │   │   └── Package.swift       # Capacitor 8.3.1 + Cordova
    │   └── App/
    │       ├── AppDelegate.swift   # iOS app entry point
    │       ├── Info.plist          # Bundle config, orientations
    │       ├── capacitor.config.json  # Capacitor settings
    │       ├── config.xml          # Cordova config (access origin *)
    │       ├── Assets.xcassets/    # App icons + splash screens
    │       │   ├── AppIcon.appiconset/
    │       │   └── Splash.imageset/
    │       ├── Base.lproj/
    │       │   ├── LaunchScreen.storyboard  # Native splash screen
    │       │   └── Main.storyboard          # Capacitor bridge view
    │       └── public/             # ← Compiled React app lives here
    │           ├── index.html
    │           ├── assets/
    │           │   ├── index-*.js   # Vite bundle
    │           │   ├── index-*.css
    │           │   ├── brixon-logo-*.png
    │           │   └── brixon-logo-white-*.png
    │           ├── fonts/
    │           │   └── EDLavonia-Regular.ttf
    │           ├── favicon.ico
    │           └── placeholder.svg
    └── capacitor-cordova-ios-plugins/  # Cordova plugin bridge
```

**Note:** The `public/` folder is the **compiled output of the React/Vite project**. When you build the frontend (`npm run build`), Capacitor copies the `dist/` folder here.

---

## 5. Supabase Backend

**Project URL:** `https://ebwvulhtphiicfhpwjld.supabase.co`  
**Anon Key:** stored in the frontend as `TA` constant in the compiled JS.

The client is initialized once and exported:

```javascript
const ce = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### Database Tables

#### `orders`
Stores placed orders.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `status` | text | `pending`, `confirmed`, `invoiced`, `cancelled` |
| `grand_total` | numeric | Total order value |
| `created_at` | timestamptz | Auto |

#### `order_items`
Line items within an order.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `order_id` | uuid | FK → orders |
| `article_number` | text | Fabric article code |
| `description` | text | |
| `price` | numeric | Price per unit at time of order |
| `quantity` | numeric | Ordered quantity |
| `stock_unit` | text | e.g. `meter` |

#### `profiles`
Extended user data beyond Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `full_name` | text | |
| `phone` | text | |
| `password_plain` | text | Plain-text password (for admin viewing) |
| `created_at` | timestamptz | |

#### `user_roles`
Role assignments per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `role` | text | `admin` or `salesperson` |

#### `sync_settings`
Key-value store for Google Sheets configuration.

| Column | Type | Notes |
|---|---|---|
| `setting_key` | text | e.g. `google_sheet_id`, `google_sheet_name`, `service_account_json` |
| `setting_value` | text | The value |

#### `app_content`
CMS for static pages shown in the app.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `content_key` | text | `privacy_policy`, `terms_conditions`, `contacts` |
| `title` | text | Page title |
| `body` | text | Page content (plain text / markdown) |
| `updated_at` | timestamptz | |

### RPC (Stored Procedures)

#### `has_role(_user_id, _role)`
Returns `boolean`. Used to check if a user has a specific role (e.g. `admin`).

```javascript
const { data } = await supabase.rpc('has_role', {
  _user_id: user.id,
  _role: 'admin'
});
// data === true/false
```

---

## 6. Edge Functions

All edge functions are called via `supabase.functions.invoke(functionName, { body })`.

### `google-sheets-inventory`

The main inventory bridge. Reads/writes Google Sheets data.

**Actions:**

| `action` | Description | Body fields |
|---|---|---|
| `get-all` | Returns all articles with stock info | — |
| `process-order` | Creates an order record | `items: [{article_no, quantity}]` |
| `save-config` | Saves Google Sheets credentials | `sheet_id`, `sheet_name`, `service_account_json?` |
| `test-connection` | Tests Sheet connectivity | — |
| `update-row` | Updates a specific row | `article_no`, `data: { price?, stock?, category? }` |
| `add-row` | Adds a new article row | `article_no`, `bundle_no`, `category`, `stock`, `price` |

**Response shape for `get-all`:**

```json
{
  "data": [
    {
      "id": "row_index",
      "articleNumber": "ABC123",
      "description": "Cotton Fabric",
      "price": 250,
      "unit": "pc",
      "stockUnit": "meter",
      "stock": 45.5,
      "stockBreakdown": ["30.5", "15.0"]
    }
  ]
}
```

### `admin-create-user`

Creates a new Supabase Auth user and populates the `profiles` and `user_roles` tables.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "full_name": "John Doe",
  "phone": "+39...",
  "role": "salesperson"
}
```

### `admin-delete-user`

Deletes a user from Supabase Auth and cleans up related records.

**Body:**
```json
{
  "user_id": "uuid"
}
```

---

## 7. Google Sheets Integration

Brixon uses Google Sheets as the **source of truth for inventory**. There is no separate articles table in PostgreSQL — all article data comes from the Sheet.

### Required Sheet Columns (exact order)

| Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|
| Article_No | Bundle_No | Stock | Price | Category |

- **Article_No** — unique fabric code (e.g. `BX-001`)
- **Bundle_No** — bundle identifier (used in stock breakdown display)
- **Stock** — current quantity in meters
- **Price** — price per meter in INR
- **Category** — description / category name

Multiple rows with the same Article_No (different Bundle_No) are aggregated — stocks are summed and breakdown is shown.

### Setup Steps (for Admin)

1. Go to Google Cloud Console → Enable **Google Sheets API**
2. Create a **Service Account**, download the JSON credentials
3. Share the target Google Sheet with the service account email (Editor access)
4. In the Brixon Admin Panel → **Sync** tab:
   - Enter the Sheet ID (from the URL)
   - Enter the Sheet name (default: `Sheet1`)
   - Upload the service account JSON file
   - Click **Save Configuration**
   - Click **Test Connection** to verify

---

## 8. Authentication & Roles

### Auth Flow

- Uses **Supabase Auth** with email + password
- Sessions are persisted in `localStorage`
- Auto refresh tokens are enabled
- Password reset via email link (`/reset-password` route handles the token)

### Route Protection

```javascript
// ProtectedRoute wrapper
const Sg = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};
```

### Role Check

The `useIsAdmin` hook calls the `has_role` RPC:

```javascript
const { data: isAdmin } = useIsAdmin();
// isAdmin === true → show admin button / navigate to /admin
```

Roles are stored in the `user_roles` table. Only users with `role = 'admin'` can access `/admin`.

---

## 9. App Screens & Routing

| Route | Component | Access |
|---|---|---|
| `/auth` | Login + Forgot Password | Public |
| `/` | Main inventory search screen | Protected |
| `/admin` | Admin panel | Protected + Admin only |
| `/reset-password` | Set new password after email reset | Public |
| `/page/:slug` | Static content pages | Public |
| `*` | 404 Not Found | Public |

### Static Page Slugs

| URL | `content_key` in DB |
|---|---|
| `/page/privacy-policy` | `privacy_policy` |
| `/page/terms` | `terms_conditions` |
| `/page/contacts` | `contacts` |

---

## 10. Key Components

### `AuthProvider` + `useAuth()`

Context provider that wraps the entire app. Listens to Supabase auth state changes.

```javascript
const { user, session, loading, signOut } = useAuth();
```

### `SplashScreen` (`TO`)

Shown for ~1.2 seconds on first load. Displays the Brixon white logo on a dark background with a loading bar animation. Calls `onComplete` callback when done.

### Offline Detection (`useOnlineStatus`)

Listens to browser `online` / `offline` events. When offline, the entire app is replaced with an offline screen with a "Try Again" button.

### Main Screen — Single Mode

1. User types an article number and presses Search (or Enter)
2. Article is looked up in the cached `articles-with-stock` query data (no extra network call)
3. If found: shows price, stock, stock breakdown
4. If stock < 3.5 meters: shows "Low Stock" warning with WhatsApp link
5. User enters quantity → total is calculated
6. "Order via WhatsApp" opens a confirmation dialog, then redirects to WhatsApp

### Main Screen — Bulk Mode

1. User fills up to N rows of article numbers (starts with 10)
2. Click "Search all" — all are looked up simultaneously from cache
3. Found articles show stock info + quantity input
4. Order summary table shows running totals
5. "Bulk Order via WhatsApp" places all items as one order

---

## 11. State Management (React Query)

All server data is managed with **TanStack Query**. The `QueryClient` instance (`RO`) is created once and provided at the app root.

### Key Queries

#### `useArticlesWithStock()` — `queryKey: ['articles-with-stock']`
Fetches all articles from Google Sheets via the Edge Function. Used on the main screen. `staleTime: 0` — always refetches on mount.

```javascript
// Returns:
[{
  id, articleNumber, description, price,
  unit, stockUnit, stock, stockBreakdown
}]
```

#### `useIsAdmin()` — `queryKey: ['is-admin', userId]`
Checks if the current user has the `admin` role. Only runs if user is logged in.

#### `useAdminOrders()` — `queryKey: ['admin-orders']`
Fetches all orders joined with profiles. Admin-only.

#### `useAdminArticles()` — `queryKey: ['admin-articles']`
Fetches articles from Google Sheets for the admin articles tab. `staleTime: 0`.

#### `useAdminUsers()` — `queryKey: ['admin-users']`
Fetches all profiles with their roles. Admin-only.

#### `useSyncSettings()` — `queryKey: ['sync-settings']`
Fetches the current Google Sheets configuration from `sync_settings` table.

#### `useAppContent(key)` — `queryKey: ['app-content', key]`
Fetches a single content page by key.

### Key Mutations

#### `usePlaceOrder()`
Calls `google-sheets-inventory` with `action: 'process-order'`. On success, invalidates `articles-with-stock`.

#### `useUpdateOrderStatus()`
Updates `status` column on the `orders` table. Invalidates `admin-orders`.

#### `useSaveArticle()`
Creates or updates an article in Google Sheets via Edge Function. Invalidates `admin-articles`.

#### `useUpdateStock()`
Updates stock quantity for a specific article. Invalidates `admin-articles`.

#### `useCreateUser()` / `useDeleteUser()`
Call the `admin-create-user` / `admin-delete-user` Edge Functions. Invalidate `admin-users`.

#### `useSaveContent()`
Updates a row in `app_content`. Invalidates `app-content-all` and `app-content`.

---

## 12. WhatsApp Order Flow

WhatsApp integration is done entirely via the `wa.me` URL scheme — no API key needed.

**WhatsApp Business Number:** `918076173815`

### Single Order Message Format

```
*BX-001* — Cotton Fabric
Quantity: *10 meter*
₹2,500*
```

### Bulk Order Message Format

```
1. *BX-001* — Cotton Fabric
   Qty: 10 meter
   ₹2,500

2. *BX-002* — Silk
   Qty: 5 meter
   ₹1,800

Total: ₹4,300*
```

### Flow

1. User clicks "Order via WhatsApp"
2. A confirmation `AlertDialog` appears ("You will be redirected to WhatsApp")
3. On "Allow" → `window.open('https://wa.me/918076173815?text=...', '_blank')`
4. The order is also saved to the `orders` + `order_items` tables in Supabase via the Edge Function
5. Stock data is invalidated and refreshed

---

## 13. Admin Panel

Accessible at `/admin`. Only available to users with `role = 'admin'`.

### Tabs

#### Orders
- Lists all orders (newest first) with user info, items, totals
- Each order shows a `<select>` to change status: `pending → confirmed → invoiced → cancelled`
- Status change calls `useUpdateOrderStatus` mutation

#### Articles
- Table of all articles from Google Sheets
- Inline stock update (type new quantity → save icon)
- Inline article edit (article number, description, price, stock unit)
- Add new article form at the top

#### Sync
- Google Sheets configuration panel
- Fields: Sheet ID, Sheet Name, Service Account JSON upload
- Test Connection button pings the Edge Function

#### Users
- Create user form (email, password, name, phone, role)
- Users table with role badges
- Password visibility toggle (for viewing stored plain-text passwords)
- Delete user button with confirmation

#### Content
- Edit Privacy Policy, Terms & Conditions, Contact pages
- Changes are saved to `app_content` table
- Reflects immediately on the `/page/:slug` routes

---

## 14. iOS / Capacitor Setup

### Configuration Files

**`capacitor.config.json`**
```json
{
  "appId": "com.brixonitaly.inventory",
  "appName": "Brixon",
  "webDir": "dist",
  "packageClassList": []
}
```

**`Package.swift`** — Swift Package dependencies:
```swift
.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.1")
```

**`Info.plist`** — Key settings:
- `CFBundleDisplayName`: Brixon
- `UILaunchStoryboardName`: LaunchScreen (shows splash image)
- `UIMainStoryboardFile`: Main (loads `CAPBridgeViewController`)
- `UISupportedInterfaceOrientations`: Portrait + Landscape Left + Landscape Right

**`Main.storyboard`** — Points to `CAPBridgeViewController` from Capacitor, which loads the React web app inside a WKWebView.

**`LaunchScreen.storyboard`** — Shows the `Splash` image (full-screen, `scaleAspectFill`) while the app initializes.

### Splash Screen Images

Located in `Assets.xcassets/Splash.imageset/`. Three sizes provided:
- `splash-2732x2732.png` (standard)
- `splash-2732x2732-1.png`
- `splash-2732x2732-2.png`

### App Icon

Located in `Assets.xcassets/AppIcon.appiconset/`. One image provided:
- `AppIcon-512@2x.png` (1024×1024)

---

## 15. Build & Deployment

### Local Development

> The React source code is **NOT included** in this iOS archive. The `public/` folder contains the compiled production build. To modify the app, you need access to the original React/Vite source repository.

### Steps to update the web app (once you have the source)

```bash
# 1. In the React project root
npm install

# 2. Build the production bundle
npm run build
# Output: ./dist/

# 3. Sync to iOS project
npx cap sync ios
# or manually copy dist/ contents to ios/App/App/public/

# 4. Open Xcode
npx cap open ios

# 5. In Xcode:
#    - Select a device or simulator
#    - Build & Run (Cmd+R)
```

### Xcode Configuration

- **Project:** `App.xcodeproj`
- **Workspace:** Use `App.xcworkspace` (includes SPM packages)
- **Deployment Target:** iOS 15+ (set in `Package.swift`)
- **Device support:** iPhone + iPad, all orientations

### Debug vs Release

`debug.xcconfig` sets `CAPACITOR_DEBUG = true`, which enables the Capacitor debug overlay.

For production builds, create a `release.xcconfig` or configure Xcode build settings to disable debug mode.

---

## 16. Environment Variables

All Supabase credentials are **hardcoded in the compiled JS bundle**. For a production setup, consider moving them to environment variables at build time.

| Variable | Current Value |
|---|---|
| Supabase URL | `https://ebwvulhtphiicfhpwjld.supabase.co` |
| Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI...` (full JWT in source) |
| WhatsApp Number | `918076173815` |

In the React source, these would be set in `.env`:
```
VITE_SUPABASE_URL=https://ebwvulhtphiicfhpwjld.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_WHATSAPP_NUMBER=918076173815
```

---

## 17. Common Gotchas

### 1. Article lookup is purely client-side
When a user searches, the app does **not** make a new API call. It looks up the article number in the cached `articles-with-stock` data. This means if you add a new article to Google Sheets, users must reload the app (or the cache must expire) to see it. Cache TTL is `staleTime: 0` — it refetches on every mount, so a fresh session always gets fresh data.

### 2. Low stock threshold is hardcoded at 3.5 meters
Articles with `stock < 3.5` display a "Low Stock" warning instead of showing the normal order flow. This is a UI-only check; the Edge Function handles actual stock validation on order placement.

### 3. WhatsApp redirect requires user confirmation
An `AlertDialog` always appears before the WhatsApp redirect. This is intentional because `window.open` can be blocked by iOS if not triggered directly from a user gesture. The dialog ensures the tap-to-open happens in the right event chain.

### 4. Stock data source is Google Sheets only
There is no `articles` or `stock` table in PostgreSQL. Everything inventory-related goes through the `google-sheets-inventory` Edge Function. If the service account credentials expire or the sheet is unreachable, article search will fail entirely.

### 5. Capacitor `webDir` is `dist`
When you run `npm run build` in the React project, Vite outputs to `./dist/`. Capacitor is configured to use this folder. Running `npx cap sync` copies it to the iOS project. If you manually place files in `ios/App/App/public/` without syncing, they may be overwritten.

### 6. Passwords stored as plain text
The `profiles.password_plain` column stores the password in plain text for admin visibility. This is a security concern — consider removing this column and using Supabase Admin API for password resets instead.

### 7. Offline detection
The `useOnlineStatus` hook replaces the entire app UI with an offline screen when the browser reports no network. This works well in mobile contexts but may show false positives in some environments.

---

## Appendix: Data Flow Summary

```
User searches article number
        ↓
React looks up in React Query cache
  (populated from google-sheets-inventory Edge Function)
        ↓
  Article found?
  ├── Yes → Show price, stock, order form
  └── No  → Show "not found" message

User enters quantity and clicks "Order via WhatsApp"
        ↓
AlertDialog: "Redirect to WhatsApp?"
        ↓
  Allow?
  ├── No  → Cancel
  └── Yes → 
       ├── Call google-sheets-inventory (action: process-order)
       │     → Saves to orders + order_items tables
       │     → Invalidates articles-with-stock cache
       └── window.open(wa.me link with pre-filled message)
