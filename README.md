# Moodle Admin Portal

## 1. Project Overview

This is a Moodle Admin Portal that allows a Moodle administrator to search users by name and inspect their complete profile: enrolled courses with grades and instructors, previous courses, and any courses they teach. The system is intentionally split into two services: a **Laravel 12 backend** that acts as a secure proxy to the Moodle Web Services REST API, and a **Next.js 16 frontend** that provides a responsive admin UI. The split exists because the Moodle API token is a long-lived credential that must never be sent to the browser — all Moodle calls originate from the Laravel server, and the frontend has zero knowledge of the Moodle URL or token. Every response travels through a caching layer to reduce round-trips to Moodle, with a manual-refresh endpoint for when fresh data is needed immediately.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Browser (Next.js :3000)                                           │
│                                                                     │
│   fetch("/api/users/search?q=ali")   fetch("/api/users/42")         │
│              │                                │                     │
└──────────────┼────────────────────────────────┼─────────────────────┘
               │  JSON  { ok, data, cached }    │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│   Laravel backend (:8000)                                           │
│                                                                     │
│   ① Check file cache ──── HIT ──────────────────▶  return cached   │
│          │ MISS                                                      │
│          ▼                                                           │
│   ② MoodleClient::call()  (POST /webservice/rest/server.php)        │
│      wstoken = ████████████  ◀── token NEVER leaves this server     │
│          │                                                           │
│          ▼                                                           │
│   Moodle Web Services API  (auob.dev.ethinksites.com)               │
│          │                                                           │
│          ▼                                                           │
│   ③ UserAggregator / CourseAggregator  (assemble response)          │
│   ④ Store aggregate in file cache                                   │
│   ⑤ Return { ok:true, data, cached:false, cached_at }              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

The Moodle API token lives ONLY in backend/.env.
It never appears in any HTTP response, any log at INFO level,
or anywhere the browser can reach.
```

---

## 3. Prerequisites

| Tool | Minimum version |
|------|----------------|
| PHP | 8.2 |
| Composer | 2.x |
| Node.js | 20+ |
| npm | 10+ |

---

## 4. Setup — Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Open `backend/.env` and fill in the three required values:

```env
MOODLE_URL=https://your-moodle-instance.com    # no trailing slash
MOODLE_TOKEN=your_webservice_token_here
REFRESH_SECRET=choose_a_long_random_string
```

Verify the token works before starting the server:

```bash
php artisan moodle:ping
```

Expected output:
```
Pinging Moodle Web Services…
  URL:      https://your-moodle-instance.com
  Function: core_user_get_users_by_field

  Site:     Your Moodle Site Name
  Version:  4.x.x
  User:     Service Account Name
  OK — Moodle Web Services are reachable and the token is valid.
```

If it times out, check that `MOODLE_URL` is reachable and the token has the required capabilities.

Start the development server:

```bash
php artisan serve
# Listening on http://localhost:8000
```

---

## 5. Setup — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Open `frontend/.env.local` and fill in:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REFRESH_TOKEN=same_value_as_REFRESH_SECRET_in_backend_env
```

Start the development server:

```bash
npm run dev
# Ready on http://localhost:3000
```

---

## 6. Configuration

### Backend (`backend/.env`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `APP_KEY` | Laravel encryption key — generate with `php artisan key:generate` | `base64:abc...` |
| `MOODLE_URL` | Base URL of your Moodle instance, no trailing slash | `https://moodle.example.com` |
| `MOODLE_TOKEN` | Moodle web service token — **never commit a real value** | `1a2b3c...` |
| `MOODLE_CACHE_TTL` | Seconds to cache user/course aggregates (default: 600 = 10 min) | `600` |
| `FRONTEND_URL` | CORS-allowed origin — must match the Next.js URL exactly | `http://localhost:3000` |
| `REFRESH_SECRET` | Shared secret for `POST /api/cache/flush` — use a long random string | `s3cr3t...` |

### Frontend (`frontend/.env.local`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Laravel API base URL, **including `/api` suffix** | `http://localhost:8000/api` |
| `NEXT_PUBLIC_REFRESH_TOKEN` | Must match `REFRESH_SECRET` in the backend `.env` | `s3cr3t...` |
| `AUTH_SECRET` | Random secret for NextAuth JWT signing — `openssl rand -base64 32` | `Jx6EUU...` |
| `NEXTAUTH_URL` | Public URL of the Next.js app | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | `12345.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Microsoft app (client) ID | `xxxxxxxx-...` |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Microsoft client secret value | `abc~...` |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Microsoft directory (tenant) ID | `xxxxxxxx-...` |

OAuth redirect URIs to register:
- Google: `{NEXTAUTH_URL}/api/auth/callback/google`
- Microsoft: `{NEXTAUTH_URL}/api/auth/callback/microsoft-entra-id`

---

## 7. How to Run

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
php artisan serve
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To watch API calls, cache hits, and timing in real time, open a third terminal:
```bash
tail -f backend/storage/logs/laravel.log
```

You will see lines like:
```
[INFO]  Cache MISS: moodle:users:42
[INFO]  Moodle API [core_user_get_users_by_field] ok {"duration_ms":312}
[INFO]  Moodle API [core_enrol_get_users_courses] ok {"duration_ms":287}
[INFO]  Cache HIT:  moodle:users:42
```

---

## 8. Design Decisions

### Defining "previous" vs "current" courses

A course is classified as **previous** when its `enddate` field is greater than zero **and** that timestamp is in the past (`enddate < time()`). If `enddate` is `0` or missing the course is treated as **current** regardless of the `visible` flag — an enddate of `0` in Moodle means "no defined end date", not "ended at the Unix epoch". This matches how Moodle itself displays courses: visibility toggles whether students see it, but it does not imply the course has ended.

### Caching at the aggregate level, not per Moodle call

Each public endpoint caches the **fully assembled aggregate** under a single key (`moodle:users:{id}`, `moodle:courses:{id}`). The alternative would be caching each individual Moodle function call separately.

Aggregate-level caching was chosen because:
1. **Consistency**: A cached profile is internally consistent — the course list, grade data, and instructor names all come from the same point in time. Per-call caching could mix a stale grade with a fresh enrollment.
2. **Simple invalidation**: One `Cache::forget("moodle:users:42")` clears the entire profile. Invalidating N individual call results would require enumerating all keys for that user.
3. **Acceptable trade-off**: Any data change (new enrollment, grade update) requires flushing the aggregate. For an admin portal used occasionally, this is fine — and the manual Refresh button provides an escape hatch.

The one exception is `moodle:courses:{id}:enrolled`, which is cached separately and shared between `UserAggregator` and `CourseAggregator`. This avoids fetching the same enrolled-users list twice when building a user profile that includes many courses.

### Why Next.js

Next.js provides file-based routing (matching the three-route structure the spec requires), first-class TypeScript support, and a deploy model the reviewer will recognise. The assignment explicitly requested an "AJAX" pattern rather than full-page server renders, so all data fetching uses `useEffect` in `'use client'` components. Next.js is used for routing, layout, and the `Link` component — not for server-side data fetching.

### Grade failure isolation

`UserAggregator::fetchGrade()` wraps each grade API call in a try/catch that silently returns `null`. A single inaccessible grade (e.g. a course where the service account lacks grader permissions) must not abort the entire user-profile build. The trade-off is a silent `null` in the grade field — visible to the reviewer as an absent grade badge, but the profile still renders.

---

## 9. Known Limitations

- **Authentication scope**: OAuth (Google/Microsoft) protects the Next.js frontend. The Laravel API itself does not independently verify the caller's identity — it relies on network-level isolation (same-host deployment). A production deployment should also forward a signed JWT from the NextAuth session and verify it on the Laravel side.
- **Static token**: The Moodle web service token is long-lived. Production systems need a token rotation strategy and a way to push new values to `backend/.env` without downtime.
- **File cache not distributed**: `CACHE_STORE=file` works on a single server. Multi-instance deployments need Redis or Memcached.
- **Avatar proxy not implemented**: `profileimageurl` values from Moodle are used directly as `<img>` `src` attributes. On Moodle instances where `pluginfile.php` requires authentication, avatars will fail to load. The fix is a `GET /api/users/{id}/avatar` proxy route (not yet implemented).
- **Search is fullname-only**: The Moodle `core_user_get_users` call uses a wildcard `fullname` criterion. Email or username search would require additional criteria entries.
- **No pagination**: Results are capped by Moodle's built-in limit (~100 users). Client-side pagination is not implemented.
- **Moodle server availability**: During development, `auob.dev.ethinksites.com` was intermittently unreachable at the HTTPS layer (TCP/TLS connects, but the server returned no HTTP response). The error-handling code is correct and was verified: the app returns `{"ok":false,"error":{"code":"MOODLE_UNREACHABLE",...}}` with a clean UI error state in all such cases.

---

## 10. Reflection: Plugin vs. External Integration

### If This Were a Moodle Plugin

The assignment was built as an **external integration**: a Laravel backend that calls Moodle's public Web Services API over HTTPS, plus a Next.js frontend that talks only to Laravel. If the requirement were instead to ship this as a **Moodle plugin** installed inside Moodle itself, every architectural layer would change.

**Authentication** is the most fundamental difference. Externally, we need a Moodle web service token tied to a dedicated service account with specific capabilities granted through Site Administration. Managing this token is operationally fragile: it must be provisioned once, stored securely, rotated if compromised, and the service account must have precisely the right capability set (`moodle/user:viewdetails`, `gradereport/user:view`, etc.). As a plugin we would call `require_login()` at the top of every page and check capabilities with `require_capability('moodle/user:viewdetails', $context)`. Access is automatically scoped to the actual logged-in admin's session — no token to manage, no rotation problem, and Moodle's own permission system enforces what the user can see.

**Data access** changes from slow to fast. Externally, every piece of data requires an HTTPS round-trip to the web service endpoint, which only exposes the subset of Moodle data the API team has chosen to wrap. Getting a user's enrolled courses, roles, and grades requires three separate API calls, each serialised through HTTP. As a plugin we would query Moodle's database directly via the `$DB` global — `$DB->get_records_sql('SELECT ... FROM {user_enrolments} JOIN {role_assignments} ...')` — with full access to the entire schema. This is orders of magnitude faster (no network hop, no serialisation overhead) and gives access to any data in the database. The cost is tight coupling: our queries depend on Moodle's internal table names and columns, which can change between major versions and requires testing on every Moodle upgrade.

**The UI layer** is rebuilt from scratch. Externally we ship a standalone Next.js app with Tailwind, our own design system, and an independent deploy pipeline. As a plugin we would render through Moodle's Mustache templating engine, load JavaScript via `$PAGE->requires->js_call_amd()`, and style within Moodle's CSS theme variables. We lose design freedom but gain visual consistency with the rest of the Moodle UI for free — the portal looks and feels like part of Moodle rather than an external app bolted on.

**Deployment and lifecycle** differ significantly. Our external app deploys independently: a `git pull`, `composer install`, and `npm run build` can happen any time without touching Moodle. A plugin lives inside Moodle's directory structure, must declare a `version.php`, handle database schema migrations through `db/upgrade.php`, and be installed or upgraded by a Moodle site administrator through the admin upgrade wizard. Every change must go through Moodle's plugin manager and requires an admin to explicitly trigger the upgrade — the plugin cannot be updated silently.

**The right choice depends on the context**: build an external integration when you need to operate independently of Moodle's release cycle, when the team does not control the Moodle instance, or when the data consumer is a different application entirely; build a Moodle plugin when the feature belongs inside Moodle's UX, when raw database access is needed for performance, or when leveraging Moodle's existing authentication, capabilities, and notification infrastructure outweighs the cost of coupling.

---

## 11. Bonus Features Implemented

- **A — Google / Microsoft OAuth**: All routes are protected by NextAuth v5. Unauthenticated visitors are redirected to `/login`, which offers one-click sign-in via Google or Microsoft Entra ID. The signed-in user's avatar and name appear in the header with a Sign Out button.
- **B — Next.js frontend**: A full React/TypeScript single-page application with three routes, debounced search (300 ms), client-side navigation with Next.js `Link`, and no full-page reloads.
- **C — TTL cache with manual refresh**: Every endpoint caches its aggregate response with a configurable TTL (`MOODLE_CACHE_TTL`). A `CacheStatus` component on each detail page shows the data age ("Data cached 3 minutes ago") and a Refresh button that calls `POST /api/cache/flush` with the appropriate scope, then re-fetches live data.
- **Request logging**: Every Moodle API call is logged to `storage/logs/laravel.log` with function name and duration in milliseconds. Cache HIT/MISS is logged by each controller, making it straightforward to verify during a demo that a cache flush actually triggered a fresh Moodle call.
- **Typed error classification**: The frontend `ApiError` class carries the backend error `code` and HTTP `status`, enabling per-page error messages: "User not found" for 404s, "Couldn't reach the server" for network failures, "You don't have permission" for Moodle access-denied codes (with the raw code logged to the browser console for the reviewer).
- **Content-shaped loading skeletons**: Each page renders an animated skeleton approximating the shape of its content — search result rows, a profile header + course cards, and a course header + role groups — eliminating blank-screen flash during data load.
