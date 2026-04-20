# Literature — UNO Edition
### Web App + PWA + Android/iOS App

Play Literature online with friends! Works as:
- 🌐 **Web app** — open in any browser, share a link
- 📱 **PWA** — install on phone from browser (no app store needed)
- 🤖 **Android APK** — via Expo (see React Native project)
- 🍎 **iOS App** — via Expo (see React Native project)

---

## Quick Start (Run locally)

```bash
# 1. Install dependencies
cd LiteratureWeb
npm install

# 2. Start the app
npm start

# Opens at http://localhost:3000
```

---

## Deploy Web App to Vercel (FREE)

### Step 1 — Push to GitHub

1. Go to https://github.com and create a free account
2. Create a new repository called `literature-game`
3. Upload the `LiteratureWeb` folder contents to it

Or use Git:
```bash
cd LiteratureWeb
git init
git add .
git commit -m "Literature web app"
git remote add origin https://github.com/YOUR_USERNAME/literature-game.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click "New Project"
3. Import your `literature-game` repository
4. Vercel auto-detects React. Click **Deploy**
5. Done! You get a URL like: `https://literature-game.vercel.app`

### Step 3 — Share with friends!

Send this link to anyone — they open it in their browser and play instantly. No installation needed!

---

## Deploy Multiplayer Server to Railway (FREE)

The server enables real online multiplayer (room codes, chat).

### Step 1 — Push server to GitHub

Create a new repo called `literature-server` and upload the `server/` folder contents.

### Step 2 — Deploy on Railway

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `literature-server` repo
4. Railway deploys it and gives you a URL like:
   `https://literature-server-production.up.railway.app`

### Step 3 — Connect web app to server

In the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add: `REACT_APP_SERVER_URL` = `https://your-railway-url.up.railway.app`
3. Redeploy

---

## Install as App (PWA) — No App Store Needed!

### On iPhone/iPad:
1. Open your Vercel URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — done! App icon appears on your home screen

### On Android:
1. Open your Vercel URL in Chrome
2. Tap the **⋮ menu** (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**
4. Tap **Install** — done!

The app works offline for local/AI games!

---

## Publish to Play Store (Android)

Use the React Native (Expo) project for this:

```bash
cd LiteratureGame
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

Then upload the `.aab` file to Google Play Console.
Cost: $25 one-time registration fee.

---

## File Structure

```
LiteratureWeb/
├── public/
│   ├── index.html        ← PWA meta tags, install prompts
│   ├── manifest.json     ← PWA manifest (name, icons, colors)
│   └── service-worker.js ← Offline support
├── src/
│   ├── App.jsx           ← Main app with screen routing
│   ├── index.js          ← Entry point
│   ├── game/
│   │   └── engine.js     ← All game logic
│   ├── components/
│   │   ├── Card.jsx      ← UNO card component
│   │   └── Avatar.jsx    ← Player avatar
│   ├── screens/
│   │   ├── Home.jsx      ← Main menu
│   │   ├── Setup.jsx     ← Game setup
│   │   ├── Game.jsx      ← Gameplay
│   │   ├── GameOver.jsx  ← Results
│   │   └── Online.jsx    ← Room code + chat
│   └── styles/
│       └── global.css    ← All styles
├── vercel.json           ← Vercel deployment config
├── .env.example          ← Environment variable template
└── README.md
```

---

## Features

| Feature | Status |
|---|---|
| Local game (6 or 8 players) | ✅ |
| AI bots | ✅ |
| Pass device mode | ✅ |
| Online multiplayer with room codes | ✅ |
| Share link to invite friends | ✅ |
| In-room chat | ✅ |
| PWA (install on phone) | ✅ |
| Offline mode (local/AI) | ✅ |
| Dark theme | ✅ |
| Mobile-responsive | ✅ |
