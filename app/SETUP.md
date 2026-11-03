# Third Place Berlin app: setup and launch checklist

For **Nella**, the account owner. Everything here is free.
The app code lives in this folder (`app/`). The database rules live in `app/supabase/`.

> **Status (4 Nov 2026):** steps 0–5 are **done**. The real app is live at
> **https://nelladelva.github.io/Third-Place-Berlin/app/**. Steps 6–7 are for launch day.
> Keep this file as the recipe for rebuilding the project from scratch.

---

## 0. The demo (no setup)

A demo of the app runs on built-in sample data in the browser, with no Supabase and no login:
**https://nelladelva.github.io/Third-Place-Berlin/demo/**

- Published by the same GitHub workflow (*Settings → Pages → Source*: **GitHub Actions**). The repo must be **public** for Pages on the free plan.
- Locally: `npm run dev:demo`, or build it with `npm run build:demo` (output in `dist-demo/`).
- When the sample data changes, bump `SEED_VERSION` in `src/demo/seed.ts`, so returning visitors start fresh.

## 1. Supabase project (database, login, chat)

1. **supabase.com → New project.** Region: **Central EU (Frankfurt)**. Save the database password in your password manager.
   - Free projects **pause after a week without activity**. A paused project looks "not found"; restore it in the dashboard.
2. **Run the database setup**, these files in this order:
   1. `app/supabase/migrations/0001_core.sql`
   2. `0002_invites.sql`
   3. `0002b_join_status.sql`
   4. `0003_circles.sql`
   5. `0004_meetups.sql`
   6. `0005_chat.sql`
   7. `0005b_people.sql`
   8. `0005c_me.sql`
   9. `0006_notifications.sql`
   10. `0007_hardening.sql`
   11. `0008_french.sql` (French as a profile language)
   12. `0009_admins_join_any_circle.sql`
   13. `0010_recommend_or_approve.sql` (closed circles: a member's recommendation **or** a host's approval)
   14. `0011_weekly_question.sql` (the BBB Question of the Week, see step 3b)
   15. finally `app/supabase/seed.sql` (the 8 launch circles: only BBB open)

   **Three ways to run them:**
   - **Easiest:** paste each file into the dashboard's *SQL Editor* and press **Run**.
   - **From a Mac, with an access token** (what we used): create a token at *supabase.com/dashboard/account/tokens*, then send each file to the Management API endpoint `POST /v1/projects/<ref>/database/query`.
   - **With `psql`:** use the **Session pooler** address from *Connect* (`…pooler.supabase.com`). The direct `db.<ref>.supabase.co` address is IPv6-only and unreachable from most home networks.
   - ⚠️ Don't use `supabase db push`: it skips files with letters in the number (`0002b`, `0005b`, `0005c`).
3. *Project Settings → API*: the **Project URL** and the **anon public** key are needed in step 4. (The anon key is meant to be public. **Never** share the `service_role` key.)

## 2. Login emails with a 6-digit code (Brevo, free: 300 emails/day)

Supabase's built-in email sends only a few emails per hour, and **custom email templates are only allowed once your own sender is connected**.

1. **brevo.com** → free account → *Senders*: add and verify the sender address (we use Nella's Gmail; a domain of your own delivers even better).
2. *Settings → SMTP & API → SMTP*: **Generate a new SMTP key**. Note the **SMTP login** (`…@smtp-brevo.com`).
3. In Supabase, *Authentication → Emails → SMTP Settings* → **Enable custom SMTP**:
   - Host `smtp-relay.brevo.com` · Port `587` · User: the SMTP login · Password: the SMTP key
   - Sender name `Third Place Berlin` · Sender email: the verified address
4. *Authentication → Rate Limits*: "emails per hour" → **100**.
5. *Authentication → Providers → Email*: **Email OTP Length = 6**. ⚠️ New projects default to **8**, and the app's code box takes 6.
6. *Authentication → Emails → Templates*: replace **both** "Confirm signup" (new people) and "Magic Link" (returning people).

   **Subject:** `Your code / Dein Code / Ton code: {{ .Token }}`

   **Body:**
   ```html
   <h2>Your code: {{ .Token }}</h2>
   <p>Type this 6-digit code into the Third Place Berlin app. It expires in 1 hour.</p>
   <hr>
   <h2>Dein Code: {{ .Token }}</h2>
   <p>Gib diesen 6-stelligen Code in der Third-Place-Berlin-App ein. Er läuft in 1 Stunde ab.</p>
   <hr>
   <h2>Ton code : {{ .Token }}</h2>
   <p>Saisis ce code à 6 chiffres dans l’appli Third Place Berlin. Il expire dans 1 heure.</p>
   ```
7. *Authentication → URL Configuration*: Site URL **and** Redirect URLs = `https://nelladelva.github.io/Third-Place-Berlin/app/`
8. **Test:** request a code in the app and check it lands in the **inbox**, not spam.

## 3. Push notifications

1. In `app/`: `npx web-push generate-vapid-keys`. Keep the **public** and **private** keys somewhere private.
2. The Supabase command-line tool runs fine without installing: `npx supabase@latest …` (log in once, or set `SUPABASE_ACCESS_TOKEN`).
3. From the `app/` folder:
   ```bash
   npx supabase@latest secrets set --remote=<project-ref> VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<your email> WEBHOOK_SECRET=<long random text>
   npx supabase@latest functions deploy send-push --remote=<project-ref> --no-verify-jwt --use-api
   npx supabase@latest functions deploy delete-account --remote=<project-ref> --use-api
   ```
   Re-deploy `send-push` whenever `supabase/functions/_shared/payload.ts` changes (new notification texts).
4. **The trigger that sends a push for every new notification.** Either *Database → Webhooks* in the dashboard (table `notifications`, event **Insert**, Edge Function `send-push`, HTTP header `x-webhook-secret`), or this SQL, which is what we ran:
   ```sql
   create extension if not exists pg_net with schema extensions;
   create schema if not exists private;
   revoke all on schema private from public, anon, authenticated;
   create or replace function private.notify_send_push() returns trigger
   language plpgsql security definer set search_path = '' as $$
   begin
     perform net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/send-push',
       body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'schema', 'public', 'record', to_jsonb(new)),
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '<WEBHOOK_SECRET>'),
       timeout_milliseconds := 5000);
     return new;
   end $$;
   revoke all on function private.notify_send_push() from public, anon, authenticated;
   create trigger send_push_on_insert after insert on public.notifications
     for each row execute function private.notify_send_push();
   ```
   (Not a migration on purpose: it contains the secret.)
5. **Test:** on a phone, open the app (iPhone: from the Home Screen icon), *Me → 🔔 Turn on notifications*, then insert a notification for yourself. It should buzz.

### 3b. The Question of the Week (BBB)

Migration `0011` loads the 60 approved questions and schedules `post_weekly_question()` with **pg_cron** at 07:00 and 08:00 UTC on Mondays. One of those is 9:00 in Berlin (summer or winter time); the function ignores the other and never posts twice a day. Check the schedule with `select * from cron.job;`.

## 4. Publish on GitHub Pages

1. Repo → *Settings → Secrets and variables → Actions → **Variables***:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon key
   - `VITE_VAPID_PUBLIC_KEY` = VAPID public key
2. Push to `main`, or re-run the workflow. It runs all tests, then publishes:
   - Website: `https://nelladelva.github.io/Third-Place-Berlin/`
   - Demo: `…/demo/`
   - App: `https://nelladelva.github.io/Third-Place-Berlin/app/` (only once `VITE_SUPABASE_URL` is set)

## 5. Make yourself admin

1. Open the app, log in with your email and the code. You'll see "invite-only"; that's expected.
2. In the SQL Editor: `select bootstrap_admin('<your email>');`
3. Reload the app. You're in as admin; complete the welcome steps.
4. Admins can join **any** circle directly, closed ones included.
5. More admins later: *Me → Admin console → Members → Make admin*.

## 6. Before the launch link

1. **Circles:** only 🌍 BBB is open; the other 7 are closed. In closed circles you ask to join, then **either** a member recommends you **or** a host (or admin) approves. Assign **hosts** in *Admin console → Circles* when there are members to choose from; until then, admins approve.
2. Post **2–3 real meetups**, with the "find us here" pin and a sign.
3. **Dry run** with 2–3 friends (iPhone + Android, different email providers). Check that login codes don't land in spam.

## 7. Launch

1. *Admin console → Launch link → Open launch link → Share in WhatsApp* (or a QR code). Founding members who use this link get in directly.
2. When the move is done, **Close launch link**. From then on, new people need a personal invite plus one more vouch (change the number in *Settings*).

---

### Good to know

- **Cost:** €0 on the free plans for hundreds of members.
- **Privacy:**
  - Data is stored in Frankfurt (EU).
  - Members can download or delete their data under *Me*.
  - Emails and phone numbers are never shown to other members.
- **Keys:** never paste keys into a chat or a document. Keep them in a password manager or a private file. If one leaks, generate a new one and delete the old one.
- **Tests:** `npm test` (screens) and `npm run test:db` (security rules, needs local Postgres) both run automatically on GitHub before every publish.
