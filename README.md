# AI Resume Builder (MERN + Vite + Gemini)

A full-stack resume builder with live preview, 4 templates, server-side PDF
export (Puppeteer), and Gemini-powered ATS scoring, keyword gap detection,
bullet rewriting, and summary generation. Users can use the app's shared
Gemini key (rate-limited) or bring their own (unlimited).

## Stack
- **Client**: React 18 + Vite, Tailwind CSS, Zustand, React Router, Axios
- **Server**: Node + Express, MongoDB + Mongoose, JWT + Google OAuth, Puppeteer, Google Gemini API

## Project structure
```
resume-builder/
  server/   Express API (auth, resumes, AI, PDF export)
  client/   Vite React app
```

## 1. Prerequisites
- Node.js 18+
- A MongoDB connection string (local or Atlas)
- A Gemini API key from https://aistudio.google.com/app/apikey (for the app's
  shared/default key — users can still supply their own in Settings)
- (Optional) Google OAuth client ID/secret from Google Cloud Console, for
  "Sign in with Google"

## 2. Server setup
```bash
cd server
npm install
cp .env.example .env
# edit .env with your values
npm run dev
```

### server/.env
See `.env.example` for the full list. Key variables:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — any long random string
- `ENCRYPTION_KEY` — 32-byte hex string (used to encrypt users' own Gemini keys at rest). Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `GEMINI_API_KEY` — the app's shared/default Gemini key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for Google OAuth (optional)
- `FREE_TIER_DAILY_AI_LIMIT` — how many AI calls/day a user gets on the shared key (default 10)
- `CLIENT_URL` — e.g. `http://localhost:5173` (for CORS)

## 3. Client setup
```bash
cd client
npm install
cp .env.example .env
# edit VITE_API_URL if your server isn't on localhost:5000
npm run dev
```

## 4. Puppeteer / PDF export notes
The server renders each resume to HTML (same templates used for the live
preview, reimplemented server-side for fidelity) and uses Puppeteer to
print it to PDF. Puppeteer needs a real, persistent Node process with
headless Chrome — it will **not** run on serverless platforms (Vercel/Netlify
functions). Deploy the server to a platform like **Render** or Railway that
gives you a long-running container. On first `npm install`, Puppeteer
downloads a bundled Chromium; on some Linux hosts you may need extra system
libraries (Render's Node runtime has what's needed out of the box).

## 5. Deploying to Render
- **Backend**: new Web Service → root directory `server` → build command
  `npm install` → start command `npm start` → add all env vars from
  `.env.example` in the Render dashboard.
- **Frontend**: new Static Site → root directory `client` → build command
  `npm install && npm run build` → publish directory `dist` → set
  `VITE_API_URL` to your backend's Render URL.

## Features
- Email/password auth + Google OAuth, both issuing the same JWT
- Resume CRUD, each with structured sections (personal info, experience,
  education, skills, projects, certifications)
- 4 templates (Classic, Modern, Minimal, Technical) sharing one data schema
- "Tailor for a job" — fork a resume (`baseResumeId`) instead of overwriting,
  so you can keep multiple job-specific versions
- AI panel: ATS score vs a pasted job description, missing-keyword
  detection, per-bullet rewrite, summary generation
- Settings page: bring your own Gemini key (stored encrypted, never sent
  back to the client) or use the shared key with a daily rate limit
- Dark/light theme toggle (persisted, respects system preference)
