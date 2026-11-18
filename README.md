# FRIDAY — Converge, Season 1 (Spark)

My AI assistant for the [Converge](https://learn.crovenai.com) course. A sign-in screen
wakes **FRIDAY**, who answers in a chat window. Built with plain HTML/CSS/JS and a tiny
Node server that talks to **Groq**.

> Scope note: this is the **Season 1 "sign-in app + first talking FRIDAY"** build.

## Run it

1. Install [Node.js](https://nodejs.org) (v18+). Check: `node --version`
2. Add your key: copy `.env.example` to `.env` and paste your Groq key
   (get one free at https://console.groq.com).
3. Start it:
   ```bash
   node server.js
   ```
4. Open **http://localhost:3000**, sign in, and talk to FRIDAY.

## How it works

- `server.js` — serves the page and proxies `/api/chat` to Groq. The API key stays
  **on the server** and is never exposed to the browser.
- `public/` — the sign-in screen and chat UI.
- `.env` — your secret key. **Git-ignored. Never commit this.**

## What I built / what I learned

- A device-local **sign-in gate** that wakes the assistant.
- A **chat UI** that keeps conversation history so FRIDAY has context.
- A **safe key pattern**: secrets on the server, not in the browser or in Git.

## Tech

Node.js (no dependencies) · Groq (`openai/gpt-oss-20b`) · HTML / CSS / JS
