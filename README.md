# LuxiFit — Client (Member) App

> Mobile-first webapp for gym members. This is the **client portal** (port 3001). The admin app lives in a separate repo.

**Live:** https://ymg-client.vercel.app
**Admin app:** https://ymg-livid.vercel.app

---

## What is this?

LuxiFit is a multi-branch gym management SaaS. There are two separate webapps sharing one database:

| App | Users | URL |
|-----|-------|-----|
| **Admin** (separate repo) | Owner, Managers, Coaches | https://ymg-livid.vercel.app |
| **Client** (this repo) | Gym members only | https://ymg-client.vercel.app |

Members log into this app to track progress, view goals, check payments, and **chat with their coach/manager/owner**.

---

## Key Design Decisions

### 1. Members cannot self-register
There is **no signup page** in the client app. Members must first be added by a coach/manager/owner from the admin app. Only users with `role=client` can log in here — owner/manager/coach accounts are rejected with a clear error.

### 2. Branch-locked login
Before entering credentials, members must select their branch from a dropdown. The backend verifies:
1. User exists & is active
2. `role === "client"`
3. `user.branchId === selected branch`

If any check fails, login is rejected.

### 3. Session isolation from admin app
Uses a separate cookie prefix (`luxifit-client-*`) so it doesn't collide with the admin app (`luxifit-admin-*`) when both run on localhost.

### 4. Chat: clients are participants only
Clients **cannot create** chat rooms or 1-to-1 chat with other clients. They can only participate in group chats that their coach/manager/owner added them to.

---

## Highlighted Feature: In-app Chat

LuxiFit ships with a **WhatsApp-style chat** embedded in the app:

- **Real-time polling** every 3 seconds
- **Read receipts** (single check = sent, double check = read)
- **Presence** — online / offline / last seen (updates every 30 seconds)
- **Group chats** — clients participate in their branch's group chats
- **Hierarchy** — owner/manager/coach can chat with clients (read/write); clients can chat back to any participant in their group

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) — shared with admin |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Email | Resend |
| UI | Tailwind CSS v4 + shadcn/ui |
| Icons | Lucide React |
| Design | Mobile-first (480px max-width, bottom tab nav) |
| Deploy | Vercel |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (same DB as admin app)
- Git
- Have the **admin app running** so you can create a branch + client

### Setup

```bash
# 1. Clone
git clone https://github.com/berjilberjil/GYM-Tool-WebApp-Client.git
cd GYM-Tool-WebApp-Client

# 2. Install
npm install

# 3. Copy env file
cp .env.example .env.local
# Defaults work out of the box with a local postgres

# 4. Make sure the database exists and has schema pushed
#    (done from the admin app or via drizzle-kit push here)

# 5. Start dev server (port 3001)
npm run dev
```

Client app runs at **http://localhost:3001**.

### First-time usage flow
1. Run the **admin app** (`http://localhost:3000`)
2. Sign up as **owner** (first signup only — subsequent owner signups are blocked)
3. Create a **branch**
4. Add a **client** (set email + default password)
5. Run this **client app** (`http://localhost:3001`)
6. Select that branch from the dropdown
7. Log in with the client's email/password

---

## Switching to Live / Production

The `.env.local` file supports toggling between local and live by commenting/uncommenting lines.

### Step 1: Edit `.env.local`

```env
# ── Database ──
# Comment out local:
# DATABASE_URL=postgresql://localhost:5432/ymg
# Uncomment production:
DATABASE_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres

# ── Better Auth ──
# Comment out local:
# BETTER_AUTH_URL=http://localhost:3001
# NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
# Uncomment production:
BETTER_AUTH_URL=https://your-client-domain.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-client-domain.vercel.app
```

### Step 2: Deploy

```bash
npm i -g vercel
vercel --prod
```

### Step 3: Add env vars to Vercel
`vercel env add NAME production` for each one in `.env.example`, or use the Vercel dashboard.

### Step 4: Update Google OAuth
Add redirect URI in Google Cloud Console:
```
https://your-client-domain.vercel.app/api/auth/callback/google
```

**Critical:** `BETTER_AUTH_SECRET` must be **identical** to the admin app's value.

---

## Project Structure

```
app/
├── (app)/                  Authenticated pages (wrapped by AppShell)
│   ├── page.tsx            Dashboard/Home
│   ├── progress/           Body measurement timeline
│   ├── goals/              Fitness goals
│   ├── payments/           Payment history
│   ├── profile/            Profile + sign out
│   ├── chat/               ⭐ Chat UI
│   └── layout.tsx          Auth guard + AppShell
├── login/                  Branch-locked login
├── signup/                 Redirects to /login with error (no self-signup)
├── api/
│   ├── auth/[...all]/      Better Auth handler
│   ├── public/branches/    Public branch list for login dropdown
│   ├── me/                 Authenticated member APIs
│   │   ├── route.ts        Profile + dashboard stats
│   │   ├── progress/
│   │   ├── goals/
│   │   ├── payments/
│   │   ├── presence/       Update last_seen
│   │   └── chat/           ⭐ Chat APIs
│   └── email/track/        Email open tracking pixel
├── globals.css             Light theme
└── layout.tsx

components/
├── app-shell.tsx           Header + bottom tab nav (Home, Progress, Goals, Chat, Payments, Profile)
└── ui/                     shadcn

lib/
├── auth/                   Better Auth + session helpers
├── db/                     Drizzle
├── email.ts                Resend wrapper
└── logger.ts               Structured logger
```

---

## Debugging / Logs

Structured logger at `lib/logger.ts`:
- **Local:** Colored console output
- **Production:** JSON log lines (Vercel captures them → **Dashboard → Logs**)

Every API route + auth event is logged with action, userId, and result.

---

## Commands

```bash
npm run dev          # Start dev server (port 3001)
npm run build        # Production build
npm run start        # Run production build locally
npm run lint         # ESLint
```

---

## Related Repos

- **GYM-Tool-WebApp** — the admin/owner/staff app (port 3000)
