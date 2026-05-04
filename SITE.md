# Journal

> A minimal daily journal. Multi-user, password-gated. Rich text, attachments, voice notes.

## Brand Identity

- **Personality**: Quiet, intentional, paper-like. Nothing extra.
- **Colors (light)**:
  - Background: `#F5F3EE` (warm off-white)
  - Text: `#111111` (near-black)
  - Muted: `#9b958a` (timestamps, placeholder, weekday labels)
  - Accent: `#B14A2D` (terracotta) — used **only** on today's cell in the calendar and on the swipe-right delete reveal
  - Good: `#3a8c5a` (forest green) — swipe-left edit reveal
- **Colors (dark)**:
  - Background: `#181614` (warm near-black)
  - Text: `#E8E4DA` (warm off-white)
  - Muted: `#6b665c`
  - Accent: `#D46A45` (slightly brighter terracotta)
  - Good: `#4ea372`
- **Fonts**: Nunito Sans, light weight (300) — soft, rounded sans-serif. Section labels (e.g. `MONDAY 12 MAY`) are uppercase, weight 500, letter-spaced wide.
- **Icons**: Thin 1px stroke SVG, no fills. Chevrons, calendar grid, plus, close, sun, moon, paperclip, image, mic, document, edit pencil, trash.

## Pages

- **Homepage** (`/`) — name picker. Two cards (Eli, Jae). Clicking a card goes to that person's journal.
- **`/eli`** and **`/jae`** — that person's journal. If you don't have a valid session, you see a password prompt instead.

## How it works

### Sign in & navigate
- **Pick a name**: From the homepage, click Eli or Jae.
- **Enter password**: First time on a name (or after sign out), type the password. Right answer = you stay signed in for 30 days on that browser.
- **Switch days**: Tap the left/right arrows at the top, or use the keyboard arrow keys.
- **Jump to any date**: Tap the calendar icon (top right). Today is highlighted in terracotta. Days with entries show a small dot. Tap any square to jump.
- **Toggle dark mode**: Open the calendar view — the dark/light toggle sits in the middle of the bottom row. Your preference is saved per browser.
- **Sign out**: Calendar view, bottom-right "Sign out" link. Goes back to the name picker.

### Writing an entry
- The composer at the bottom is a small **rich text editor**. **Enter** inserts a new line — it does **not** send. To send, tap the **+** button on the right.
- Above the text, four toolbar buttons toggle **bold**, **italic**, **underline**, and **link**. The link button opens a tiny URL input — type or paste a link, press Enter (or OK), and the selected text becomes a link.
- The **paperclip** button (next to +) opens an attach menu with three options:
  - **Image** — pick a photo (PNG/JPG/GIF/WEBP/HEIC, up to 10 MB).
  - **Voice note** — records right in the app. Press Stop or it auto-stops at 5 minutes.
  - **Document** — pick a PDF, Word doc, spreadsheet, or text file (up to 10 MB).
- Each attachment shows as a chip above the editor. Tap the **×** on a chip to remove it before sending.

### Editing & deleting
- **Slide a post left** to reveal a green panel and pencil icon → release past halfway to **edit it inline**. Save keeps the original time. Cancel discards changes.
- **Slide a post right** to reveal a red panel and trash icon → release past halfway → a confirmation popup appears. Click **Delete** to remove the post and any attached files; **Cancel** to back out.
- On desktop you can also click-and-drag a post in either direction.

## Where entries are saved

Entries live in **Supabase** (a hosted Postgres database) in a single `entries` table. Each row has a `user_name` column (`eli` or `jae`) so the two journals stay separate. Attachments live in **Supabase Storage** (private bucket `attachments`) — the app fetches short-lived signed URLs whenever you load a day, so files never become public.

- **Project URL**: `https://jfernmpaekabzxfvjrcy.supabase.co`
- **Table**: `public.entries` — columns: `id`, `user_name`, `date`, `time`, `text`, `ts`, `attachments`, `created_at`.
  - `text` stores sanitized HTML (only `<p> <br> <b> <strong> <i> <em> <u> <a>` are allowed).
  - `attachments` is a JSON list of `{ type, path, name, size, mime, duration? }`.
- **Bucket**: `attachments` (private). Files are pathed `${user}/${yyyy}/${mm}/${id}.${ext}`.

## Passwords & sessions

Passwords aren't stored in the database. They live in **environment variables** (`ELI_PASSWORD`, `JAE_PASSWORD`) — easy to change from the Vercel dashboard without touching code. When you log in, the server sets a signed `journal_session` cookie (httpOnly, 30 days). All `/entries` reads and writes check this cookie to decide whose entries to show. The same cookie is required to upload, edit, or delete.

## Files

- `app/page.tsx` — name-picker landing page (server component).
- `app/[name]/page.tsx` — per-user route. Reads the session cookie; renders the journal or the password gate.
- `app/api/login/route.ts` / `app/api/logout/route.ts` — cookie set/clear.
- `app/entries/route.ts` — `GET /entries` (returns this user's entries with signed URLs); `POST /entries` (creates an entry).
- `app/entries/[id]/route.ts` — `PATCH` (edit text & attachments) and `DELETE` (removes entry + storage files).
- `app/entries/upload/route.ts` — `POST /entries/upload` (multipart form; uploads one file to Supabase Storage).
- `components/Journal.tsx` — top-level journal UI (state, calendar, theme toggle, render-side styling).
- `components/Composer.tsx` — Tiptap-based rich text editor + attach menu + voice recorder integration. Used both for new posts and inline edit.
- `components/VoiceRecorder.tsx` — in-app `MediaRecorder` capture, 5-minute cap, timer, stop/cancel, mic permission handling.
- `components/SwipeRow.tsx` — pointer-based swipe gesture wrapper. Reveals edit (left) or delete (right) action.
- `components/ConfirmDialog.tsx` — modal popup used for delete confirmation.
- `components/PasswordGate.tsx` — password prompt screen.
- `lib/auth.ts` — password check, signed-cookie helpers, `getCurrentUser()`.
- `lib/supabase.ts` — server-side Supabase client (service role key).
- `lib/sanitize.ts` — `sanitizeHtml` (DOMPurify allowlist) and `isHtmlEmpty`.
- `lib/types.ts` — `Entry`, `Attachment`, mime/size limits, `VOICE_MAX_SECONDS`.
- `app/layout.tsx` — loads the Nunito Sans font.
- `index.html` / `server.js` / `entries.json` — older standalone single-file version. Doesn't connect to Supabase. Kept as a backup.

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
- **Change voice note max length**: Edit `VOICE_MAX_SECONDS` in `lib/types.ts` (also adjust the `voice` size limit in the same file if you raise it).
- **Change file size limits**: `SIZE_LIMITS` in `lib/types.ts`.
- **Allow another file type**: add the mime to `IMAGE_MIMES` / `DOCUMENT_MIMES` / `VOICE_MIMES` in `lib/types.ts`.
- **Colors**: Edit the CSS variables at the top of the `STYLES` block in `components/Journal.tsx` — `--bg`, `--fg`, `--muted`, `--accent`, `--good`. Light values are on `.journal-app`; dark values are on `.journal-app.dark`.
- **Font**: Change `Nunito_Sans` in `app/layout.tsx` to any Google Font.
- **Spacing**: Padding values are 16px / 24px / 32px / 40px throughout — all multiples of 8.

## Recent Changes

- 2026-05-02: Built the journal. Single-page React UI on `/`, plus standalone `index.html` and `server.js` for no-build use.
- 2026-05-02: Changed the input placeholder from "Write a thought…" to "What is now? What is next?".
- 2026-05-02: Switched type from Fraunces (serif) to Nunito Sans (soft sans-serif). Removed the per-entry Delete affordance and its API route. Added dark mode with a sun/moon toggle pinned to the bottom of the calendar view; preference saved per browser.
- 2026-05-02: Made the journal multi-user. New name-picker landing page (`/`), per-user route (`/[name]`), password gate, signed-cookie sessions. Moved entry storage from `entries.json` to Supabase Postgres.
- 2026-05-02: Calendar view scrolls; month header and bottom row (theme toggle + sign out) stay pinned.
- 2026-05-04: Composer is now a minimal Tiptap rich text editor (bold, italic, underline, link). **Enter inserts a newline** — only the + button sends. Added in-app voice recording (5 min cap), image and document attachments via Supabase Storage. Added inline edit and delete with **swipe gestures** (left = green/edit, right = red/delete with confirmation modal). All HTML is DOMPurify-sanitized server- and client-side.
