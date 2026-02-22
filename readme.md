# ⚡ Lightning Ladder

**Live demo:** https://starship-droid.github.io/sprint-agenda-standup/

A real-time agenda timer for standups, retros, planning sessions — anything where you need structured turns and a shared queue. Everyone joins from the same link, names appear instantly across all devices, and a two-phase timer keeps each speaker on track.

---

## Features

- **Real-time sync** — anyone can type their name and join; the queue updates live across all connected devices via Ably
- **Two-phase timer per speaker**
  - **Present Time** — the speaker shares their update (amber countdown)
  - **Q&A Time** — open floor for questions and comments (blue countdown)
- **Breakout room alert** — if either timer runs out, a ⚠ Breakout Room warning is added to that speaker's name
- **Configurable timers** — set Present and Q&A duration independently (1–30 min each, default 5 min)
- **Queue management** — hover any waiting speaker to reorder (↑↓), edit their name (✎), or remove them (✕)
- **Session reset** — wipe the queue and start fresh at any time
- **Sync status** — footer shows live connection state and app version at a glance

---

## How It Works

1. Share the link with your team
2. Everyone types their name and hits **Join** — the queue builds in real time
3. Hit **▶ Start Session** to kick off the first speaker
4. **Present Time** starts — hit **→ End Present / Start Q&A** when they're done (or let the timer expire)
5. **Q&A Time** starts — hit **✓ Done** when discussion wraps up
6. Repeat for each speaker

---

## Tech Stack

- **React** + **Vite** — component-based UI with fast builds
- **Ably Pub/Sub** — real-time sync across all devices (free tier)
- **Netlify** — automatic deploy from `main` branch
- **CSS Modules** — scoped styles per component
- Fonts: Orbitron, IBM Plex Mono, Share Tech Mono (Google Fonts)

---

## Local Development

```bash
git clone https://github.com/your-username/lightning-ladder
cd lightning-ladder
npm install
```

Create a `.env` file in the project root (never commit this):

```
VITE_ABLY_API_KEY=your_ably_api_key_here
```

Then start the dev server:

```bash
npm run dev
```

> The app works without an Ably key — it'll run in offline mode (no cross-device sync). Real-time sync requires a valid key.

---

## Deployment (Netlify)

### 1. Connect your repo to Netlify

1. Go to [netlify.com](https://netlify.com) and log in
2. **Add new site** → **Import an existing project** → connect GitHub
3. Select your `lightning-ladder` repo
4. Netlify will auto-detect the build settings from `netlify.toml` — no changes needed
5. Hit **Deploy**

### 2. Add your Ably key as an environment variable

In Netlify dashboard → **Site settings** → **Environment variables** → **Add a variable**:

| Key | Value |
|---|---|
| `VITE_ABLY_API_KEY` | your Ably API key |

Then **trigger a redeploy** (Deploys → Trigger deploy → Deploy site) so the build picks up the new variable.

### 3. Subsequent deploys

Every push to `main` will automatically trigger a new deploy on Netlify. No manual steps needed.

---

## Getting an Ably API Key

1. Sign up at [ably.com](https://ably.com) (free tier is plenty)
2. Create a new app — choose **Pub/Sub**
3. Copy the API key from the dashboard
4. Add it to your `.env` locally and as a Netlify environment variable for deployments

---

## Project Structure

```
src/
  main.jsx              # Entry point
  App.jsx               # Root component, state management
  App.module.css
  index.css             # Global design system / CSS variables
  hooks/
    useAbly.js          # Ably connection + pub/sub
    useTimer.js         # Countdown timer logic
    useToast.js         # Toast notification
  components/
    Header.jsx          # Logo, connection status, queue count
    JoinSection.jsx     # Name input + timer config
    TimerPanel.jsx      # Active speaker timer + phase controls
    RosterItem.jsx      # Individual speaker row (edit/move/delete)
    Footer.jsx          # Version number + sync status
netlify.toml            # Netlify build config + redirect rules
```