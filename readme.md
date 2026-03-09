# ⚡ Lightning Ladder

**Live demo:** https://lightning-ladder.netlify.app/

A real-time, multi-room agenda timer for standups, retros, planning sessions — anything where you need structured turns and a shared queue. Create a room, share the code or link, and everyone joins instantly. Names and timers sync live across all devices via Ably.

---

## Features

### Multi-Room System
- **Smart entry box** — a single unified input that auto-detects intent: type a 6-character code to join an existing room, or type a name to create a new one
- **Live room lookup** — when a 6-char code is entered, the app probes Ably presence in real time to check if the room exists and shows the active member count
- **Create with custom codes** — if a 6-char code doesn't match an existing room, it creates a new room with that exact code
- **Public & Private rooms** — toggle visibility when creating; public rooms appear in the lobby with live member counts
- **Room names** — optionally name your room (displayed in the lobby and in the room bar)
- **Shareable links** — copy a room code or direct URL to invite others
- **Presence tracking** — live member count per room via Ably presence
- **Auto-cleanup** — empty rooms are removed from the lobby immediately; rooms with content expire **5 minutes** after the last person leaves
- **My Rooms** — rooms you create are saved locally (via `localStorage`) so you can find and rejoin them from the lobby — even private rooms you've left
- **Room ownership** — a persistent anonymous ID identifies you as the room creator; an ⚡ OWNER badge appears in the room status bar
- **Last-person warning** — if you try to leave as the last person, a modal warns you the room will be deleted in 5 minutes and prompts you to save any shared notes first
- **Room isolation** — each room has its own Ably channels for state, notes, and presence — no cross-room data leaks

### Speaker Queue & Timer
- **Real-time sync** — anyone can type their name and join; the queue updates live across all connected devices
- **Two-phase timer per speaker**
  - **Present Time** — the speaker shares their update (amber countdown)
  - **Q&A Time** — open floor for questions and comments (blue countdown)
- **Pause / resume** — pause the timer at any point and pick up where you left off
- **Auto-advance** — when a speaker finishes Q&A, the next speaker is loaded automatically
- **Drag-and-drop reorder** — grab the ⠿ handle to drag speakers into a new order
- **Editable timer values** — type a number directly or use +/− steppers (1–30 min)
- **Breakout room alert** — if either timer runs out, a ⚠ Breakout Room warning is shown
- **Queue management** — hover any waiting speaker to reorder (↑↓), edit their name (✎), or remove them (✕)
- **Session reset** — wipe the queue and start fresh at any time

### Shared Notes
- **Built-in rich text editor** — synced in real-time with toolbar (bold, italic, underline, strikethrough, lists, indent, undo/redo, clear formatting, export as TXT/HTML)
- **BBB Etherpad mode** — embed BigBlueButton shared notes directly via iframe
- **Desktop sidebar + mobile collapsible panel**
- **Unread notification** — pulsing dot when someone edits notes while your panel is collapsed

### Polish
- **Compact room layout** — no redundant title in-room; timer and controls are visible without scrolling
- **Unified room bar** — room name, connection status, member count, remaining speakers, share buttons, and theme toggle all in one header
- **Dark / Light theme** — toggle with system preference detection
- **Sync status** — footer shows live connection state and app version
- **Consistent SVG stroke icons** throughout (no emoji mix)

---

## How It Works

1. Open the app — you land on the **Lobby**
2. **Type in the smart box** — paste a room code to join, or type a room name to create
   - If the code matches an active room, you'll see the member count and can join instantly
   - If the code doesn't match (or you type a name), it creates a new room
3. Share the 6-character room code or direct link with your team
4. Everyone types their name and hits **Join** — the queue builds in real time
5. Hit **▶ Start Session** to kick off the first speaker
6. **Present Time** → **Q&A Time** → **✓ Done** — repeat for each speaker
7. When done, head back to the lobby or close the tab

---

## Tech Stack

- **React** + **Vite** — component-based UI with fast builds
- **Ably Pub/Sub** — real-time sync, presence tracking, and room isolation (free tier)
- **Netlify** — automatic deploy from `main` branch
- **CSS Modules** — scoped styles per component
- **Hash-based routing** — `#/room/XXXXXX` for room URLs (no server config needed)
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
  main.jsx                # Entry point
  App.jsx                 # Router — lobby vs room view
  App.module.css
  index.css               # Global design system / CSS variables
  hooks/
    useAbly.js            # Room-scoped Ably connection + pub/sub
    useAblyNotes.js       # Room-scoped Ably channel for shared notes
    useLobby.js           # Lobby channel — public room list
    useMyRooms.js         # localStorage persistence for created rooms
    useRoom.js            # Hash routing, room ID generation, navigation
    useRoomLookup.js      # Debounced Ably presence probe — checks if a room exists
    useRoomPresence.js    # Ably presence tracking per room
    useTimer.js           # Countdown timer logic
    useTheme.js           # Dark/light theme toggle
    useToast.js           # Toast notification
    useUserId.js          # Persistent anonymous user ID (room ownership)
  components/
    HomeScreen.jsx        # Lobby — smart input, My Rooms list, public room list
    Room.jsx              # Full room view (queue, timer, notes)
    RoomBar.jsx           # Room header — name, status, presence, share, remaining, theme
    LeaveModal.jsx        # Last-person leave warning modal
    Header.jsx            # Lobby logo, connection status, queue count
    JoinSection.jsx       # Name input + timer config
    TimerPanel.jsx        # Active speaker timer + phase controls
    RosterItem.jsx        # Individual speaker row (edit/move/delete)
    SharedNotes.jsx       # Shared notes (built-in editor + BBB iframe)
    ThemeToggle.jsx       # Dark/light mode button
    Footer.jsx            # Version number + sync status
netlify.toml              # Netlify build config + redirect rules
```