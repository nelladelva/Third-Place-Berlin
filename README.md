# Third Place Berlin

A community site for multicultural professionals who just moved to Berlin —
professional network, cultural exchange, co-working, volunteering, and
learning opportunities. Features member communities (starting with ABC) and
a newsletter.

## Structure
- `index.html` — the whole site, single self-contained file (logo image is embedded).

## Before publishing
Replace these placeholders in `index.html`:
- `[email address]`, `[Instagram handle]`, `[website]` — footer contact info
- `[Next community — add yours here]` (×2) — additional member communities
- `YOUR_SIGNUP_FORM_ID` — Formspree endpoint for the "Join The Community" form
- `YOUR_NEWSLETTER_FORM_ID` — Formspree endpoint for the newsletter signup
  (use a *different* Formspree form than the sign-up one, so submissions
  don't mix)

## Deploy
Hosted via GitHub Pages. After pushing, enable it in
Settings → Pages → Deploy from branch → main → / (root).

## App demo
A clickable demo of the Third Place Berlin app (sample data, no login):
https://nelladelva.github.io/Third-Place-Berlin/demo/

The real app lives in `app/`; see `app/SETUP.md`.

