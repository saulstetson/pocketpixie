# PocketPixie — Disney Dining Alert Service

A self-hosted reservation watcher that monitors Disney's dining system and sends
real email + SMS alerts the moment a table opens up.

---

## Stack

| Layer        | Tech                          |
|--------------|-------------------------------|
| Server       | Node.js + Express             |
| Database     | SQLite (via better-sqlite3)   |
| Scheduler    | node-cron (every 2 min)       |
| Scraper      | Axios → Disney dining API     |
| Email        | Nodemailer (Gmail SMTP)       |
| SMS          | Twilio                        |

---

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your credentials
cp .env.example .env
# Edit .env with your Gmail App Password and Twilio credentials

# 3. Start the server
npm run dev       # development (auto-restart)
npm start         # production
```

The server starts on http://localhost:3000

---

## API reference

### Create an alert
```
POST /api/alerts
Content-Type: application/json

{
  "restaurant":  "Be Our Guest",
  "meal":        "Dinner",
  "start_date":  "2026-12-15",
  "end_date":    "2026-12-22",
  "party_size":  4,
  "time_pref":   "After 6pm",
  "email":       "you@email.com",
  "phone":       "+15550001234"
}
```

### List your alerts
```
GET /api/alerts?email=you@email.com
```

### Pause / resume
```
PATCH /api/alerts/:id/pause
PATCH /api/alerts/:id/resume
```

### Delete
```
DELETE /api/alerts/:id
```

### Get notifications for an alert
```
GET /api/alerts/:id/notifications
```

---

## Deployment (Railway — easiest)

1. Push this folder to a GitHub repo
2. Go to https://railway.app and create a new project from your repo
3. Add the environment variables from `.env.example` in the Railway dashboard
4. Railway auto-detects Node.js and runs `npm start`
5. Your service is live 24/7 — no server management needed

Cost: ~$5/month on Railway's Hobby plan.

### Other options
- **Render** — free tier available (spins down after inactivity, not ideal for a watcher)
- **Fly.io** — generous free tier, always-on
- **VPS** (DigitalOcean, Linode) — full control, ~$6/month

---

## Gmail App Password setup

1. Enable 2-factor auth on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create a new app password (name it "PocketPixie")
4. Paste it into `SMTP_PASS` in your `.env`

---

## Twilio setup

1. Sign up at https://www.twilio.com (free trial includes $15 credit)
2. Get a phone number from the Twilio console
3. Copy your Account SID, Auth Token, and phone number into `.env`

SMS is optional — the service works with email-only if you leave Twilio blank.

---

## Notes

- PocketPixie is not affiliated with Disney. It reads publicly available
  reservation data from Disney's website.
- Reservations move fast — act within seconds of receiving an alert.
- The scraper checks every 2 minutes. Adjust the cron schedule in `server.js`
  if you want more/less frequent checks.
- Alerts auto-expire after their end date passes.
- Duplicate suppression: the same time slot won't trigger a second alert
  within 24 hours.
