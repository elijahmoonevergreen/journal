# Journal

> A minimal daily journal. One thought, one timestamp, one line at a time. Multi-user, password-gated.

## Brand Identity

- **Personality**: Quiet, intentional, paper-like. Nothing extra.
- **Colors (light)**:
  - Background: `#F5F3EE` (warm off-white)
  - Text: `#111111` (near-black)
  - Muted: `#9b958a` (timestamps, placeholder, weekday labels)
  - Accent: `#B14A2D` (terracotta) — used **only** on today's cell in the calendar
- **Colors (dark)**:
  - Background: `#181614` (warm near-black)
  - Text: `#E8E4DA` (warm off-white)
  - Muted: `#6b665c`
  - Accent: `#D46A45` (slightly brighter terracotta)
- **Fonts**: Nunito Sans, light weight (300) — soft, rounded sans-serif. Section labels (e.g. `MONDAY 12 MAY`) are uppercase, weight 500, letter-spaced wide.
- **Icons**: Thin 1px stroke SVG, no fills. Chevrons, calendar grid, plus, close, sun, moon.

## Pages

- **Homepage** (`/`) — name picker. Two cards (Eli, Jae). Clicking a card goes to that person's journal.
- **`/eli`** and **`/jae`** — that person's journal. If you don't have a valid session, you see a password prompt instead.

## How it works

- **Pick a name**: From the homepage, click Eli or Jae.
- **Enter password**: First time on a name (or after sign out), type the password. Right answer = you stay signed in for 30 days on that browser.
- **Add an entry**: Type in the box and press Enter (or tap the + button on mobile). It's saved to the cloud with the current time on whatever day you're viewing.
- **Switch days**: Tap the left/right arrows at the top, or use the keyboard arrow keys.
- **Jump to any date**: Tap the calendar icon (top right). Today is highlighted in terracotta. Days with entries show a small dot. Tap any square to jump.
- **Toggle dark mode**: Open the calendar view — the dark/light toggle sits in the middle of the bottom row. Your preference is saved per browser.
- **Sign out**: Calendar view, bottom-right "Sign out" link. Goes back to the name picker.
- **Entries are permanent**: Once written, an entry is kept. There's no delete affordance.

## Where entries are saved

Entries live in **Supabase** (a hosted Postgres database) in a single `entries` table. Each row has a `user_name` column (`eli` or `jae`) so the two journals stay separate. The table has Row Level Security on with no public policies — only our server, using the secret service-role key, can read or write it.

- **Project URL**: `https://jfernmpaekabzxfvjrcy.supabase.co`
- **Table**: `public.entries` — columns: `id`, `user_name`, `date`, `time`, `text`, `ts`, `created_at`.

## Passwords & sessions

Passwords aren't stored in the database. They live in **environment variables** (`ELI_PASSWORD`, `JAE_PASSWORD`) — easy to change from the Vercel dashboard without touching code. When you log in, the server sets a signed `journal_session` cookie (httpOnly, 30 days). All `/entries` reads and writes check this cookie to decide whose entries to show.

## Files

- `app/page.tsx` — the name-picker landing page (server component).
- `app/[name]/page.tsx` — the per-user route. Reads the session cookie; renders the journal if you're signed in as that name, or the password gate otherwise.
- `app/api/login/route.ts` — `POST /api/login` with `{ name, password }`. Sets the session cookie on success.
- `app/api/logout/route.ts` — `POST /api/logout`. Clears the cookie.
- `app/entries/route.ts` — `GET /entries` returns the signed-in user's entries; `POST /entries` adds one.
- `components/Journal.tsx` — the journal UI as a React client component (state, render, styles inline).
- `components/PasswordGate.tsx` — the password prompt screen.
- `lib/auth.ts` — password check, signed cookie helpers, `getCurrentUser()`.
- `lib/supabase.ts` — server-side Supabase client (uses the service role key).
- `app/layout.tsx` — loads the Nunito Sans font.
- `index.html` / `server.js` / `entries.json` — older standalone single-file version. Single-user only, kept as a backup. Doesn't connect to Supabase.

## Environment variables

Stored locally in `.env.local` (gitignored). For production, paste these into the Vercel project's **Settings → Environment Variables**:

| Name | What it is |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret server key. Never expose this to the browser. |
| `ELI_PASSWORD` | Password for Eli's journal. |
| `JAE_PASSWORD` | Password for Jae's journal. |
| `SESSION_SECRET` | Random 64-char hex string used to sign session cookies. Don't change it casually — changing it signs everyone out. |

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New Project** → import the repo.
3. Add the five env vars above (copy from `.env.local`).
4. Deploy. Done.

## How to customize

- **Add another person**: Edit the `USERS` list in `lib/auth.ts`, add a `<NAME>_PASSWORD` env var, and update `expectedPassword()` and the `isUserName()` type guard. Also update the `check (user_name in ('eli','jae'))` constraint on the Supabase table.
- **Change a password**: Update the env var in Vercel (and `.env.local` for local dev). No redeploy needed for env-only changes.
- **Colors**: Edit the CSS variables at the top of the `STYLES` block in `components/Journal.tsx` — `--bg`, `--fg`, `--muted`, `--accent`, etc. Light values are on `.journal-app`; dark values are on `.journal-app.dark`.
- **Font**: Change `Nunito_Sans` in `app/layout.tsx` to any Google Font.
- **Spacing**: Padding values are 16px / 24px / 32px / 40px throughout — all multiples of 8.

## Recent Changes

- 2026-05-02: Built the journal. Single-page React UI on `/`, plus standalone `index.html` and `server.js` for no-build use.
- 2026-05-02: Changed the input placeholder from "Write a thought…" to "What is now? What is next?".
- 2026-05-02: Switched type from Fraunces (serif) to Nunito Sans (soft sans-serif). Removed the per-entry Delete affordance and its API route. Added dark mode with a sun/moon toggle pinned to the bottom of the calendar view; preference saved per browser.
- 2026-05-02: Made the journal multi-user. New name-picker landing page (`/`), per-user route (`/[name]`), password gate, signed-cookie sessions. Moved entry storage from `entries.json` to Supabase Postgres. Migrated the existing 5 entries to Eli's account.
