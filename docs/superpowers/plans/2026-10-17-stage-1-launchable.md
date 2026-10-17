# Third Place Berlin App — Stage 1 (Launchable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, invite-only community app (EN/DE) where members join circles, post and find meetups with a "find us here" pin, chat in circles and meetups with polls and a board, discover people, and admins run approvals. Enough to post the launch link in WhatsApp.

**Architecture:**
- **Front end:** a React single-page PWA in `app/`, deployed to GitHub Pages under `/app/`, next to the existing website.
- **Backend:** all data and rules live in Supabase (Postgres + Row Level Security + RPC functions, Realtime for chat, Storage for avatars, two Edge Functions for push and account deletion). The browser only calls Supabase; every permission rule is enforced in SQL and tested there.

**Tech Stack:**
- Node 22, Vite 6, React 18.3, TypeScript 5, react-router-dom 6 (HashRouter)
- @supabase/supabase-js 2, i18next 23 + react-i18next 15
- leaflet 1.9.4 + react-leaflet 4.2.1 (OpenStreetMap tiles), vite-plugin-pwa 0.21
- Vitest 2 + @testing-library/react 16 + jsdom
- Postgres 17 locally for SQL tests; Supabase Edge Functions (Deno) with `npm:web-push@3.6.7`

**Spec:** `docs/superpowers/specs/2026-10-17-third-place-app-design.md` (approved 2026-10-17). Mockups: `docs/superpowers/specs/mockups/`.

## Global Constraints

- €0 running cost: Supabase free tier, project region **Frankfurt (eu-central-1)**; GitHub Pages; OpenStreetMap tiles; Brevo free SMTP (300 emails/day).
- Every UI string exists in **English and German** (`app/src/locales/en.json`, `de.json`); the default comes from `navigator.language`; user content is not translated.
- Invite-only: no content is readable unless `profiles.status = 'member'`. Enforced by RLS, not by the UI.
- **Vouching:**
  - A personal invite counts as the inviter's vouch.
  - `app_settings.vouches_required` defaults to **2** (admins can set 1–5).
  - Admins can approve directly.
  - While `app_settings.launch_open = true`, the launch code admits people directly as members.
- **Circles:**
  - Members only *propose* circles; admins approve them.
  - Each circle is `open` or `closed`. A closed circle needs ≥1 recommendation from a circle member, then host or admin approval. Admins may approve without a recommendation.
- **Meetups:**
  - Every meetup belongs to a circle and is visible only to that circle's members.
  - Meetup chat becomes read-only **2 days after `ends_at`**.
  - Check-in only works between `starts_at − 30 min` and `ends_at + 30 min`, within **300 m** of the pin; the host can also confirm attendance.
- **Notifications are calm by default.**
  - Push only for: new meetup or poll in my circles, mentions, replies to me, approvals and decisions. Plus join requests for hosts, and proposals for admins.
  - "Every message" is opt-in per circle.
- Contact details (email, phone) are never shown to other members. Ages 18+ (confirmed at sign-up). Privacy consent is stored (`profiles.consent_at`).
- Times are always shown in **Europe/Berlin**.
- Colours: rust `#C1592A`, teal `#2F5D58`, cream `#FBF7F0`, ink `#232323`. Circle colours as in the mockups.
- **Launch circles** (seed): Karaoke, Book Lovers, Co-working & Networking, Women Events, Art Lovers, Berlin Events, Sports Events, BBB.
  - BBB is **open**.
  - Women Events is seeded **closed** and all others **open**; admins can change any of them.
- Stage 1 tabs: **Home · Circles · People · Me** (Grow arrives in Stage 3). Admin screens live under Me for admins.
- **Login deviates from spec §6.5 (Claude's own call, changed):** a 6-digit email code instead of a magic link, because installed iPhone apps can't receive magic links (Review Focus 1).
- **"Invite for coffee" moves to Stage 3** with coffee roulette (Claude's call): it needs 1:1 messaging, which Stage 1 doesn't have.
- Out of Stage 1:
  - question of the day, debates, games, poll-to-meetup, daily digest (Stage 2)
  - growth card, coffee roulette and "Invite for coffee", badges, community goal (Stage 3)

## Review Focus

1. **Login inside the installed iPhone app.** On iOS a home-screen app has its own storage, so a magic link opens Safari and logs in there, not in the app. → Login uses a **6-digit email code** typed into the app (`verifyOtp` with `type: 'email'`). Test in Task 4.
2. **Launch day sends ~90 login emails.** Supabase's built-in mailer allows only a few per hour. → Custom SMTP (Brevo) in setup (Task 15). The login screen shows a friendly EN/DE message on an HTTP 429 / `over_email_send_rate_limit` error. Test in Task 4.
3. **Times for a member whose phone is set to another timezone** (just back from travel) must still show Berlin time. → `formatMeetupTime` always uses `Europe/Berlin`. Test in Task 8.
4. **A pending or removed person calling the API directly** must read nothing (profiles, circles' chat, meetups). → RLS tests in Tasks 2, 5, 7 and 9 run as a pending, a removed and a non-circle user.
5. **Someone writing in a meetup chat a week later**, or checking in from home, must be refused by the server, not just hidden in the UI. → SQL tests in Tasks 7 and 9.

---

## File Structure

```
app/
  package.json, vite.config.ts, tsconfig.json, index.html, .env.example
  src/main.tsx, src/App.tsx                    router, auth gate, tab shell
  src/ui/                                      theme.css, TabBar, Card, Chip, Avatar, Screen
  src/lib/supabase.ts                          client (flowType 'pkce')
  src/lib/i18n.ts, src/locales/{en,de}.json
  src/lib/time.ts                              formatMeetupTime, isThisWeekend
  src/lib/geo.ts                               distanceMeters, directionsUrl
  src/lib/people.ts                            normalize, canTeachMe, filterPeople
  src/lib/push.ts                              subscribeToPush
  src/data/                                    one module per domain: session, invites, profiles,
                                               circles, meetups, chat, admin, notifications
  src/features/auth/                           LoginScreen, JoinRoute, WaitingScreen, WelcomeFlow
  src/features/home/HomeScreen.tsx
  src/features/circles/                        CirclesScreen, CircleScreen, ProposeCircle
  src/features/meetups/                        MeetupScreen, MeetupForm, PinPicker
  src/features/chat/                           ChatView, Composer, PollCard, PollComposer, Board
  src/features/people/                         PeopleScreen, ProfileScreen, WaitingList
  src/features/me/                             MeScreen, EditProfile, Invites, NotificationSettings, Inbox
  src/features/admin/AdminScreen.tsx
  supabase/migrations/0001_core.sql … 0006_notifications.sql
  supabase/seed.sql
  supabase/functions/send-push/index.ts, supabase/functions/_shared/payload.ts
  supabase/functions/delete-account/index.ts
  supabase/test/auth_stub.sql, supabase/test/helpers.sql, supabase/test/*.test.sql
  scripts/test-db.mjs
  SETUP.md                                     Nella's account setup + deploy checklist
.github/workflows/deploy-app.yml
```

Test commands used throughout (from `app/`):
- `npm test`: Vitest (front-end)
- `npm run test:db`: SQL tests on a fresh local database `tpb_test`

---

### Task 0: Prerequisites (two people)

**Engineer, on Nella's Mac:**
- [ ] `brew install node@22 postgresql@17` and `brew services start postgresql@17`; add `/opt/homebrew/opt/node@22/bin` and `/opt/homebrew/opt/postgresql@17/bin` to PATH.
- [ ] Verify: `node -v` → `v22.x`; `psql -d postgres -c 'select 1'` → `1`.

**Nella** (account creation is hers alone; the engineer can do Tasks 1–14 without these, and they're needed for Task 15 and the manual check):
- [ ] Create a Supabase project named `third-place-berlin`, region **Frankfurt**. Share the Project URL and anon key (public by design), never the service-role key.
- [ ] Create a free Brevo account and an SMTP key.

---

### Task 1: App shell, theme, EN/DE

**Files:**
- Create: `app/package.json`, `app/vite.config.ts` (`base: '/Third-Place-Berlin/app/'`), `app/tsconfig.json`, `app/index.html`, `app/.env.example` (`VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`)
- Create: `app/src/main.tsx`, `app/src/App.tsx`, `app/src/ui/*`, `app/src/lib/i18n.ts`, `app/src/locales/en.json`, `app/src/locales/de.json`
- Test: `app/src/lib/i18n.test.ts`, `app/src/ui/TabBar.test.tsx`

**Interfaces:**
- Produces:
  - `t()` keys namespaced `tabs.*`, `common.*`.
  - `<TabBar active: 'home'|'circles'|'people'|'me' />`.
  - `setLanguage(lang: 'en'|'de'): void`, persisted in `localStorage['tpb.lang']`.
  - CSS variables `--rust --teal --cream --ink --line --grey`.

- [ ] **Step 1: Write failing tests**
  - `i18n.test.ts › en and de have identical key sets` (flatten both JSON files; `expect(keys(de)).toEqual(keys(en))`).
  - `TabBar.test.tsx › renders four tabs in German`: after `setLanguage('de')`, the labels are `Start`, `Kreise`, `Leute`, `Ich`.
- [ ] **Step 2:** `npm test` → FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - Scaffold with Vite's React-TS template, pinned versions from the Tech Stack.
  - Use HashRouter routes `/`, `/circles`, `/people`, `/me` with placeholder screens.
  - TabBar with icons 🏠 🧭 👥 👤. EN labels: `Home`, `Circles`, `People`, `Me`.
- [ ] **Step 4:** `npm test` → PASS; `npm run dev` shows four tabs on cream background.
- [ ] **Step 5: Commit** `feat(app): shell, theme, EN/DE`

---

### Task 2: SQL test harness, core schema, membership gate

**Files:**
- Create: `app/scripts/test-db.mjs`, `app/supabase/test/auth_stub.sql`, `app/supabase/test/helpers.sql`
- Create: `app/supabase/migrations/0001_core.sql`
- Test: `app/supabase/test/core.test.sql`

**Harness (decided):**
- `test-db.mjs` drops and recreates database `tpb_test`, runs `auth_stub.sql`, then every `migrations/*.sql` in order, then `seed.sql` if present, then each `*.test.sql` in its own transaction, rolled back. It exits non-zero on the first error and prints the file and message.
- `auth_stub.sql` mimics Supabase:
  - roles `anon`, `authenticated`, `service_role`
  - schema `auth` with table `auth.users(id uuid pk, email text)`
  - `auth.uid()` returning `nullif(current_setting('request.jwt.claim.sub', true), '')::uuid`
  - `create publication supabase_realtime`
- `helpers.sql`:
  - `tests.make_user(email text, status text default 'member', role text default 'member') returns uuid` inserts into `auth.users` and `profiles`.
  - `tests.login(uid uuid)` does `set local role authenticated` and sets `request.jwt.claim.sub`.
  - `tests.assert_eq(actual anyelement, expected anyelement, label text)` and `tests.assert_raises(sql text, errcode_or_message text, label text)`.
- `package.json`: `"test:db": "node scripts/test-db.mjs"`.

**Schema in 0001_core.sql:**
- **`profiles`:**
  - `id uuid pk references auth.users on delete cascade`
  - `display_name text not null check (char_length between 1 and 60)`
  - `field text`, `origin text`, `languages text[] default '{}'`, `berlin_since date`
  - `bio text check (char_length(bio) <= 500)`, `fun_fact text check (<= 200)`
  - `teach text[] default '{}'`, `learn text[] default '{}'`, `avatar_url text`
  - `locale text default 'en' check (locale in ('en','de'))`
  - `status text default 'pending' check in ('pending','member','removed')`
  - `role text default 'member' check in ('member','admin')`
  - `invited_by uuid`, `consent_at timestamptz`, `created_at timestamptz default now()`, `approved_at timestamptz`
- **`app_settings`:** `id int pk default 1 check (id = 1)`, `vouches_required int default 2 check between 1 and 5`, `launch_open boolean default false`, `launch_code text`. One row is inserted.
- **`blocks`:** `(blocker_id, blocked_id)`, both `references profiles on delete cascade`, pk on both.
- **`reports`:** `id uuid pk`, `reporter_id`, `target_type text check in ('message','profile','meetup')`, `target_id uuid`, `reason text`, `status text default 'open' check in ('open','resolved')`, `created_at`.
- **Helpers** (`security definer stable`): `is_member() returns boolean`, `is_admin() returns boolean`.
- **RLS on `profiles`:**
  - select if `id = auth.uid()`, or (`is_member()` and `status = 'member'` and no block exists in either direction).
  - update own row only.
  - Column grants: `authenticated` may update only `display_name, field, origin, languages, berlin_since, bio, fun_fact, teach, learn, avatar_url, locale, consent_at`.
- **RLS on `app_settings`:** members read; admins update. `blocks`: own rows. `reports`: insert own; admins read and update.

**Interfaces:**
- Produces: tables above; `is_member()`, `is_admin()`; the `tests.*` helpers used by every later SQL test.

- [ ] **Step 1: Write failing tests** in `core.test.sql`:
  - `pending user sees only own profile` (pending A logs in: `select count(*) from profiles` = 1).
  - `member sees other members but not pending ones`.
  - `removed user sees nothing but own row`.
  - `member cannot set own status or role` (`assert_raises('update profiles set role = ''admin'' where id = auth.uid()', '42501', …)`).
  - `blocked user's profile hidden both ways`.
  - `non-admin cannot change vouches_required`.
- [ ] **Step 2:** `npm run test:db` → FAIL (`relation "profiles" does not exist`).
- [ ] **Step 3: Implement** `test-db.mjs`, the stub, the helpers and `0001_core.sql`.
- [ ] **Step 4:** `npm run test:db` → all `core.test.sql` assertions pass.
- [ ] **Step 5: Commit** `feat(db): core schema, membership gate, SQL test harness`

---

### Task 3: Invites, vouching, launch link, approvals

**Files:**
- Create: `app/supabase/migrations/0002_invites.sql`
- Test: `app/supabase/test/invites.test.sql`

**Schema:**
- **`invites`:** `code text pk` (10 chars, `[a-z0-9]`), `inviter_id uuid references profiles on delete cascade` (null for launch), `kind text check in ('personal','launch')`, `created_at`, `expires_at` (personal: `now() + 14 days`), `used_by uuid`, `used_at`.
- **`vouches`:** `(candidate_id, voucher_id)` pk, `created_at`.
- The launch code lives in `app_settings.launch_code`, set by `open_launch()`.

**Functions** (`security definer`, `set search_path = public`):
- `create_invite() returns text`: caller must be a member; inserts a personal invite.
- `redeem_invite(p_code text, p_display_name text) returns text`:
  - Caller already has a profile → returns its status.
  - Launch code while `launch_open` → creates the profile as `member` with `approved_at = now()`. Launch code while closed → raises `invite_invalid`.
  - Personal code, unused and unexpired → creates the profile as `pending` with `invited_by`, marks the code used, inserts the inviter's vouch, then `evaluate_candidate`.
  - Anything else → raises `invite_invalid`.
- `vouch(p_candidate uuid) returns text`: caller is a member; candidate is pending and not the caller. Inserts the vouch (duplicate is a no-op), then evaluates. Returns the new status.
- `evaluate_candidate(p_candidate uuid) returns text` (internal): if vouch count ≥ `vouches_required`, sets `member` and `approved_at`.
- Admin-only:
  - `approve_member(p_candidate uuid) returns void`
  - `remove_member(p_user uuid) returns void`: sets `removed` and deletes circle memberships once Task 5 exists; use `delete … where exists` guarded by `to_regclass('public.circle_members')`.
  - `set_admin(p_user uuid, p_admin boolean) returns void`
  - `open_launch() returns text`: generates `launch_code`, sets `launch_open = true`, returns the code.
  - `close_launch() returns void`
- `bootstrap_admin(p_email text) returns void`: callable only by `service_role` (Nella's setup). Makes that user's profile `member` + `admin`, creating it if missing.

**Interfaces:**
- Consumes: Task 2 tables and helpers.
- Produces: the RPCs above, called by `src/data/invites.ts` (Task 4) and `src/data/admin.ts` (Task 14).

- [ ] **Step 1: Write failing tests** in `invites.test.sql`:
  - `launch code admits directly while open`
  - `launch code rejected after close_launch` (`invite_invalid`)
  - `personal invite makes pending with 1 vouch`
  - `second vouch makes member when required = 2`
  - `required = 3 needs a third vouch`
  - `invite cannot be reused`
  - `expired invite rejected`
  - `pending user cannot vouch`
  - `cannot vouch for yourself`
  - `admin approve_member skips vouches`
  - `non-admin cannot approve_member` (raises)
  - `removed user cannot redeem again to get back in` (returns `removed`)
- [ ] **Step 2:** `npm run test:db` → FAIL (`function create_invite() does not exist`).
- [ ] **Step 3:** Implement `0002_invites.sql`. `evaluate_candidate` locks the profile row (`for update`) so two simultaneous vouches can't both promote it.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5: Commit** `feat(db): invites, vouching, launch link, approvals`

---

### Task 4: Login with email code, joining, waiting, welcome

**Files:**
- Create:
  - `app/src/lib/supabase.ts` (`createClient(url, key, { auth: { flowType: 'pkce', persistSession: true } })`)
  - `app/src/data/session.ts`, `app/src/data/invites.ts`
  - `app/src/features/auth/LoginScreen.tsx`, `JoinRoute.tsx`, `WaitingScreen.tsx`, `WelcomeFlow.tsx`
- Modify: `app/src/App.tsx` (auth gate)
- Test: `app/src/features/auth/LoginScreen.test.tsx`, `app/src/features/auth/gate.test.tsx`

**Interfaces:**
- Produces:
  - `sendCode(email: string): Promise<{ ok: true } | { ok: false; reason: 'rate_limited' | 'invalid_email' | 'unknown' }>`
  - `verifyCode(email: string, code: string): Promise<boolean>`
  - `useSession(): { userId: string | null; profile: Profile | null; loading: boolean }`
  - `redeemInvite(code: string, displayName: string): Promise<'member'|'pending'|'removed'>`
  - `type Profile` (all `profiles` columns, camelCased)
- Gate rules in `App.tsx`:
  - No session → `LoginScreen`.
  - Session but no profile → "You need an invite" screen.
  - `JoinRoute` at `#/join/:code` remembers the code in `sessionStorage['tpb.invite']` until login, then calls `redeemInvite`.
  - Status `pending` → `WaitingScreen` (shows vouches so far vs required; edit profile allowed).
  - `removed` → a goodbye screen.
  - `member` without `consent_at` → `WelcomeFlow`.
  - Otherwise → tabs.
- WelcomeFlow steps:
  1. name, field, origin, languages, Berlin since
  2. bio, fun fact
  3. "I can teach" and "I want to learn" tags (free text, comma-separated, max 10 each)
  4. pick circles (open circles join instantly; closed ones send a request), using Task 6's `joinCircle`/`requestJoin`. Until Task 6 lands, this step renders the list read-only.
  5. Two checkboxes, both required: "I am 18 or older" and the privacy notice. Saving sets `consent_at`.

- [ ] **Step 1: Write failing tests:**
  - `LoginScreen › sends a code then verifies with type email`: mock `supabase.auth.signInWithOtp` and `verifyOtp`; enter email, submit, enter `123456`. Expect `verifyOtp` called with `{ email, token: '123456', type: 'email' }`.
  - `LoginScreen › shows rate-limit message`: `signInWithOtp` resolves `{ error: { status: 429, code: 'over_email_send_rate_limit' } }`. Expect `t('login.rateLimited')` text, in EN and in DE.
  - `gate › pending profile shows WaitingScreen`.
  - `gate › member without consent shows WelcomeFlow`.
  - `gate › no profile shows need-invite screen`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** the screens and data functions.
  - `sendCode` passes `options: { shouldCreateUser: true }`.
  - The login copy tells people the email contains a **6-digit code** to type in.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(app): email-code login, invite redemption, waiting and welcome`

---

### Task 5: Circles: membership, closed joins, recommendations, proposals

**Files:**
- Create: `app/supabase/migrations/0003_circles.sql`, `app/supabase/seed.sql`
- Test: `app/supabase/test/circles.test.sql`

**Schema:**
- **`circles`:** `id uuid pk`, `name text unique not null`, `description text`, `emoji text`, `color text`, `visibility text check in ('open','closed')`, `status text default 'active' check in ('active','archived')`, `created_by uuid`, `created_at`.
- **`circle_members`:** `(circle_id, user_id)` pk, `role text default 'member' check in ('member','host')`, `joined_at`.
- **`join_requests`:** `id uuid pk`, `circle_id`, `user_id`, `status text default 'pending' check in ('pending','approved','declined')`, `created_at`, `decided_by`. Unique pending per (circle, user).
- **`circle_recommendations`:** `(circle_id, candidate_id, recommender_id)` pk, `created_at`.
- **`circle_proposals`:** `id uuid pk`, `proposer_id`, `name`, `description`, `emoji`, `visibility`, `cohosts uuid[] default '{}'`, `status text default 'pending' check in ('pending','approved','declined','question')`, `admin_note text`, `decided_by`, `created_at`.
- **Helpers:** `is_circle_member(p_circle uuid)`, `is_circle_host(p_circle uuid)` (host or admin).
- **RLS:**
  - Members see all active circles (name, description, emoji, colour, visibility, member count via the view `circle_cards`).
  - `circle_members` rows are readable when the circle is open or the caller is in it.
  - `join_requests` are readable by the requester and by circle hosts.
  - Proposals are readable by the proposer and admins.

**Functions:**
- `join_circle(p_circle) returns void`: open only, else raises `circle_closed`.
- `leave_circle(p_circle) returns void`
- `request_join(p_circle) returns uuid`
- `recommend(p_circle uuid, p_candidate uuid) returns void`: caller must be a circle member, candidate a member of the app.
- `decide_join(p_request uuid, p_approve boolean) returns void`: host or admin. A host approving needs ≥1 recommendation, else raises `needs_recommendation`; an admin may approve without.
- `propose_circle(p_name, p_description, p_emoji, p_visibility, p_cohosts uuid[]) returns uuid`
- `decide_proposal(p_id uuid, p_decision text, p_note text) returns uuid`: admin only. `approved` creates the circle with the proposer and cohosts as hosts and returns its id; `declined` or `question` stores the note and returns null.
- `set_visibility(p_circle, p_visibility)` and `set_host(p_circle, p_user, p_is_host boolean)`: admin only.

**seed.sql** (name · emoji · colour · visibility · description):

| Name | Emoji | Colour | Visibility | Description |
|---|---|---|---|---|
| Karaoke | 🎤 | #8E3B8A | open | Sing badly, together |
| Book Lovers | 📚 | #A0522D | open | Reading circles & author talks |
| Co-working & Networking | 💻 | #C1592A | open | Work side by side, meet professionals |
| Women Events | ✊ | #B9647D | **closed** | Gatherings for women |
| Art Lovers | 🎨 | #2E6E8E | open | Galleries, museums, studios |
| Berlin Events | 🐻 | #D9A441 | open | Festivals, concerts, city life |
| Sports Events | ⚽ | #2F5D58 | open | Run, play, watch |
| BBB · Belong Beyond Borders | 🌍 | #3C4A7A | **open** | Culture, co-working and shared hobbies |

**Interfaces:**
- Consumes: `is_member()`, `is_admin()`, `tests.*`.
- Produces: the functions above and the view `circle_cards(id, name, description, emoji, color, visibility, member_count, is_member, my_request_status)`.

- [ ] **Step 1: Write failing tests** in `circles.test.sql`:
  - `member joins open circle`
  - `join_circle on closed raises circle_closed`
  - `host cannot approve without recommendation`
  - `host approves after recommendation`
  - `admin approves without recommendation`
  - `non-member of circle cannot recommend`
  - `pending app user cannot see circles`
  - `proposal approved creates circle with hosts`
  - `non-admin cannot decide_proposal`
  - `seed has 8 circles, BBB open`
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Implement `0003_circles.sql` and `seed.sql`.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5: Commit** `feat(db): circles, closed joins, recommendations, proposals`

---

### Task 6: Circles screens

**Files:**
- Create: `app/src/data/circles.ts`, `app/src/features/circles/CirclesScreen.tsx`, `CircleScreen.tsx`, `ProposeCircle.tsx`
- Test: `app/src/features/circles/CirclesScreen.test.tsx`

**Interfaces:**
- Consumes: Task 5 RPCs and the `circle_cards` view.
- Produces:
  - `listCircles(): Promise<CircleCard[]>`, `joinCircle(id)`, `leaveCircle(id)`, `requestJoin(id)`, `recommend(circleId, userId)`, `proposeCircle(input: ProposalInput)`, `listMembers(circleId): Promise<MemberRow[]>`
  - Route `#/circles/:id` with tabs `chat | meetups | members | board`. Chat and board are filled in Task 10; meetups in Task 8.

- [ ] **Step 1: Write failing tests** (mock `data/circles`):
  - `shows open and closed badges`: an open card has `🔓`, a closed card `🔒`.
  - `open circle shows Join, closed shows Request to join`.
  - `pending request shows status "Waiting for approval"`.
  - `propose form requires a name and sends visibility`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** to match mockup 02 section 1.
  - Grid of coloured cards with member counts.
  - A closed circle's page before joining shows the description and member count plus the request status steps (sent → recommended → approved). Members, chat, meetups and board stay hidden.
  - "Propose a circle" card at the bottom.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(app): circles list, circle page, join/request, proposals`

---

### Task 7: Meetups, RSVPs, check-in (database)

**Files:**
- Create: `app/supabase/migrations/0004_meetups.sql`
- Test: `app/supabase/test/meetups.test.sql`

**Schema:**
- **`meetups`:**
  - `id uuid pk`, `circle_id references circles on delete cascade`, `host_id references profiles on delete cascade`
  - `title text check (char_length between 1 and 100)`, `description text`
  - `starts_at timestamptz not null`, `ends_at timestamptz not null check (ends_at > starts_at)`
  - `location_name text`, `lat double precision not null`, `lng double precision not null`
  - `sign text check (char_length(sign) <= 120)`, `bring text`, `capacity int check (capacity > 0)`
  - `cancelled_at timestamptz`, `created_at`
- **`rsvps`:** `(meetup_id, user_id)` pk, `created_at`, `checked_in_at`, `confirmed_by uuid`.
- **RLS:**
  - Meetups are readable by circle members (`is_circle_member(circle_id)`).
  - Insert if circle member and `host_id = auth.uid()`.
  - Update/cancel by the meetup host or `is_circle_host`. Moving the pin is an update of `lat`, `lng`, `sign`.
  - RSVPs are readable by circle members.

**Functions:**
- `rsvp(p_meetup) returns text`: `'going'` | `'full'`; must be a circle member.
- `cancel_rsvp(p_meetup) returns void`
- `check_in(p_meetup uuid, p_lat double precision, p_lng double precision) returns text`:
  - `'checked_in'` | `'not_going'` | `'too_early'` | `'too_late'` | `'too_far'`
  - Window is `starts_at − 30 min` to `ends_at + 30 min`; uses the haversine distance in metres from `haversine_m(lat1, lng1, lat2, lng2)` (Earth radius 6 371 000 m); the limit is 300.
- `confirm_attendance(p_meetup, p_user) returns void`: meetup host or circle host.

**Interfaces:**
- Produces: the functions above, and `haversine_m` (also mirrored in TS in Task 8).

- [ ] **Step 1: Write failing tests:**
  - `circle member creates meetup`
  - `non-member of circle cannot see meetup`
  - `pending app user cannot see meetup`
  - `rsvp returns full at capacity`
  - `check_in 2 hours before start returns too_early` (use `starts_at = now() + interval '2 hours'`)
  - `check_in 1 km away returns too_far` (pin at 52.4731, 13.4039, i.e. Tempelhofer Feld; caller at 52.4821, 13.4039, about 1 km north)
  - `check_in 100 m away during event returns checked_in`
  - `check_in without rsvp returns not_going`
  - `non-host cannot move pin`
  - `host confirms attendance`
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Implement `0004_meetups.sql`.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5: Commit** `feat(db): meetups, RSVPs, check-in rules`

---

### Task 8: Meetup screens, map pin, Home

**Files:**
- Create:
  - `app/src/lib/time.ts`, `app/src/lib/geo.ts`, `app/src/data/meetups.ts`
  - `app/src/features/meetups/MeetupScreen.tsx`, `MeetupForm.tsx`, `PinPicker.tsx`
  - `app/src/features/home/HomeScreen.tsx`
- Modify: `CircleScreen.tsx` (meetups tab + "＋ Meetup" button)
- Test: `app/src/lib/time.test.ts`, `app/src/lib/geo.test.ts`, `app/src/features/home/HomeScreen.test.tsx`

**Interfaces:**
- Produces:
  - `formatMeetupTime(startIso: string, endIso: string, lang: 'en'|'de'): string`, using `Intl.DateTimeFormat` with `timeZone: 'Europe/Berlin'`
  - `isThisWeekend(iso: string, now: Date): boolean` (Fri 17:00 to Sun 23:59 Berlin time)
  - `distanceMeters(a: {lat,lng}, b: {lat,lng}): number`
  - `directionsUrl(lat, lng): string` = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  - `listUpcoming(): Promise<MeetupCard[]>` (from my circles, `starts_at >= now() - 3h`, not cancelled, ordered)
  - `getMeetup(id)`, `createMeetup(input)`, `updatePin(id, lat, lng, sign)`, `rsvp(id)`, `cancelRsvp(id)`, `checkIn(id, lat, lng): Promise<CheckInResult>`
  - Realtime subscription on that meetup row, so a moved pin updates live.

- [ ] **Step 1: Write failing tests:**
  - `time › shows Berlin time regardless of device zone`: run with `process.env.TZ = 'America/New_York'`. `formatMeetupTime('2026-07-04T12:00:00Z','2026-07-04T16:00:00Z','en')` contains `14:00` and `18:00`.
  - `time › isThisWeekend true for Saturday 14:00 Berlin, false for Monday`.
  - `geo › Tempelhof 1 km check`: `distanceMeters({lat:52.4731,lng:13.4039},{lat:52.4821,lng:13.4039})` is between 990 and 1010.
  - `geo › directionsUrl has destination`.
  - `Home › filters This weekend and Near me`: mock three meetups and `navigator.geolocation`. "Near me" keeps meetups within 5 km.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement**, matching mockup 01 screens 1–2.
  - **PinPicker:** a Leaflet map with OSM tiles and attribution `© OpenStreetMap contributors`, centred on Berlin (52.52, 13.405, zoom 12). Tap sets the pin; "📍 Use my location" button.
  - **MeetupScreen:**
    - title, circle, host, Berlin time, location name, map with pin and the sign bubble
    - buttons Going/Cancel, Directions, **I'm here**. "I'm here" reads geolocation, calls `checkIn`, and shows the result message in EN/DE.
    - "bring" notes, capacity, going count with avatars, host-only "Move pin"
    - meetup chat placeholder until Task 10
  - **Home:** chips All / This weekend / Near me; cards as in the mockup; empty state "No meetups yet: join a circle".
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(app): meetups with find-us pin, check-in, home feed`

---

### Task 9: Chat, reactions, polls, board (database)

**Files:**
- Create: `app/supabase/migrations/0005_chat.sql`
- Test: `app/supabase/test/chat.test.sql`

**Schema:**
- **`messages`:**
  - `id uuid pk`, `circle_id uuid references circles on delete cascade`, `meetup_id uuid references meetups on delete cascade`, `check (num_nonnulls(circle_id, meetup_id) = 1)`
  - `author_id references profiles on delete cascade`, `body text check (char_length between 1 and 2000)`
  - `kind text default 'text' check in ('text','poll')`, `poll_id uuid`, `reply_to uuid references messages on delete set null`
  - `mentions uuid[] default '{}'`, `created_at`, `deleted_at`
- **`reactions`:** `(message_id, user_id, emoji)` pk, `emoji check in ('❤️','😂','🙌','👍','🤔','🔥')`.
- **`polls`:** `id`, `circle_id`, `author_id`, `question text 1..200`, `created_at`, `closes_at`.
- **`poll_options`:** `id`, `poll_id`, `label text 1..80`, `position int`.
- **`poll_votes`:** `(poll_id, user_id)` pk, `option_id`.
- **`board_pins`:** `id`, `circle_id`, `author_id`, `title 1..100`, `body ≤ 1000`, `url`, `created_at`.
- **RLS:**
  - Circle messages: circle members read and write (`author_id = auth.uid()`).
  - Meetup messages: members of the meetup's circle read; insert only while `now() <= meetups.ends_at + interval '2 days'`.
  - Polls, votes and pins follow the circle.
- **Realtime:** `alter publication supabase_realtime add table messages, reactions, poll_votes, meetups, rsvps`.

**Functions:**
- `create_poll(p_circle uuid, p_question text, p_options text[]) returns uuid`: 2–6 options; also inserts a `kind='poll'` message.
- `vote(p_poll uuid, p_option uuid) returns void`: replaces the previous vote; raises `poll_closed` after `closes_at`.
- `delete_message(p_id) returns void`: author, circle host or admin. Sets `deleted_at`; the body is replaced by `''` in the view `messages_visible`.

**Interfaces:**
- Produces: the tables, `create_poll`, `vote`, `delete_message`, and the view `messages_visible`, which hides deleted bodies and messages from people the caller blocked.

- [ ] **Step 1: Write failing tests:**
  - `circle member posts and reads`
  - `non-member cannot read circle chat`
  - `meetup chat open 1 day after end`
  - `meetup chat refuses insert 3 days after end`
  - `create_poll needs 2..6 options`
  - `vote twice keeps one vote`
  - `vote after closes_at raises poll_closed`
  - `blocked author's messages hidden in messages_visible`
  - `author can delete, other member cannot`
  - `removed user cannot read`
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Implement `0005_chat.sql`.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5: Commit** `feat(db): circle and meetup chat, polls, board`

---

### Task 10: Chat screens: circle chat, meetup chat, polls, board

**Files:**
- Create:
  - `app/src/data/chat.ts`
  - `app/src/features/chat/ChatView.tsx`, `Composer.tsx`, `PollCard.tsx`, `PollComposer.tsx`, `Board.tsx`
- Modify: `CircleScreen.tsx` (chat + board tabs), `MeetupScreen.tsx` (meetup chat)
- Test: `app/src/features/chat/ChatView.test.tsx`, `PollCard.test.tsx`

**Interfaces:**
- Consumes: Task 9 tables and RPCs.
- Produces:
  - `useMessages(scope: { circleId } | { meetupId }): { messages: ChatMessage[]; send(body: string, opts?: { replyTo?: string; mentions?: string[] }): Promise<void>; loadOlder(): Promise<void> }` (50 per page; Realtime inserts and updates appended)
  - `react(messageId, emoji)`, `createPoll(circleId, question, options)`, `vote(pollId, optionId)`, `usePoll(pollId)`, `listPins(circleId)`, `addPin(input)`, `deleteMessage(id)`, `report(targetType, targetId, reason)`

- [ ] **Step 1: Write failing tests:**
  - `ChatView › read-only banner after meetup chat closes`: given a meetup ended 3 days ago, the composer is replaced by `t('chat.closed')`.
  - `ChatView › @mention autocomplete inserts name and records mention id`.
  - `PollCard › shows counts and marks my vote`.
  - `PollCard › composer rejects fewer than 2 options`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement**, matching mockup 02 section 2 for the parts in scope.
  - Message bubbles with name, time, reactions bar, reply, report, delete (own, or host).
  - "＋" menu with **Poll** and **Pin to board**, plus **Propose a meetup**, which opens `MeetupForm` for this circle.
  - Board tab lists pins.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(app): circle and meetup chat, polls, board`

---

### Task 11: People, profiles, waiting list

**Files:**
- Create:
  - `app/src/lib/people.ts`, `app/src/data/profiles.ts`
  - `app/src/features/people/PeopleScreen.tsx`, `ProfileScreen.tsx`, `WaitingList.tsx`
- Test: `app/src/lib/people.test.ts`, `app/src/features/people/ProfileScreen.test.tsx`

**Interfaces:**
- Produces:
  - `normalize(s: string): string`: lowercase, trim, strip diacritics (`ü→u`, `ß→ss`)
  - `canTeachMe(myLearn: string[], theirTeach: string[]): boolean` (any normalized match)
  - `filterPeople(people: PersonCard[], q: string, filter: 'all'|'new'|'canTeachMe'|'sameField', me: Profile, now: Date): PersonCard[]` (`new` = `approved_at` within 30 days)
  - `listPeople()`, `getProfile(id)`, `listPending(): Promise<PendingCard[]>` (pending profiles with vouch counts; a `security definer` RPC `pending_candidates()` added in a small `0005b_people.sql`), `vouch(id)`, `block(id)`, `unblock(id)`

- [ ] **Step 1: Write failing tests:**
  - `people › normalize handles umlauts`: `normalize('Grüße')` = `grusse`.
  - `people › canTeachMe matches case-insensitively`: `['Python']` vs `['python','Figma']` → true.
  - `people › search matches field, skills and languages`.
  - `people › new filter uses approved_at within 30 days`.
  - `Profile › recommend sheet lists only my circles and calls recommend`.
  - `Profile › never renders email or phone` (profile object includes `email`; the text is absent from the DOM).
- [ ] **Step 2:** `npm test` → FAIL; the `pending_candidates` SQL test in `people.test.sql` → FAIL.
- [ ] **Step 3: Implement**, matching mockup 02 section 3.
  - **Directory:** search, chips All / New this month / Can teach me / Same field, and person cards with "teaches/learning" tags.
  - **Profile:** avatar or initials, bio, fun fact, tags, circles; actions **Recommend to a circle**, **Block**, **Report**.
  - **"Waiting to join" section:** pending people with "invited by" and a vouch count, plus a **Vouch** button.
- [ ] **Step 4:** `npm test` and `npm run test:db` → PASS.
- [ ] **Step 5: Commit** `feat(app): people directory, profiles, vouching list`

---

### Task 12: Me: profile, invites, language, data export, account deletion

**Files:**
- Create:
  - `app/src/features/me/MeScreen.tsx`, `EditProfile.tsx`, `Invites.tsx`
  - `app/supabase/functions/delete-account/index.ts`
  - `app/supabase/migrations/0005c_me.sql` (`export_my_data() returns jsonb`; Storage bucket `avatars` and its policies, guarded by `if to_regclass('storage.objects') is not null`)
- Test: `app/supabase/test/me.test.sql`, `app/src/features/me/Invites.test.tsx`

**Interfaces:**
- Produces:
  - `createInvite(): Promise<{ code: string; url: string }>`, where the url is `${location.origin}/Third-Place-Berlin/app/#/join/${code}`
  - `shareInvite(url)`: uses `navigator.share` when present, else copies to the clipboard
  - `uploadAvatar(file: File): Promise<string>`: bucket `avatars`, path `${userId}.jpg`, image resized client-side to ≤ 512 px
  - `exportMyData(): Promise<Blob>` (JSON)
  - `deleteAccount(): Promise<void>`, which calls Edge Function `delete-account`. The function verifies the caller's JWT and deletes the auth user with the service role; cascades remove all rows.

- [ ] **Step 1: Write failing tests:**
  - `me.test.sql › export_my_data returns my profile, memberships, rsvps, messages and nothing of others`.
  - `Invites › creates link and shares with WhatsApp-friendly text`: the shared text contains the URL and `t('invites.shareText')`.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3: Implement** the Me screen sections:
  - profile (edit + photo), language EN/DE, my invites (create/share, list with used/expired), my circles, notification settings (Task 13), blocked people
  - **Download my data**, **Delete my account** (double confirm), privacy notice, log out
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): me screen, invites, export and delete account`

---

### Task 13: Notifications: in-app inbox and push

**Files:**
- Create:
  - `app/supabase/migrations/0006_notifications.sql`
  - `app/supabase/functions/_shared/payload.ts`, `app/supabase/functions/send-push/index.ts`
  - `app/src/lib/push.ts`, `app/src/data/notifications.ts`
  - `app/src/features/me/Inbox.tsx`, `NotificationSettings.tsx`
- Test: `app/supabase/test/notifications.test.sql`, `app/supabase/functions/_shared/payload.test.ts` (run by Vitest)

**Schema and triggers:**
- **`notifications`:** `id`, `user_id`, `kind text check in ('meetup_new','poll_new','mention','reply','message_new','member_approved','join_request','join_decided','proposal_new','proposal_decided','recommended')`, `data jsonb`, `created_at`, `read_at`. RLS: own rows only.
- **`notification_prefs`:** `(user_id, circle_id)` pk, `meetups_polls bool default true`, `mentions bool default true`, `every_message bool default false`. A missing row means the defaults.
- **`push_subscriptions`:** `id`, `user_id`, `endpoint text unique`, `p256dh`, `auth`, `created_at`. RLS: own rows.
- **`after insert` triggers** create rows. Never for the actor; never for anyone who blocked the actor.
  - `meetups` → `meetup_new` to circle members with `meetups_polls`.
  - `polls` → `poll_new`, same rule.
  - `messages`:
    - `mention` to mentioned circle members with `mentions`
    - `reply` to the replied-to author
    - `message_new` to members with `every_message`, excluding those already notified by mention or reply
  - Profile status → member: `member_approved`.
  - `join_requests` insert → `join_request` to circle hosts; status change → `join_decided`.
  - `circle_proposals` insert → `proposal_new` to admins; decision → `proposal_decided`.
  - `circle_recommendations` → `recommended` to the candidate.
- **Push delivery:** a Supabase Database Webhook on `notifications` INSERT calls Edge Function `send-push` (configured in SETUP.md). The function loads the user's subscriptions and locale, builds the message with `buildPushPayload`, and sends with `npm:web-push@3.6.7` using the VAPID keys from function secrets. A `410 Gone` deletes the subscription.

**Interfaces:**
- Produces:
  - `buildPushPayload(kind: NotificationKind, data: Record<string, unknown>, lang: 'en'|'de'): { title: string; body: string; url: string }` (plain TS, no Deno imports)
  - `subscribeToPush(): Promise<'subscribed'|'denied'|'unsupported'|'needs_install'>`. On iOS when not running standalone (`!navigator.standalone`), returns `needs_install`.
  - `listNotifications()`, `markAllRead()`, `getPrefs(circleId)`, `setPrefs(circleId, prefs)`

- [ ] **Step 1: Write failing tests:**
  - `new meetup notifies circle members except host`
  - `member with meetups_polls=false gets nothing`
  - `mention notifies only circle members`
  - `every_message off by default: plain message creates no notification`
  - `every_message on: one notification, not duplicated with mention`
  - `blocked actor does not notify blocker`
  - `join request notifies hosts`
  - `payload.test.ts › German meetup_new payload` (`buildPushPayload('meetup_new', { title: 'Picknick', circle: 'BBB' }, 'de').title` contains `Neues Treffen`)
- [ ] **Step 2:** `npm run test:db` and `npm test` → FAIL.
- [ ] **Step 3: Implement.**
  - Inbox under Me with an unread badge on the Me tab.
  - Per-circle settings matching mockup 02 ("New meetups & polls", "Mentions & replies to me", "Every message" off). The **daily digest toggle is not shown** (Stage 2).
  - "Turn on notifications" button. When it returns `needs_install`, show the iPhone instructions (Share → Add to Home Screen).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat: calm notifications, inbox, web push`

---

### Task 14: Admin

**Files:**
- Create: `app/src/data/admin.ts`, `app/src/features/admin/AdminScreen.tsx`
- Test: `app/src/features/admin/AdminScreen.test.tsx`, `app/supabase/test/admin.test.sql`

**Interfaces:**
- Consumes: Task 3 and Task 5 admin RPCs; `reports`; `app_settings`.
- Produces: an Admin entry on the Me screen, visible only when `profile.role === 'admin'`. Sections:
  1. **People waiting:** approve, or see vouches.
  2. **Circle proposals:** approve, decline or ask a question, with a note.
  3. **Circles:** open/closed toggle, assign/remove hosts, archive.
  4. **Reports:** view the target, remove the message or meetup, remove the member, resolve.
  5. **Launch link:** open (shows the code and a share button with the WhatsApp text) / close.
  6. **Settings:** vouches required (1–5); make or unmake admin.

- [ ] **Step 1: Write failing tests:**
  - `admin.test.sql › admin can remove a meetup and a message of others`
  - `admin.test.sql › only admins read reports`
  - `AdminScreen › hidden for non-admin`
  - `AdminScreen › launch toggle shows code and share`
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implement (admin delete policies, if missing, in `0006b_admin.sql`).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): admin console`

---

### Task 15: Installable PWA, deploy, setup guide

**Files:**
- Modify: `app/vite.config.ts` (vite-plugin-pwa)
- Create:
  - icons `app/public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (rust circle with white "TP", as on the website)
  - `app/src/features/me/InstallHelp.tsx`
  - `.github/workflows/deploy-app.yml`
  - `app/SETUP.md`
- Test: `app/src/pwa.test.ts`

**Decided:**
- **Manifest:** `name: 'Third Place Berlin'`, `short_name: 'Third Place'`, `start_url: '/Third-Place-Berlin/app/'`, `scope` the same, `display: 'standalone'`, `background_color '#FBF7F0'`, `theme_color '#C1592A'`.
- The service worker caches the app shell only, never Supabase API responses. It handles the `push` and `notificationclick` events (open `data.url`).
- **Workflow** (on push to `main` touching `app/**` or site files):
  - `npm ci && npm test && npm run build` in `app/`, with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from repo **variables**.
  - Assemble `_site/` = the website files at the root + `app/dist` at `_site/app/`.
  - Publish with `actions/deploy-pages@v4`. Pages source must be switched to "GitHub Actions"; this is listed in SETUP.md for Nella to do or approve.
- **SETUP.md** (Nella's checklist, in order):
  1. Supabase: run migrations and seed (SQL editor or `supabase db push`).
  2. Auth → SMTP: Brevo host/port/user/key, sender `Third Place Berlin`.
  3. Auth → Email templates **"Magic Link" and "Confirm signup"** (new users get the second one): both show `{{ .Token }}` prominently ("Your code: {{ .Token }}"), in English and German.
  4. Auth → URL config: site URL `https://nelladelva.github.io/Third-Place-Berlin/app/`.
  5. Generate VAPID keys (`npx web-push generate-vapid-keys`). Set function secrets and `VITE_VAPID_PUBLIC_KEY`.
  6. Deploy the Edge Functions `send-push` and `delete-account`.
  7. Create the Database Webhook `notifications` INSERT → `send-push`.
  8. Sign in once in the app, then run `select bootstrap_admin('<nella's email>')` in the SQL editor.
  9. Saskia signs in via a personal invite; Nella makes her admin in the app.
  10. Post 2–3 real meetups, then Admin → Launch link → share in WhatsApp.

- [ ] **Step 1: Write failing test:** `pwa.test.ts › manifest has standalone display, start_url under /app/, theme #C1592A` (import the manifest object exported from `vite.config.ts`).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement.** InstallHelp shows platform-specific steps (iPhone: Share → Add to Home Screen; Android: menu → Install app) when not running standalone.
- [ ] **Step 4:** `npm test` → PASS; `npm run build && npx vite preview` → app installs from Chrome, and offline reload shows the shell.
- [ ] **Step 5: Commit** `feat: installable PWA, Pages deploy, setup guide`

---

### Final check (after Task 15, with Nella's Supabase project)

- [ ] `npm test` and `npm run test:db` → all green.
- [ ] **Manual run on two phones (iPhone + Android):**
  - install the app; log in with the 6-digit code
  - redeem the launch link; complete welcome
  - join BBB (open); request Women Events (closed), get recommended and approved
  - create a meetup with a pin at Tempelhof; second phone sees it on Home and gets a push; RSVP; chat
  - move the pin; it updates live on the other phone
  - "I'm here" refused from home (too far / too early)
  - poll and vote; pin to board
  - People search "python"; recommend someone to a circle; vouch for a personal invite
  - German UI throughout; export data; delete a test account
