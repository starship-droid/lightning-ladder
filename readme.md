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

- **React** + **Vite** — component-based UI with fast dev builds
- **Ably Pub/Sub** — real-time sync across all devices (free tier)
- **GitHub Actions** — automatic deploy to GitHub Pages on push to `main`
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

## Deployment (GitHub Pages)

### 1. Add your Ably key as a GitHub secret

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `VITE_ABLY_API_KEY` | your Ably API key |

### 2. Ensure the GitHub Actions workflow exists

The file `.github/workflows/deploy.yml` handles the build and deploy automatically on every push to `main`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
        env:
          VITE_ABLY_API_KEY: ${{ secrets.VITE_ABLY_API_KEY }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3. Push to main

```bash
git add .
git commit -m "your message"
git push origin main
```

GitHub Actions will build and deploy automatically. Check the **Actions** tab in your repo to see progress.

---

## Getting an Ably API Key

1. Sign up at [ably.com](https://ably.com) (free tier is plenty)
2. Create a new app — choose **Pub/Sub**
3. Copy the API key from the dashboard
4. Add it to your `.env` locally and as a GitHub secret for deployments

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
```

Written using Claude Sonnet 4.6 | Prompted by SophieA