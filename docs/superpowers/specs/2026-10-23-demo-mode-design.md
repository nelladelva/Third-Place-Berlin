# Third Place Berlin: demo mode (design)

Date: 2026-10-23 · Owner: Nella · Repo: `nelladelva/Third-Place-Berlin` (public) · App: `app/` (React + Vite PWA, Supabase backend)

## Why
- **Stage 1 is built and tested** (52 app tests, 176 database checks), but Nella can't see or use it yet. Every screen reads from Supabase, and the Supabase setup stalled at the database step.
- **Nella's decision:** "create the app first, add the sign-in layer later."
- **So the first goal** is a **demo** of the real app that she can click through on her phone and in a browser, and **share with friends later**, before any database, email or login exists.

## Goals
1. **The real Stage 1 app** (the same screens, the v2 + v3 "combined" mockup look) runs with **built-in sample data**, with no Supabase, no network calls to a backend, and no login.
2. **Published at its own address:** `https://nelladelva.github.io/Third-Place-Berlin/demo/`. It works on a phone (and can be installed to the home screen) and in any desktop browser.
3. **Everything the user does is remembered in that browser** across visits: posting, reacting, voting, "Going", joining circles, profile edits and so on.
4. **Nella is a pretend admin**, with a **switch to view the demo as an ordinary member**.

## Non-goals
- No shared state between people: each browser has its own separate demo world.
- No real email, login codes, push notifications, invites or account deletion. These are acted out (see below).
- No fake "live" activity: sample members don't reply or post on their own.
- No change to how the real app works with Supabase once it is set up.
- Stage 2 and 3 features stay out.

## Anti-goals (a failure even if it works)
- **The demo being mistaken for the real community,** for example a friend thinking they posted to the real group.
- **Any personal data in the demo:** real names of friends, real emails or photos of real people.
- **Demo code or sample data leaking into the real app build,** or the real app at `/app/` breaking because of the demo.
- **The demo and the future real app colliding on a phone,** for example when both are installed or both store data in the same place.

## Constraints
- Same codebase and screens; the demo is a **build mode** of the app, not a fork. Keep the existing tests green (52 app tests, 176 SQL checks).
- Costs nothing (GitHub Pages).
- English + German both work in the demo, as in the app.
- Publishing goes through the existing GitHub Actions workflow (`.github/workflows/deploy-app.yml`). Nella switches *Settings → Pages → Source* to **GitHub Actions** once.
- **Push and publish only on Nella's explicit "push it live".**
- Her current website must stay at `https://nelladelva.github.io/Third-Place-Berlin/` (the workflow already publishes it at the root).

## Decided

### What the person sees (Nella approved in the playback, 2026-10-23)
**Opening and look:**
- The demo opens **straight into Home**, with no login screen or code.
- A clear **"Demo · sample data"** ribbon is visible on every screen.

**Who you are:** a pretend admin ("You (demo)").
- A switch, for example in *Me*, flips between **Admin** and **Member** view.
- Member view hides the admin console and admin-only actions, exactly as the real app does for a non-admin.

**Remembered:** every action is saved in that browser and still there on the next visit.

**Reset demo:** a button under *Me* restores the starting sample data.

**Sample content (Claude's guess, accepted by Nella):**
- **The 8 real launch circles** from `app/supabase/seed.sql`: Karaoke, Book Lovers, Co-working & Networking, Women Events, Art Lovers, Berlin Events, Sports Events, BBB. They keep their real emoji, colours and open/closed settings, with Women Events closed.
- **About 15 made-up members** with fictional names, mixed nationalities, and "I can teach / I want to learn" entries. Avatars are initials or generic illustrations, never photos of real people.
- **4–6 upcoming meetups at real Berlin places,** with "find us here" pins and signs, including a **Tempelhof picnic** ("yellow blanket by the big tree").
  - The dates are always **relative to today**, so the demo never looks out of date.
- **A few circle chats** with messages, one poll, Board posts, a meetup chat, and some notifications in the inbox.
- **For the admin console:** a couple of people waiting, a join request on the closed circle, a circle proposal, and a report, so every admin screen has something to show.

**Acted out:**
- The email code step is skipped.
- Notifications appear only in the in-app inbox (no real push).
- "I'm here" check-in works anywhere, at any time.
- Invite links can be created and shared, but lead back to the demo.
- "Download my data" downloads the demo data.
- "Delete my account" resets the demo.
- Photo upload works locally (stored in the browser), or shows a sample picture.

**Maps:** OpenStreetMap tiles load normally, as in the real app.

### Where it lives
- **Demo:** `https://nelladelva.github.io/Third-Place-Berlin/demo/`.
- **Installable:** it has its own name ("Third Place Berlin Demo") and its own scope. It's a separate installed app from the future real one, with separate browser storage.
- **Claude's call: the real app stays unpublished** until the Supabase values exist as GitHub variables.
  - The workflow builds and publishes `/app/` only when `VITE_SUPABASE_URL` is set. Otherwise it publishes the website + demo only.
  - The reason: today the real app would be published without a backend and fail on every screen.

### How closely the demo follows the server's rules (Nella's decision after the builder check, 2026-10-23)
**Main flows behave for real.** The browser-side demo reproduces these rules from `app/supabase/migrations/`, including the inbox notifications they create:
- joining an open circle; requesting to join a closed one; a host or admin approving or declining (`decide_join`)
- recommending someone to a circle
- RSVP "Going" / "Not going", including **"full" at capacity**; "I'm here" check-in
- vouching and approval of waiting people (`approve_member`, the vouch threshold from Settings); opening and closing the launch link
- circle proposals and the admin's approve / decline / question (`decide_proposal`)
- posting, editing and deleting messages, reactions, @mentions, polls and votes, Board pins
- reports reaching the admin console; removing a member

**Simplified** (they behave plausibly but need not match the backend exactly):
- blocks hiding people across every screen
- the exact vouch counting edge cases
- meetup-chat closing 2 days after the event
- rate limits
- any rule no screen shows

### Dates and remembered data (Claude's call after the builder check)
- Sample content is stored **relative to a start date**: the first visit's date.
- On every load, **sample** meetups, messages and notifications are shifted forward by the days since then, so the demo always shows upcoming meetups and recent chats.
- **Everything the user creates or changes** keeps its real date and is never shifted.

### Language of the sample content (Claude's call after the builder check)
- The interface switches between English and German, as in the real app.
- The **sample content** (circle descriptions, bios, meetups, chats, poll, Board) is in **English only**, like the real circle descriptions in `seed.sql`.

## Left to the builder
- How the build switches to demo data: for example a `VITE_DEMO` flag and replacing the `src/data/` modules at build time, or a fake client behind the same functions.
- **Requirement:** the real build contains no demo code or sample data.
- The four places that talk to Supabase outside `src/data/` (`features/chat/CircleChat.tsx`, `features/meetups/MeetupScreen.tsx`, `features/auth/WelcomeFlow.tsx`, `lib/push.ts`) should be moved behind the data layer, so the demo can replace one layer.
- How storage is kept (local storage or IndexedDB) and its versioning, so a future demo update doesn't break an old saved demo. "Reset" or an automatic reset on version change are both fine.
- The exact sample names, texts and places, within the rules above.
- Where the Admin / Member switch and the ribbon sit, within the current look.
