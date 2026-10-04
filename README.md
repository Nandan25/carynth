# AI Resume Builder (MERN + Vite + Gemini)

A full-stack resume builder with live preview, 4 templates, server-side PDF
export (Puppeteer), and Gemini-powered ATS scoring, keyword gap detection,
bullet rewriting, and summary generation. Users can use the app's shared
Gemini key (rate-limited) or bring their own (unlimited).

## Stack
- **Language**: TypeScript across client, server and e2e tests
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

## 4a. PDF resume import (with OCR fallback) — resource notes
Importing an existing resume works in two tiers: `pdf-parse` extracts text
directly for the common case (text-based PDFs exported from Word, Google
Docs, LaTeX, etc). If that comes back empty (a scanned/image-based PDF), the
server falls back to OCR: it reuses the same Puppeteer/Chromium instance to
rasterize up to 3 pages via `pdf.js`, then runs `tesseract.js` over each
page image. No new native system dependency is introduced — this
deliberately reuses the Chromium instance already proven to work on your
Render deploy, rather than requiring Poppler/GraphicsMagick (which the
standard Node buildpack doesn't include).

The honest tradeoff is **RAM, not API cost**: running Chromium and a
Tesseract OCR engine in the same request is meaningfully heavier than plain
PDF export alone. If OCR imports see real usage, plan for at least a
Starter-tier Render instance rather than the free tier — 512MB tends to be
tight once both are running concurrently.

## 5. Docker

Both apps ship with a multi-stage Dockerfile (`server/Dockerfile`, `client/Dockerfile`).

```bash
cp .env.docker.example .env      # fill in JWT_SECRET, ENCRYPTION_KEY, GEMINI_API_KEY
docker compose up --build        # web: http://localhost:8080  api: http://localhost:5000/api/health
```

- **Server image**: compiles TypeScript (`pnpm build`), prunes dev dependencies, and runs
  `node dist/server.js`. Chrome (matching the installed Puppeteer version) and fonts are
  installed in the image for PDF export and OCR; the build fails if Chrome has missing
  shared libraries.
- **Client image**: builds with Vite and serves the bundle from nginx with SPA fallback
  (deep links like `/editor/123` work). `VITE_API_URL` / `VITE_GOOGLE_CLIENT_ID` are
  **build-time** values (Vite inlines them), passed as Docker build args.

## 6. Deploying to Render (free tier)

**Backend: Web Service, runtime Docker**
- Root directory `server` (Dockerfile path `./Dockerfile`, build context `.`), or `./server/Dockerfile`
  with context `./server` if the root directory is left blank.
- Health check path `/api/health`.
- Env vars: see `server/.env.example`. Notes:
  - `MONGO_URI`: your Atlas URI. In Atlas > Network Access allow `0.0.0.0/0`, since Render's free
    tier has no fixed outbound IP.
  - `ENCRYPTION_KEY` must be 64 hex characters (Render's "generate value" is not hex).
  - `CLIENT_URL` must exactly match the Static Site's origin, with no trailing slash.

**Frontend: Static Site**
- Root directory `client`, build command `npm install && npm run build`, publish directory `dist`.
- Env vars: `VITE_API_URL` = `https://<your-api>.onrender.com/api`, optional `VITE_GOOGLE_CLIENT_ID`,
  and `NODE_VERSION` = `22`. `VITE_*` values are inlined at build time, so redeploy after changing them.
- Redirects/Rewrites tab: add a **Rewrite** `/*` -> `/index.html`, or refreshing `/editor/123`
  returns 404.

`render.yaml` encodes all of the above if you prefer a Blueprint. `client/Dockerfile` and
`docker-compose.yml` are only for running the stack locally (the compose file includes a local
Mongo; point `MONGO_URI` at Atlas instead if you prefer).

Free web services sleep after ~15 minutes idle (first request can take up to a minute), and 512MB RAM
is tight for OCR imports (see 4a).

## Features
- Email/password auth + Google OAuth, both issuing the same JWT
- Resume CRUD, each with structured sections (personal info, experience,
  education, skills, projects, certifications)
- **Import an existing resume from a PDF** — extracts text (with an OCR
  fallback for scanned PDFs) and uses Gemini to structure it into a new
  resume, ready to review and edit
- 4 templates (Classic, Modern, Minimal, Technical) sharing one data schema
- "Tailor for a job" — fork a resume (`baseResumeId`) instead of overwriting,
  so you can keep multiple job-specific versions
- AI panel: ATS score vs a pasted job description, missing-keyword
  detection, per-bullet rewrite, summary generation
- Settings page: bring your own Gemini key (stored encrypted, never sent
  back to the client) or use the shared key with a daily rate limit
- Dark/light theme toggle (persisted, respects system preference)

## TypeScript notes
- `npm run dev` in `server/` runs the TS sources directly via `tsx` (watch mode);
  `npm run build` compiles to `server/dist`, and `npm start` runs the compiled output.
- `npm run typecheck` in `server/` and `client/` runs `tsc --noEmit`. Both
  projects currently use `strict: false` (a deliberate first pass so the migration
  couldn't change behavior); tightening `strict` is a good incremental follow-up.
- Server relative imports keep a `.js` extension (e.g. `from "./app.js"`) — that is
  the correct convention for TypeScript + Node ESM and resolves to the `.ts` source.
- Client relative imports are extensionless (Vite `bundler` resolution).
