# Third Place Berlin app: setup and launch checklist

For **Nella**, the account owner. Do these steps in order; each takes a few minutes. Everything here is free.
The app code lives in this folder (`app/`). The database rules live in `app/supabase/`.

---

## 1. Supabase project (database, login, chat)

1. Go to **supabase.com** → *New project*.
   - Name: `third-place-berlin`
   - Region: **Central EU (Frankfurt)**
   - Save the database password in your password manager.
2. **Run the database setup:** open *SQL Editor* → *New query*. Paste each file below, in this order, and press **Run** after each one:
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
   11. finally `app/supabase/seed.sql` (the 8 launch circles)
3. *Project Settings → API*: copy the **Project URL** and the **anon public** key. (The anon key is meant to be public. **Never** share the `service_role` key.)

## 2. Login emails with a 6-digit code (Brevo, free: 300 emails/day)

Supabase's built-in email only sends a handful of emails per hour. That's not enough for launch day.

1. Create a free account at **brevo.com** → *SMTP & API* → create an **SMTP key**.
2. In Supabase, open *Authentication → Emails → SMTP Settings* → **Enable custom SMTP**, and fill in:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - User: your Brevo login
   - Password: the SMTP key
   - Sender name: `Third Place Berlin`
   - Sender email: an address you verified in Brevo
3. *Authentication → Rate Limits*: set "emails per hour" to **100**.
   Also check *Authentication → Providers → Email*: **Email OTP Length = 6** (the app's code box takes 6 digits).
4. *Authentication → Emails → Templates*: replace **both** templates. "Confirm signup" is used for new people, and "Magic Link" for returning people.

   **Subject:** `Your Third Place Berlin code / Dein Code: {{ .Token }}`

   **Body:**
   ```html
   <h2>Your code: {{ .Token }}</h2>
   <p>Type this 6-digit code into the Third Place Berlin app. It expires in 1 hour.</p>
   <hr>
   <h2>Dein Code: {{ .Token }}</h2>
   <p>Gib diesen 6-stelligen Code in der Third-Place-Berlin-App ein. Er läuft in 1 Stunde ab.</p>
   ```
5. *Authentication → URL Configuration*:
   - Site URL: `https://nelladelva.github.io/Third-Place-Berlin/app/`
   - Add the same URL under *Redirect URLs*.

## 3. Push notifications

1. On your Mac, in this `app/` folder, run: `npx web-push generate-vapid-keys`. Keep the **public** and **private** keys.
2. Install the Supabase command line tool once: `brew install supabase/tap/supabase`, then `supabase login`.
3. From the `app/` folder:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<your email> WEBHOOK_SECRET=<any long random text>
   supabase functions deploy send-push --no-verify-jwt
   supabase functions deploy delete-account
   ```
4. In Supabase, open *Database → Webhooks* → *Create a new hook*:
   - Table: `notifications`
   - Events: **Insert**
   - Type: *Supabase Edge Functions* → `send-push`
   - Add an HTTP header `x-webhook-secret` with the same `WEBHOOK_SECRET` text.

## 4. Publish on GitHub Pages

1. On GitHub, open the repo *Third-Place-Berlin → Settings → Secrets and variables → Actions → **Variables***, and add:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon key
   - `VITE_VAPID_PUBLIC_KEY` = VAPID public key
2. *Settings → Pages → Build and deployment → Source*: choose **GitHub Actions**. From now on, the website and the app publish together.
3. Merge the `stage-1-app` branch into `main`. The workflow runs all tests, then publishes.
   - Website: `https://nelladelva.github.io/Third-Place-Berlin/`
   - App: `https://nelladelva.github.io/Third-Place-Berlin/app/`

## 5. Make yourself admin

1. Open the app on your phone and log in with your email and the code. You'll see "invite-only"; that's expected.
2. In Supabase *SQL Editor*, run: `select bootstrap_admin('<your email>');`
3. Reload the app. You're in as admin. Complete the welcome steps.
4. Quick check on the real project: change your profile photo **twice** (the second time replaces the first).

## 6. Before the launch link

1. **Saskia:** go to *Me → Invite someone*, send her the link, then (as admin) *Me → Admin console → People waiting → Approve now*. Then *Members → Make admin*.
2. In *Admin console → Circles*, assign a **host** to each circle and check open/closed (Women Events starts closed, the others open).
3. Post **2–3 real meetups**, for example the Tempelhof picnic, with the "find us here" pin and a sign.

## 7. Launch

1. *Admin console → Launch link → Open launch link → Share in WhatsApp*. Founding members who use this link get in directly.
2. When the move is done, **Close launch link**. From then on, new people need a personal invite plus one more vouch (change the number in *Settings*).

---

### Good to know

- **Cost:** €0 on the free plans for hundreds of members. A free Supabase project pauses after a week with *no activity at all*.
- **Privacy:**
  - Data is stored in Frankfurt (EU).
  - Members can download or delete their data under *Me*.
  - Emails and phone numbers are never shown to other members.
- **Tests:** `npm test` (screens) and `npm run test:db` (security rules, needs local Postgres) both run automatically on GitHub before every publish.
