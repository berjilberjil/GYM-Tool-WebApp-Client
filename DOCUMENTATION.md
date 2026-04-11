# GYM Tool WebApp — Client Application

## Overview

This is the **Client-facing mobile-first web application** for GYM Tool WebApp (LuxiFit). Gym members use this app to track their fitness progress, view goals, check payments, and manage their profile.

**Live URL:** https://ymg-client.vercel.app
**Admin App:** https://ymg-livid.vercel.app (separate project)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | PostgreSQL (shared with admin app) |
| ORM | Drizzle ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Icons | Lucide React |
| Design | Mobile-first (480px max-width), bottom tab nav |
| Deployment | Vercel |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (for local development)
- npm

### Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USER/gym-tool-webapp.git
cd gym-tool-webapp/ymg-client

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values (see Environment section below)

# 4. Make sure the shared database exists
createdb ymg  # (skip if already created for admin app)

# 5. Start dev server (port 3001)
npm run dev
```

### Run Both Apps Together (Local)
```bash
# Terminal 1 — Admin app (port 3000)
cd ymg && npm run dev

# Terminal 2 — Client app (port 3001)
cd ymg-client && npm run dev
```

---

## Environment Variables

### How to Switch Between Local & Production

The `.env.local` file has clearly marked sections. To switch:

**For LOCAL development** (default):
```env
# Database — use local PostgreSQL
DATABASE_URL=postgresql://localhost:5432/ymg
# DATABASE_URL=postgresql://postgres.xxx:password@pooler.supabase.com:6543/postgres

# Better Auth — use localhost
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
# BETTER_AUTH_URL=https://ymg-client.vercel.app
# NEXT_PUBLIC_BETTER_AUTH_URL=https://ymg-client.vercel.app
```

**For PRODUCTION / LIVE** (comment local, uncomment production):
```env
# Database — use Supabase pooler
# DATABASE_URL=postgresql://localhost:5432/ymg
DATABASE_URL=postgresql://postgres.xxx:password@pooler.supabase.com:6543/postgres

# Better Auth — use Vercel URL
# BETTER_AUTH_URL=http://localhost:3001
# NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_URL=https://ymg-client.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://ymg-client.vercel.app
```

### Full Variable List

| Variable | Description | Must Match Admin App? |
|----------|-------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Auth session signing secret | **YES — MUST match!** |
| `BETTER_AUTH_URL` | This app's URL (port 3001) | No |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | This app's public URL | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Can differ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Can differ |
| `PORT` | Dev server port | No (3001) |

**CRITICAL:** `BETTER_AUTH_SECRET` must be **identical** in both admin and client apps for shared authentication to work.

---

## Project Structure

```
ymg-client/
├── app/
│   ├── (app)/                  # Authenticated pages (wrapped by AppShell)
│   │   ├── page.tsx            # Home/Dashboard
│   │   ├── progress/page.tsx   # Progress tracking timeline
│   │   ├── goals/page.tsx      # Fitness goals
│   │   ├── payments/page.tsx   # Payment history
│   │   ├── profile/page.tsx    # User profile + settings
│   │   └── layout.tsx          # Auth check + AppShell wrapper
│   ├── login/page.tsx          # Login page
│   ├── signup/page.tsx         # Signup (role locked to "client")
│   ├── api/
│   │   ├── auth/[...all]/      # Better Auth handler
│   │   └── me/                 # Client-specific APIs
│   │       ├── route.ts        # GET: profile + dashboard stats
│   │       ├── progress/route.ts  # GET: entries, POST: log progress
│   │       ├── goals/route.ts  # GET: goals
│   │       └── payments/route.ts  # GET: payment history
│   ├── globals.css             # Dumble dark theme
│   └── layout.tsx              # Root layout
├── components/
│   ├── app-shell.tsx           # Bottom tab nav + top header
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth/                   # Better Auth (shared config with admin)
│   ├── db/                     # Drizzle ORM (shared schema)
│   └── utils.ts
├── proxy.ts                     # Auth redirect
├── .env.example                 # Template (safe to commit)
├── .env.local                   # Your secrets (git-ignored)
└── package.json
```

---

## App Navigation (Bottom Tabs)

```
┌──────────────────────────────────────────┐
│  LuxiFit                        [Avatar] │  <- Top header
├──────────────────────────────────────────┤
│                                          │
│           Page Content                   │
│                                          │
├──────────────────────────────────────────┤
│  Home  Progress  Goals  Payments Profile │  <- Bottom nav
└──────────────────────────────────────────┘
```

---

## Pages

### Home (`/`)
- Welcome greeting with first name
- Subscription status card (active/expired/none)
- Quick stats: days remaining, progress logs, active goals
- Latest weight reading
- Quick action cards

### Progress (`/progress`)
- Latest weight in large gradient text with trend arrow
- Mini CSS bar chart (last 5 weight entries)
- Timeline of all entries (tap to expand measurements)
- Floating "Log Progress" button

### Goals (`/goals`)
- Summary pills: active, achieved, total
- Filter tabs: All / Active / Achieved
- Goal cards with type-colored badges (Fat Loss, Muscle Gain, Strength, Endurance, General)
- Floating "Add Goal" button

### Payments (`/payments`)
- Current subscription card with glow effect
- Summary stats: total paid, pending, overdue
- Payment history list with status badges

### Profile (`/profile`)
- Avatar with gradient background
- Personal info (email, phone, branch, coach)
- Subscription details
- Sign out button

---

## API Routes

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/me` | GET | Profile, subscription, stats, latest progress |
| `/api/me/progress` | GET | All progress entries |
| `/api/me/progress` | POST | Log new progress entry |
| `/api/me/goals` | GET | All goals |
| `/api/me/payments` | GET | Payment history + subscription + summary |
| `/api/auth/*` | * | Better Auth (login, signup, session, OAuth) |

All `/api/me/*` endpoints check the session and only return data for the authenticated user.

---

## How It Connects to Admin App

```
┌─────────────────┐     ┌─────────────────┐
│  Admin App       │     │  Client App      │
│  (port 3000)     │     │  (port 3001)     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                    │
              ┌─────┴──────┐
              │ PostgreSQL  │
              │ (shared DB) │
              └─────────────┘
```

### Data Flow:
1. **Owner adds a client** (admin) → client can login on client app immediately
2. **Client logs progress** (client app) → coach sees it on admin app
3. **Owner records payment** (admin) → client sees it in payment history
4. **Client signs up** (client app) → appears in owner's client list

---

## Commands

```bash
# Install dependencies
npm install

# Start dev server (port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

---

## Deploy to Vercel (Production)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/gym-tool-webapp-client.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Import project on [vercel.com](https://vercel.com)
2. Add ALL environment variables (use production values):
   - `DATABASE_URL` → Supabase pooler connection string
   - `BETTER_AUTH_SECRET` → **same value as admin app**
   - `BETTER_AUTH_URL` → `https://your-client-domain.vercel.app`
   - `NEXT_PUBLIC_BETTER_AUTH_URL` → `https://your-client-domain.vercel.app`
   - All Supabase keys
   - Google OAuth keys
3. Deploy

### Step 3: Update Google OAuth
Add production redirect URI in Google Cloud Console:
```
https://your-client-domain.vercel.app/api/auth/callback/google
```

---

## Design System — Dumble Dark Fitness Theme

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0A0F` | Page background |
| Cards | `#12121A` | Card surfaces |
| Primary | `#0057FF` | Buttons, links |
| Accent | `#00E5FF` | Highlights |
| Success | `#02CB00` | Active states |
| Warning | `#F97C00` | Alerts |
| Destructive | `#FF3B5C` | Errors |

### Mobile-First
- Max width: 480px centered on desktop
- Bottom nav: 64px with safe area padding
- Touch targets: minimum 44px
- Rounded corners: 16px
