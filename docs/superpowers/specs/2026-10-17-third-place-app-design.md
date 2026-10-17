# Third Place Berlin — Community App: Design

*Date: 2026-10-17 · Owners: Nella Delva & Saskia (founders/admins) · Status: approved by Nella 2026-10-17*

Mockups (open in a browser): [`mockups/01-home-meetup-grow.html`](mockups/01-home-meetup-grow.html) (Home, Meetup, Grow) and [`mockups/02-circles-chat-people.html`](mockups/02-circles-chat-people.html) (Circles, inside a circle, People). Where this document and the mockups differ, this document wins.

---

## 1. Intent: why this exists

Third Place Berlin is a friend group that grew to about **90 people**, mostly **international professionals new to Berlin**, plus some Germans who are new to the city. It lives in a WhatsApp group. The "third place" idea comes from the website: *not home, not work, somewhere in between*.

**The problem.** People still want to meet. One post about a picnic at Tempelhof brought 15 people, who brought snacks and played games. But the WhatsApp group is dying from **information overload**. To cope, members created **many subgroups**, which made the community even more fragmented and harder to follow. Practical pain also shows up at meetups: in a huge place like Tempelhof, **people can't find the group**.

**What success looks like (Nella's words):** *more people in our community coming together*, in person.

**The app's job:** make it easy and appealing to find your people and show up. It does this by showing each person **only what's relevant to them**, keeping subgroups **under one roof**, making every meetup **easy to find**, and **actively encouraging interaction**: in circle chats, and in person through growth challenges.

## 2. Who it's for

- **Members:** international, young professionals, new to Berlin, looking for community, skills and a network. Mostly English-speaking; some German.
- **Circle hosts:** members who run a circle (approve joins in closed circles, moderate its chat, post meetups).
- **Admins:** Nella and Saskia. They approve new circles and members, and can moderate everything.

## 3. Goals, non-goals, anti-goals

**Goals**
1. Each member sees **their circles' meetups and conversations**, not everything.
2. Posting and finding a meetup takes seconds, including a **"find us here" map pin** with a short visual sign.
3. Circles are **lively and interactive**: open chat, polls/votes, a question of the day, weekly debates, quick games.
4. Members can **discover each other** (bios, skills) and **recommend people to circles**.
5. Gamification pushes people **toward meeting in person**, with a focus on **acquiring skills and growing their network**.
6. The app feels **exclusive and safe**: invite-only, with vouching.
7. Works on **iPhone and Android**, in **English and German**, at **€0** running cost.

**Non-goals (for now)**
- Native App Store / Google Play listing (possible later; see §6).
- Payments, ticketing, event fees.
- Public, open sign-up for anyone in Berlin.
- Replacing Meetup.com, Eventbrite or LinkedIn at scale.

**Anti-goals: failure even if it technically works**
- **Recreating the WhatsApp flood**: constant pings, one giant chat, endless subgroups.
- Gamification that feels like **work stress** (public individual leaderboards, ranking people).
- Games that keep people **on their phones** instead of meeting.
- Members' personal details exposed or **data leaving the EU**.

## 4. What Nella decided

These are the founders' decisions and should be built as stated.

### 4.1 Circles (sub-communities)
- Launch circles: **Karaoke, Book Lovers, Co-working/Networking, Women Events, Art Lovers, Berlin Events, Sports Events, and BBB (Belong Beyond Borders)**.
- Each circle is either **open** (anyone can join instantly) or **closed** (needs a recommendation from a member, then approval). **BBB is open.**
- **Members cannot create circles directly.** They submit a **proposal** (name, description, open/closed, co-hosts). **Admins approve**, decline or ask a question.
- Each circle has **an open chat for all its members** to communicate, plan events, run **polls and votes**, play **games**, and share information.
- The chat has a system of **conversation-triggering prompts** tied to the circle's topic, to **create debates and help people get to know each other**.

### 4.2 Meetups
- **Every meetup belongs to a circle and is visible only to that circle's members** (Nella: "anyone who shares the same circle can see your post"). There are no community-wide meetups outside circles. Big open plans like the Tempelhof picnic go in a large open circle (e.g. Berlin Events or BBB).
- Meetups show on members' Home screens.
- Each meetup has a **"find us here" location pin** on a map plus a short sign (e.g. "yellow blanket next to the big tree"), solving the Tempelhof problem.
- Each meetup has its **own short chat** for logistics ("running late", "we moved 20 m").

### 4.3 People
- A **People** section lists everyone registered, with **bios**, so members can find and connect with each other.
- From someone's profile, a member can **recommend them to a circle**.

### 4.4 Games and growth
- Games should **get people to meet in person**, framed as **challenges**, geared to **young professionals acquiring new skills and growing their network**.

### 4.5 Membership
- **Invite-only and a bit exclusive.** A new person must be **invited by existing members (2–3 people)**.
- **Launch:** a link is posted in the WhatsApp group to bring the existing members in.

### 4.6 Platform and language
- **English and German.**
- **No budget.** The tools must be free.

## 5. The experience, screen by screen

Bottom tabs: **Home · Circles · People · Grow · Me.**

**Home** (mockup 01, screen 1)
- Upcoming meetups from the member's circles, with filters ("This weekend", "Near me", "All").
- The current **community goal** with a progress bar.
- A prompt to act on pending items (e.g. a coffee match).

**Meetup** (mockup 01, screen 2)
- Title, circle, host, date/time, capacity, "bring" notes.
- Map with the pin and sign. Buttons: **Going**, **Directions** (opens the phone's map app), **I'm here** (check-in).
- The meetup chat. It becomes read-only **2 days after the meetup ends**.
- The host can move the pin during the event; attendees see the update.

**Circles** (mockup 02, section 1)
- A grid of circles with open/closed state and member counts.
- **Open circle:** a "Join" button.
- **Closed circle:** "Request to join". A circle member must **recommend** the requester, then a **circle host or admin approves**. The request shows its status. Meetups, chat and the member list of a closed circle are visible only to members.
- **Propose a circle** form, plus an **admin review queue**.

**Inside a circle** (mockup 02, section 2)
- Tabs: **Chat · Meetups · Members · Board**.
- **Question of the day:** one prompt per circle per day, drawn from a per-circle bank. You must answer before you see others' answers.
- **Polls/votes** (any member). A finished poll can be **turned into a meetup** with one tap.
- **Debate of the week:** two sides. Members vote a side, post arguments, and may switch sides.
- **Quick games** (any member starts, about 1 minute): *Guess the member* (built from members' "fun fact"), *Two truths and a lie*, *Finish the lyric* (Karaoke), *Trivia*.
- **＋ menu:** propose a meetup, poll, debate, game, pin to the Board.
- **Board:** pinned useful info (tips, links) that doesn't get lost in the chat.
- Reactions and replies on messages.

**People** (mockup 02, section 3)
- Search by name, skill, field or language; filters such as "New this month", "Can teach me", "Same field".
- **Profile:**
  - photo or initials, name, field, origin, languages, "in Berlin since", bio, fun fact
  - **"I can teach" / "I want to learn"** tags, circles, badges
  - actions: **Invite for coffee**, **Recommend to a circle**

**Grow** (mockup 01, screen 4)
- A **monthly growth card** with about 9 in-person challenges, for example:
  - coffee with someone outside your field
  - teach a 20-minute skill
  - learn a skill from a member
  - host your first meetup
  - bring a newcomer
  - try a new circle
  - give a CV/LinkedIn review
  - join a German practice meetup
  - volunteer
- **Coffee roulette:** a monthly opt-in pairing, matching "I can teach" with "I want to learn" and different fields.
- **Badges:** Connector, Teacher, Host, Explorer, Mentor, Changed-my-mind.
- **A community goal per month** (e.g. "40 coffees between strangers") that everyone contributes to.

**Me**
- Edit profile, language (EN/DE), notification settings, my invites, my circles.
- Download my data, delete my account.

**Admin** (Nella, Saskia)
- Approve circle proposals and membership requests; set any circle open/closed.
- Assign circle hosts; remove members, messages and meetups; view reports.
- Edit the question and debate banks; set the monthly community goal.

## 6. Choices made by Claude (please check)

1. **Platform: an installable web app (PWA)**, not a store app. It works on iPhone and Android via "Add to Home Screen", with full-screen launch, an icon and push notifications (iOS 16.4+ when installed).
   - *Why:* App Store ($99/yr) and Play Store ($25) cost money.
   - The same code can be wrapped for the stores later (e.g. with Capacitor).
2. **Backend: Supabase free tier**, hosted in **Frankfurt (EU)**.
   - Provides the database, login, real-time chat and file storage for profile photos.
   - The free tier is enough for hundreds of members. A project with no activity for a week is paused; an active community won't hit that.
3. **Maps: OpenStreetMap** (free; no Google billing).
4. **Hosting:** free static hosting (GitHub Pages or Cloudflare Pages), like the website.
5. **Login: magic link by email** (no passwords).
6. **Vouching rule:** a newcomer needs an **invite link from a member plus one more vouch (2 in total)**. Admins can change it to 3 and can approve directly.
7. **Founding members skip vouching:** anyone joining through the **launch link** posted in WhatsApp during the first weeks gets in directly. Admins close the link when the move is done.
8. **Calm notifications by default:**
   - Push only for new meetups/polls in your circles, mentions and replies, approvals, and a **daily chat digest** (18:00).
   - "Every message" is opt-in per circle.
9. **No individual leaderboard.** Badges are personal; progress is collective (the community goal).
10. **Check-ins** ("I'm here") confirm attendance for challenges. They work only within the meetup's time window and near the pin; the host can also confirm.
11. **ABC and Progressive Women are not launch circles.** "Book Lovers" and "Women Events" cover them; they can be re-proposed as their own circles. *(Guess; Nella didn't answer.)*
12. **Contact details are never shown.** People connect through the app (coffee invites, chats), not by phone number or email.
13. **Visual style:** the website's palette (rust #C1592A, teal #2F5D58, cream #FBF7F0) and each circle's own colour, as in the mockups.
14. **Ages 18+ only.**
15. **Who can post meetups:** any member of a circle can post a meetup in it; circle hosts and admins can edit or remove it.
16. **Vouching in practice:** pending newcomers appear in a "Waiting to join" list under People, visible to members. Any member can vouch; vouches are visible to admins.
17. **Circle content visibility:** an open circle's description, upcoming meetups and member count are visible to all members. Its chat and Board become visible after joining (one tap). Closed circles show only description and count until approved.
18. **Accounts:** **Nella fully owns** the Supabase project and the hosting/GitHub repo (Nella's decision). **Saskia is an admin inside the app**, not an owner of the accounts. Free platform subdomain at launch; a custom domain can come later.

## 7. Constraints

- **Cost:** €0 per month at launch scale (≈90–500 members).
- **Data protection (GDPR):**
  - EU hosting; a privacy notice and consent at sign-up.
  - Members can export and delete their data.
  - Profile visibility limited to logged-in members.
  - Closed-circle content limited to circle members.
- **Languages:** every screen in English and German; the user chooses (default from the phone). User-generated content is not translated.
- **Devices:** works on recent iPhone (Safari) and Android (Chrome) phones; usable on desktop.
- **Safety:**
  - Report a message, person or meetup.
  - Admins and hosts can remove content and members.
  - Blocking a person hides them from you.

## 8. Build in stages

| Stage | Contents | Goal |
|---|---|---|
| **1: Launchable** | Login, invite links, vouching, launch link, profiles, welcome flow, People directory (search, filters, recommend to circle), circles (open/closed, join requests, proposals, admin approval), meetups with pin, sign, "Going" and check-in, meetup chat, **circle chat with polls and the Board**, Home, calm notifications, EN/DE, PWA install | Post the link in WhatsApp and move the group |
| **2: Interaction** | Question of the day, debate of the week, quick games in chat, poll-to-meetup, daily digest | Make circles lively |
| **3: Growth** | Monthly growth card, coffee roulette, badges, community goal, Grow tab | Push people to meet, learn and network |

## 9. Left to the builder

Data model, code structure, framework choice within the platform above, exact wording of prompts and UI copy (in EN and DE), the starting question and debate banks for each circle, icon/logo treatment from the website mark, and how the map pin is chosen on the phone (tap on the map vs search).

## 10. Open questions

None left. The builder check raised one founder decision (are there community-wide meetups?), answered in §4.2. Smaller points were settled as Claude's calls 15–18 in §6.
