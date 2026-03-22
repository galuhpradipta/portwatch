# Portwatch Demo Script

A portfolio monitoring tool that tracks workforce signals — headcount trends and news sentiment — to help you spot company distress early.

---

## Pre-demo Checklist

- [ ] App running locally (`pnpm dev`)
- [ ] Database seeded (`POST /api/admin/seed` — populates 50+ companies with 12 months of mock data)
- [ ] Start from a fresh account (use `/register`)

---

## Scene 1: Create Account

**Page:** `/register`

*"This is Portwatch — a tool for monitoring workforce signals across companies you care about."*

1. Open the app in browser — you'll see the **"Create account"** page with heading **"Get started with Portwatch"**
2. Fill in **Display name** → type your name
3. Fill in **Email** → type an email
4. Fill in **Password** → type a password (min 8 chars)
5. Click **"Create account"** button
6. You'll be redirected to login. Fill in credentials and click **"Sign in"**

*"Now we're in. Let's look at the dashboard."*

---

## Scene 2: Empty Dashboard

**Page:** `/` (Dashboard)

*"This is our command center. It shows staffing and press signals across tracked companies."*

1. You land on the dashboard — the **"Portfolio control room"**
2. Point out the empty state: **"Your portfolio is empty"** with description **"Add a few tracked companies so the metrics and signal table can start reading as a live portfolio."**

*"Right now there's nothing to monitor — we need to build our watchlist first."*

3. Click the **"Browse Companies"** button

*"Let's go add some companies."*

---

## Scene 3: Build Your Portfolio

**Page:** `/companies`

*"This is the full company directory. We can browse, search, and filter to find companies we want to track."*

1. You land on the **"Companies"** page — the **"Watchlist directory"**
2. Point out the **3 metric cards** at top: **Portfolio** (0% tracked), **Visible** (filtered count), **Coverage** (total universe)

*"We can see the full universe of available companies here."*

3. Click the search bar (placeholder: *"Search company or industry"*) → type **"Stripe"**

*"We can search by company name or industry."*

4. See Stripe appear → clear the search
5. Click the **"All industries"** dropdown → select **"Technology"**

*"Or filter by industry to narrow things down."*

6. Reset the filter back to **"All industries"**
7. Find **Meta** → click **"Add"**

*"Let's start building our portfolio. I'll add Meta."* Button changes to **"Added ✓"**

8. Find **Google** → click **"Add"** — *"Adding Google..."*
9. Find **Stripe** → click **"Add"** — *"Stripe..."*
10. Find **Shopify** → click **"Add"** — *"Shopify..."*
11. Find **Spotify** → click **"Add"** — *"And Spotify."*
12. Point out the **Portfolio** card now shows **"5"** with **"50% tracked"**

*"We now have 5 companies in our watchlist — half of our 10-slot capacity. Let's go back to the dashboard to pull some data."*

13. Click **"Dashboard"** in the sidebar

---

## Scene 4: Pull Latest Data

**Page:** `/` (Dashboard)

*"Our watchlist is set up. Now we need fresh data. In production, a background cron job automatically fetches headcount snapshots and analyzes news sentiment. Let me trigger it manually."*

1. Dashboard now shows your 5 companies but data may be sparse
2. Click the **"Pull Latest Data"** button (cloud icon)
3. Watch the simulation overlay animate through steps:

*"Watch the system work —"*

- **"Scanning portfolio..."** — *"It scans the portfolio..."*
- **"Fetching Meta headcount..."** — *"Pulls headcount data for each company..."*
- **"Analyzing Meta sentiment..."** — *"Runs sentiment analysis on recent news..."*
- *(repeats for each company)*
- **"Portfolio refresh complete!"**

*"And we're done. This is what the cron job does in the background on a regular schedule."*

---

## Scene 5: Read the Signals

**Page:** `/` (Dashboard — now populated)

1. Point to the **Alerts** card (highlighted/emphasized)

*"First — Alerts. This tells us how many companies are flagged. It breaks down into headcount alerts and press alerts."*

2. Point to the **Watchlist** card showing **"5 / 10"**

*"Watchlist shows we're using 5 of our 10 slots."*

3. Point to the **Headcount** card

*"Total headcount across all tracked companies, with an average per company."*

4. Point to the **Press Score** card

*"Average press sentiment — scored 0 to 100. Calm means under 40, Watch is 40–70, Stressed is above 70. Higher means more risk."*

5. Scroll down to the **Portfolio table**

*"Now the signal table — this is where you see everything at a glance."*

6. Point out columns: **Company**, **Headcount**, **Change %**, **Sentiment**, **Signals**

*"Each row shows the company, current headcount, month-over-month change, a sentiment bar, and alert signals."*

7. Point to any row with a red **"HC"** badge in the Signals column

*"HC means headcount drop alert — this company's workforce shrank beyond our threshold."*

8. Point to any row with a **"NEG"** badge

*"NEG means negative press sentiment — recent news coverage is concerning."*

9. Point to a row showing **"Clear"**

*"Clear means no alerts — this company looks healthy."*

10. Click the **"Change %"** column header to sort

*"We can sort by any column. Let me sort by change percentage to surface the biggest movers."*

11. Click on a company row that has alerts (e.g. **Meta**)

*"Let's drill into Meta to see the full picture."*

---

## Scene 6: Company Deep Dive

**Page:** `/companies/:id` (e.g. Meta)

1. Point out the **breadcrumb**: Companies > Meta

*"We're now on Meta's detail page."*

2. Point to the **company header** — name, industry pill, country, website, employee range

*"Basic company info at the top — industry, location, website, and size range."*

3. Note the **"Remove"** button (since it's tracked)

*"Since Meta is in our portfolio, we can remove it from here if needed."*

4. Scroll to **"Headcount History"** section (kicker: "Signal track")

*"The headcount chart shows monthly snapshots. You can see the trend over time."*

5. Point to the **inline stat strip**: Latest, MoM Change, Range

*"Quick stats — latest headcount, month-over-month change, and the historical range."*

6. Scroll to **"News & Sentiment"** section (kicker: "Market pulse")

*"Below that, recent news articles with their sentiment scores. Each article is scored — higher means more negative. This is what drives the press alerts."*

7. Scroll to the **Notes** section

*"Finally, a notes section for your own analysis."*

8. Click into the notes area → type: **"Monitor Q2 earnings for layoff updates"**

*"I can jot down action items or observations — these are private to my account."*

9. Save the note
10. Click **"Settings"** in the sidebar

*"One last thing — let's look at settings."*

---

## Scene 7: Configure Alert Threshold

**Page:** `/settings`

1. You see the **Settings** page (kicker: "Account control")

*"Settings lets you manage your profile and configure alerts."*

2. Point to the **Account** section — Display Name and Email fields

*"Basic profile info here."*

3. Scroll to **"Alert Settings"** section

*"This is the key setting — Headcount Drop Threshold."*

4. Point to the **threshold input** (default 10%)

*"Currently set to 10%. Any company whose headcount drops more than 10% month-over-month will trigger an HC alert."*

5. Change the value to **5**

*"If I lower it to 5%, I'll catch smaller drops — more sensitive. If I raise it to 20%, only major drops get flagged. It's about tuning signal versus noise."*

6. Click **"Save Changes"** → button shows **"Saved!"**

---

## Closing

*"That's Portwatch. You build a watchlist of companies, the system automatically pulls headcount data and analyzes news sentiment, and the dashboard surfaces distress signals — workforce declines and negative press — so you can act early. Thanks for watching."*
