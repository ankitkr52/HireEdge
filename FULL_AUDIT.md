# HireEdge — Full Codebase Audit

**Scope:** entire repository (`backend/`, `Frontend/src/`, root config). Every source file listed by the project tree was read in full, except SCSS/CSS files (skimmed for imports/dead-file detection only — styling rules are not functionally audited). `npm audit` was run in both `backend/` and `Frontend/`.

**Method note:** this audit reflects the working tree exactly as it exists on disk right now, including the currently **uncommitted** changes (`git status` shows `.gitignore` and `backend/src/controllers/interview.controller.js` modified but not committed — the diff removes a large block of numbered debug `console.log`s from `generateResumePdfController` and `getInterviewReportByIdController`). Where a finding was already fixed by that uncommitted diff, it is noted as such rather than re-reported as live.

A prior audit pass exists at `AUDIT.md` (root). This report supersedes it — several of its findings are already fixed on disk (e.g. `backend/src/services/temp.js` no longer exists; the numbered debug-log trail in `interview.controller.js` is removed in the uncommitted diff). Findings still open are re-verified and re-ranked below; findings that are now stale are called out explicitly.

---

## SECTION 1: BUGS

### CRITICAL

**1.1 — Resume-or-self-description flow is broken: backend rejects self-description-only submissions**
- **File:** `backend/src/controllers/interview.controller.js:8-10`
- **Bug:** `generateInterViewReportController` returns `400` whenever `req.file` (the uploaded PDF) is absent — there is no branch that proceeds using only `selfDescription`.
- **Root cause:** the handler was written assuming a resume file is always present; `pdfParse(req.file.buffer)` at line 13 would also throw a `TypeError` if `req.file` were ever undefined and this guard were removed carelessly.
- **User impact:** the frontend (`Frontend/src/features/interview/pages/Home.jsx:28-31`) explicitly allows submitting with *only* a self-description (client-side validation only requires resume **or** self-description) and even tells the user so in the on-screen info box (`Home.jsx:169-172`, "A resume or self-description is required **alongside** the job description"). Any user who fills in only the self-description field gets a hard 400 with no clear explanation — a core advertised feature path is completely non-functional.
- **Suggested fix:** make the file optional in the route/multer config, guard `pdfParse` behind `if (req.file)`, and validate `resumeText || selfDescription` instead of requiring the file unconditionally.

**1.2 — Failed report fetch produces a permanent, unrecoverable loading spinner**
- **File:** `Frontend/src/features/interview/hooks/useInterview.js:35-49` (`getReportById`) + `Frontend/src/features/interview/pages/Interview.jsx:101`
- **Bug:** `getReportById` catches all errors internally and resolves to `null` instead of rethrowing; `Interview.jsx` renders `<LoadingScreen>` whenever `!report`, with no error branch and no fallback route.
- **Root cause:** the hook's error handling was designed to "never throw," but the calling component was never given a corresponding error/empty state — the two files disagree on who owns failure handling.
- **User impact:** if a report ID is invalid, deleted, belongs to another user (404/403 from the backend), or the network request otherwise fails, the user is stuck on an infinite "Loading your interview plan…" spinner forever, with no way to recover except manually navigating away.
- **Suggested fix:** track an `error` field in `InterviewContext`/`useInterview`, and have `Interview.jsx` render an explicit error state (with a "back to home" action) when `report` is `null` and `loading` is `false`.

### HIGH

**1.3 — Client/server file-size limits disagree ("max 5 MB" vs actual 3 MB cap)**
- **Files:** `Frontend/src/features/interview/pages/Home.jsx:129` (UI copy: *"PDF only · max 5 MB"*) vs `backend/src/middleWare/file.middleware.js:7` (`fileSize: 3 * 1024 * 1024`)
- **Bug:** the two limits don't match, and there is no client-side pre-check against either number.
- **User impact:** a user uploading a resume between 3MB and 5MB is told it's fine by the UI, then gets an unhandled Multer `LIMIT_FILE_SIZE` error from the server (see 1.5 below — there's no error-handling middleware to turn this into a friendly message), surfacing as a raw failure with no clear reason.
- **Suggested fix:** pick one limit, enforce it identically client-side (reject before upload) and server-side, and surface Multer's error through the global error handler with a clear message.

**1.4 — No error-handling middleware / 404 handler in Express app**
- **File:** `backend/src/app.js` (entire file — no `app.use((err, req, res, next) => …)` block, no catch-all route)
- **Bug:** the app has no centralized error handler and no 404 fallback.
- **Root cause:** every controller must remember to wrap its own logic in try/catch and format its own JSON error (most do, inconsistently — see 1.6/1.7); anything that slips through (Multer errors, JSON parse errors from malformed bodies, synchronous throws, `getMeController`/`logoutUserController` which have no try/catch at all) falls through to Express's default HTML/plaintext error handler instead of the app's `{message}` JSON contract.
- **User impact:** inconsistent error shapes reaching the frontend; some failures return JSON, others return an HTML error page that frontend `axios` error handling doesn't expect, and unknown routes return Express's default "Cannot GET /x" instead of a clean 404 JSON body.
- **Suggested fix:** add `app.use((req,res)=>res.status(404).json(...))` after the routers and a final 4-arg error-handling middleware that logs server-side and returns a uniform JSON error shape; make sure Multer errors (`err.code === 'LIMIT_FILE_SIZE'`, etc.) are special-cased there.

**1.5 — `getMeController` and `logoutUserController` have no try/catch**
- **File:** `backend/src/controllers/auth.controller.js:125-132` (`logoutUserController`), `:141-154` (`getMeController`)
- **Bug:** neither function is wrapped in try/catch. `getMeController` calls `userModel.findById(req.user.id)` and immediately does `user.username` — if the user was deleted after the JWT was issued (valid, non-blacklisted token, but no DB row), `user` is `null` and `user.username` throws.
- **Root cause:** every other controller in the file uses try/catch + a JSON error response; these two do not, likely accidental omission when the file was last edited.
- **User impact:** because there's no global error handler (1.4), the deleted-user case (and any Mongo error inside `logoutUserController`'s `tokenBlacklistModel.create`) returns Express's default non-JSON error page instead of the app's normal error contract — and this endpoint (`getMe`) is called on **every page load** via `AuthProvider`, so it's a high-traffic code path.
- **Suggested fix:** wrap both in try/catch; in `getMeController`, explicitly handle `if (!user) return res.status(401).json(...)` (treat a stale token for a deleted account as unauthenticated, and consider also blacklisting it going forward).

**1.6 — Auth failures are swallowed with no logging**
- **File:** `backend/src/controllers/auth.controller.js:62-65` (`registerUserController` catch), `:114-116` (`loginUserController` catch)
- **Bug:** both catch blocks respond with a generic 500 but never log `error` (no `console.error`, no structured logging).
- **Root cause:** likely stripped out at some point along with debug logging, but nothing was left in its place.
- **User impact:** genuine production failures (Mongo connection drop, duplicate-key race between the `findOne` existence check and `create()` at register time, index errors) are completely invisible in server logs — there is no way to diagnose a spike in registration/login 500s after the fact.
- **Suggested fix:** at minimum `console.error("registerUserController error:", error)` / equivalent for login, ideally routed through the same error-handling middleware from 1.4.

**1.7 — Backend dependency `puppeteer` has 4 known HIGH-severity CVEs (transitive)**
- **File:** `backend/package.json:26` (`"puppeteer": "^24.37.5"`)
- **Bug:** `npm audit` reports 4 high-severity advisories, all rooted in the `extract-zip` dependency pulled in transitively by `puppeteer`'s browser-fetching logic (`@puppeteer/browsers`): an unvalidated symlink path-traversal vulnerability (GHSA-jmr9-qjv8-65gv, CVSS 8.1).
- **Details:** see Section 2 / dependency table below.
- **Suggested fix:** `npm audit fix --force` to bump to `puppeteer@25.8.0` (SemVer-major; needs a smoke test of the resume-PDF flow after upgrading), or migrate the PDF renderer entirely to `puppeteer-core` + `@sparticuz/chromium` (already a listed dependency — see 1.8) which doesn't need `extract-zip`'s browser-download step at all.

### MEDIUM

**1.8 — `puppeteer-core` + `@sparticuz/chromium` are installed but unused; PDF generation calls plain `puppeteer.launch()`**
- **File:** `backend/src/services/ai.service.js:1,86` uses `require('puppeteer')` / `puppeteer.launch({...})`; `backend/package.json:16,27` lists `@sparticuz/chromium` and `puppeteer-core` as dependencies that are never `require`'d anywhere in `backend/src`.
- **Bug:** the code path actually used (`puppeteer`, which bundles a full Chromium download) is inconsistent with the dependencies present, which are the standard pairing for running headless Chrome inside a size-constrained serverless function (e.g. Vercel, which this project deploys to per `backend/vercel.json`).
- **User impact / risk:** deploying `puppeteer`'s full bundled Chromium to Vercel's serverless functions is a common source of "works locally, times out / exceeds size limit in production" failures. `NEEDS VERIFICATION`: confirm on the actual deployed Vercel environment whether PDF generation (`POST /api/interview/resume/pdf/:id`) currently works at all in production, since `vercel.json:8` sets `maxLambdaSize: "50mb"`, suggesting a past attempt to work around exactly this bundling problem.
- **Suggested fix:** either switch `ai.service.js` to `puppeteer-core` + `@sparticuz/chromium` (dropping plain `puppeteer` from prod dependencies, keeping it only as a devDependency for local testing), or confirm current production deploys correctly and remove the two unused packages.

**1.9 — Mongoose `strict` mode silently drops the `status` field the controller sets**
- **File:** `backend/src/controllers/interview.controller.js:39` sets `status: "completed"` on create; `backend/src/models/interviewReport.model.js` (schema, lines 67-97) has no `status` field at all.
- **Bug:** Mongoose's default `strict: true` mode silently discards unknown fields on `.create()` — no error, no warning, the write is just dropped.
- **User impact:** currently cosmetic (nothing reads `.status` elsewhere), but it's dead code that implies a status-tracking feature (e.g. "pending" while AI generation is in flight, "failed" on error) was intended and never wired up — this would matter a lot if async/background report generation is ever added.
- **Suggested fix:** either add `status` to the schema (with an enum) or remove the dead write.

**1.10 — CORS origin is hardcoded to a single production URL, blocking local frontend dev against this backend**
- **File:** `backend/src/app.js:10-13`
```js
app.use(cors({
   origin:"https://hire-edge-delta.vercel.app",
   credentials:true
}))
```
- **Bug:** the allowed origin is a single hardcoded string with no env-var override and no `http://localhost:*` entry.
- **User impact:** running the frontend locally (`vite dev`, typically `http://localhost:5173`) against this backend cannot authenticate — the browser blocks the credentialed cross-origin request/response because the origin doesn't match. Any other preview/staging deployment (Vercel preview URLs, a different custom domain) is also blocked.
- **Suggested fix:** drive the allow-list from an env var (comma-separated list) and validate the incoming `Origin` header against it, including `localhost` for development.

**1.11 — REST inconsistency: PDF download endpoint uses `POST` for a read-only, idempotent operation**
- **File:** `backend/src/routes/interview.routes.js:33` — `interviewRouter.post("/resume/pdf/:interviewReportId", ...)`
- **Bug:** generating/downloading a PDF for an existing report doesn't mutate anything and is naturally a `GET`, but is modeled as `POST`.
- **User impact:** harmless functionally today, but breaks HTTP caching semantics, complicates browser prefetch/retry behavior, and is inconsistent with the sibling `GET /report/:id` route for the same resource.
- **Suggested fix:** change to `GET`, or leave as-is with a comment explaining why (e.g. if a request body is anticipated later).

### LOW

**1.12 — Leftover meaningless comment**
- **File:** `backend/src/app.js:1` — `const express = require('express');  // Fixed typo`
- **Bug:** dead comment referencing a past edit with no remaining relevance.
- **Suggested fix:** delete.

**1.13 — JSDoc route comments don't match actual routes**
- **File:** `backend/src/routes/interview.routes.js:17-19` documents `@routes get/api/interview/:interviewId`, but the actual route two lines below is `GET /report/:interviewReportId` — different path shape entirely.
- **File:** `backend/src/routes/auth.routes.js:23` documents `@name get/api/auth/logout` correctly as a GET, but a GET that performs a state-mutating side effect (creates a blacklist DB row) is itself worth flagging — see Section 2 (CSRF).
- **Suggested fix:** correct the JSDoc to match actual paths.

---

## SECTION 2: SECURITY ISSUES

### CRITICAL

**2.1 — Real production secrets sit in plaintext `.env` files inside the working tree**
- **Files:** `backend/.env` (MongoDB Atlas connection string with embedded username/password, `jwt_secret`, `GOOGLE_GENAI_API_KEY`), `Frontend/.env` (public API URL — low risk on its own).
- **Finding:** `backend/.env` contains what appear to be **live** credentials: a MongoDB Atlas connection URI with an embedded DB username/password, a 64-hex-char JWT signing secret, and a Google Gemini API key. These values are not reproduced in this report.
- **Verification done:** confirmed via `git log --all --full-history -- backend/.env Frontend/.env` and `git ls-files | grep env` that **neither `.env` file has ever been committed to this repository** — `.gitignore` correctly excludes `.env`/`.env.*`. So there is no git-history leak in this repo.
- **Residual risk:** these are still real secrets sitting in plaintext on disk, readable by anything with filesystem access (this audit session included). Because this content was read during this audit, **you should treat the MongoDB password, JWT secret, and Gemini API key currently in `backend/.env` as having been exposed to a third-party tool (this AI assistant/session) and rotate all three as a precaution** — this is standard practice any time secrets are read into a tool's context, regardless of that tool's trustworthiness.
- **Suggested fix:** rotate the Mongo Atlas DB user password, regenerate `jwt_secret` (which invalidates all existing sessions — expected), and regenerate the Gemini API key in Google AI Studio / Cloud Console. Going forward, keep secrets in a secrets manager or platform env-var store (Vercel project settings) for production, and only use local `.env` for throwaway/dev credentials.

### HIGH

**2.2 — File upload has no MIME-type/content validation — any file type accepted**
- **File:** `backend/src/middleWare/file.middleware.js` (whole file)
- **Finding:** `multer({ storage: multer.memoryStorage(), limits: { fileSize: 3*1024*1024 } })` has no `fileFilter`. The frontend's `accept='.pdf'` (`Home.jsx:136`) is a client-side hint only and trivially bypassed (e.g. via `curl`/Postman, or by renaming any file to `.pdf`).
- **Impact:** a non-PDF file reaches `pdfParse(req.file.buffer)` (`interview.controller.js:13`), which will likely throw and be caught by the generic 500 handler — so today the main consequence is wasted server resources / a confusing error, not RCE. But there's no defense-in-depth here: any file type up to 3MB can be uploaded and held in memory (memoryStorage buffers the whole file), and nothing currently limits concurrent uploads (see 2.5, rate limiting).
- **Suggested fix:** add a `fileFilter` checking `file.mimetype === 'application/pdf'` (and/or magic-byte sniffing, since `mimetype` is client-supplied and spoofable) and reject early with a 400.

**2.3 — No rate limiting anywhere in the API**
- **File:** `backend/src/app.js` (no rate-limit middleware registered), all routes in `auth.routes.js` and `interview.routes.js`.
- **Finding:** `/api/auth/login` and `/api/auth/register` have no throttling — an attacker can brute-force credentials or hammer registration (spamming the DB / triggering unbounded Gemini API spend via `/api/interview`) with no server-side limit.
- **Impact:** credential-stuffing/brute-force against login is unmitigated; the AI-report endpoint (`POST /api/interview`) is the most expensive route in the app (Gemini call + Puppeteer PDF render) and has no per-user or per-IP throttle, so it's also a cost-driven DoS vector — an authenticated attacker (or leaked/reused token) can spam expensive Gemini calls at will.
- **Suggested fix:** add `express-rate-limit` (or equivalent) scoped per-IP on `/api/auth/*`, and a stricter per-user limit on `/api/interview` (e.g. N reports per hour) given the direct dollar cost of each Gemini + Puppeteer call.

**2.4 — JWT: no server-side revocation beyond a manually-created blacklist; token payload trusted without re-checking the user exists**
- **File:** `backend/src/middleWare/auth.middleware.js:23-27`
- **Finding:** `jwt.verify` output is assigned directly to `req.user` with no check that `decoded.id` is present/well-formed, and no DB lookup confirming the user still exists. A token issued for a since-deleted account remains "valid" (not blacklisted, not expired) for its full 1-day lifetime.
- **Compounding issue:** the blacklist (`blacklist.model.js`) has no TTL index (see 3.3) and is the *only* revocation mechanism — a stolen/leaked JWT cannot be invalidated except by the user explicitly hitting `/logout` with that exact same token in their cookie jar. There's no "log out of all devices" or "revoke on password change" capability.
- **Impact:** limited blast radius today (1-day expiry caps exposure), but the underlying pattern (trust the token payload, never re-verify against current DB state) is a common source of privilege-lingering bugs as the app grows (e.g. if a "ban user" or "change role" feature is added later, banned/demoted users would keep full access until their token naturally expires).
- **Suggested fix:** for sensitive operations, or at some sampled rate, verify the user still exists (and isn't banned) in `auth.middleware.js`; consider a `tokenVersion` field on the user model that's included in the JWT and checked against the DB, so all tokens can be invalidated at once (e.g. on password change) without a growing blacklist collection.

**2.5 — `GET /api/auth/logout` performs a state-mutating action via GET, with no CSRF protection**
- **File:** `backend/src/routes/auth.routes.js:27`, `backend/src/controllers/auth.controller.js:125-132`
- **Finding:** logout is a `GET` route that writes to the database (`tokenBlacklistModel.create`) and clears the auth cookie. Combined with `sameSite: "none"` on the auth cookie (`auth.controller.js:48,101` — required for the current cross-origin frontend/backend split, but it does relax CSRF protection that `sameSite: "lax"/"strict"` would otherwise provide), a third-party site could trigger this via a simple `<img src="https://api.../api/auth/logout">` with no user interaction, forcibly logging users out (a low-severity nuisance/DoS on session, not data theft, since the action itself doesn't leak or corrupt data — but it's the wrong HTTP method for a mutating action regardless).
- **Impact:** low-severity today because the only mutating GET is logout; **but note there is currently no CSRF token / double-submit-cookie protection anywhere in the app**, and `sameSite: "none"` is set specifically to allow cross-site credentialed requests, which is the exact condition CSRF exploits rely on. If any other mutating GET endpoint is ever added, or if `sameSite:"none"` cookies are relied on elsewhere, this becomes a real vector.
- **Suggested fix:** change `logout` to `POST` at minimum; consider adding CSRF tokens (e.g. `csurf`-style double-submit cookie) for all mutating routes given the `sameSite:"none"` requirement.

**2.6 — Frontend dependency `axios` has multiple HIGH/MODERATE advisories (DoS, prototype pollution, proxy credential leak)**
- **File:** `Frontend/package.json:13` (`"axios": "^1.16.1"`, resolves to a version in the vulnerable `1.0.0 - 1.17.0` range)
- **Finding:** `npm audit` reports 10 advisories rooted in `axios`, including a HIGH-severity one (GHSA-gcfj-64vw-6mp9 — "Axios Node HTTP adapter can use an inherited proxy after interceptor config cloning," information disclosure + prototype pollution) and several MODERATE prototype-pollution / DoS issues. Fix available (`axios@1.18.0+`) with no major version bump required per `npm audit`'s `fixAvailable: true`.
- **Suggested fix:** `npm audit fix` in `Frontend/`.

**2.7 — Frontend dev-server dependency `vite` has a HIGH-severity path-traversal advisory (Windows-specific)**
- **File:** `Frontend/package.json:28` (`"vite": "^8.0.12"`)
- **Finding:** GHSA-fx2h-pf6j-xcff — `vite`'s dev server `server.fs.deny` can be bypassed via alternate path syntax on Windows, allowing arbitrary file reads from the dev machine while `vite dev` is running. Given this project is being developed on Windows (per environment info), this is directly applicable to local dev sessions, though it does not affect the production build output.
- **Suggested fix:** `npm audit fix` (non-major fix available).

### MEDIUM

**2.8 — Internal error messages leaked to the client**
- **File:** current on-disk `interview.controller.js` no longer leaks `error.message` in `generateResumePdfController` (this was fixed by the uncommitted diff — see top of report). **NEEDS VERIFICATION / re-check other controllers** for the same pattern before considering it fully closed project-wide; as read, the remaining controllers in `interview.controller.js` and `auth.controller.js` return generic messages only (`"Internal server error"`, `"Failed to generate PDF resume"`), which is correct.
- **Residual note:** `console.error` calls throughout (`ai.service.js:108,157,235`; `interview.controller.js:49,99,144`) print `error.message` (or, in `getInterviewReportByIdController:144`, the full `error` object) to server logs — appropriate for server-side logs, just flagging that if these logs are ever shipped to a third-party log aggregator without redaction, stack traces could include fragments of user resume/job-description text via error context.

**2.9 — No security headers (Helmet) configured**
- **File:** `backend/src/app.js` (no `helmet` or manual header middleware)
- **Finding:** no `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, or `Content-Security-Policy` headers are set anywhere in the Express app.
- **Impact:** low-to-medium — this is a JSON API (not serving HTML to be framed) so clickjacking risk is minimal, but MIME-sniffing protection and HSTS are still cheap, standard hardening that's currently entirely absent.
- **Suggested fix:** `app.use(helmet())` as a one-line addition.

**2.10 — Password/account-existence oracle on registration**
- **File:** `backend/src/controllers/auth.controller.js:23-28`
- **Finding:** register explicitly responds `"Account already exists with this username or email"` when a `username` OR `email` collision is found — this lets an attacker enumerate registered emails/usernames one at a time.
- **Impact:** low severity (email enumeration is a common, often-accepted tradeoff for good UX), but worth flagging as a deliberate choice to confirm rather than an oversight. `login`, by contrast, correctly uses a generic `"Invalid email or password"` for both the "no such user" and "wrong password" cases — good practice, inconsistent with register.
- **Suggested fix (optional, product decision):** decide if enumeration risk matters for this product; if so, use a generic "if this email is available, you'll receive a confirmation" style flow instead.

### LOW

**2.11 — `jwt_secret` env var naming**
- **File:** `backend/.env:2`, referenced as `process.env.jwt_secret` throughout (`auth.controller.js:41,94`, `auth.middleware.js:23`)
- **Finding:** lowercase/snake_case env var name is inconsistent with the SCREAMING_SNAKE_CASE convention used for every other env var in this project (`MONGO_URI`, `GOOGLE_GENAI_API_KEY`). Purely a style/consistency nit, not a vulnerability — flagging under Code Quality would also be valid.

**2.12 — Cookie `secure: true` with no HTTP fallback for local development**
- **File:** `backend/src/controllers/auth.controller.js:45-51, 98-104`
- **Finding:** `secure: true, sameSite: "none"` is hardcoded — correct and necessary for the deployed cross-origin production setup, but means the auth cookie will never be set over plain `http://localhost` during local development (browsers refuse `Secure` cookies over non-HTTPS). Combined with 1.10 (CORS hardcoded to prod origin only), this confirms **local full-stack development against this backend is currently not possible without code changes** — `NEEDS VERIFICATION` whether developers currently work around this by running the frontend against the deployed prod backend, or by manually toggling this before local runs.
- **Suggested fix:** gate `secure`/`sameSite` on `process.env.NODE_ENV === 'production'`.

---

## SECTION 3: CODE QUALITY ISSUES

**3.1 — Inconsistent error-swallowing patterns across near-identical hooks/controllers**
- `Frontend/src/features/auth/hooks/useAuth.js`: `handleLogin`/`handleRegister` rethrow on error; `handleLogout` (`:44-46`) swallows silently with an empty catch block, leaving `setUser(null)` un-run on failure — so a failed logout call leaves the UI in a stale "logged in" state with no error surfaced.
- `Frontend/src/features/interview/hooks/useInterview.js`: every function (`generateReport`, `getReportById`, `getReports`, `getResumePdf`) catches internally and never rethrows — the opposite pattern from `useAuth`. This inconsistency means callers can't write uniform error-handling logic across features.
- `Frontend/src/features/auth/pages/Login.jsx:15-19`: `handleSubmit` has **no** try/catch around `await handleLogin(...)`, but `useAuth.handleLogin` rethrows — so a failed login produces an **unhandled promise rejection** with no visible error message to the user. Contrast with `Register.jsx:14-22`, which correctly wraps the equivalent call in try/catch and displays `err.response?.data?.message`.
- **Suggested fix:** pick one convention per layer (e.g. "hooks always rethrow, pages always catch and display") and apply it uniformly.

**3.2 — Dead code / unreachable catch block**
- **File:** `Frontend/src/features/interview/pages/Home.jsx:33-44`
- **Finding:** wraps `await generateReport(...)` in try/catch, but `useInterview.generateReport` (see 3.1) already catches all its own errors and always resolves — never rejects. The `catch (err)` block at `Home.jsx:42-44` is therefore dead code; the actual failure path is the `else` branch's generic `alert("Report generation failed...")` at line 40.
- **Suggested fix:** remove the unreachable catch, or change `generateReport` to rethrow so the catch becomes meaningful (ties into 3.1's broader inconsistency).

**3.3 — No TTL index on the token blacklist collection — unbounded growth**
- **File:** `backend/src/models/blacklist.model.js`
- **Finding:** every logout permanently inserts a row that is never cleaned up (no `expires` option on the schema, no TTL index, no cron/cleanup job). This collection is also queried (`findOne`) on **every single authenticated request** (`auth.middleware.js:15`), so query latency against it will degrade indefinitely as the collection grows over the app's lifetime.
- **Suggested fix:** add `{ expiresIn: <JWT lifetime + buffer> }` via a Mongo TTL index on a `createdAt`/`expiresAt` field (Mongoose: `timestamps: true` already present — add `blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })` matching the JWT's `expiresIn: "1d"`, since the token is useless to blacklist-check once it would have expired naturally anyway).

**3.4 — Dead/unused file: `Frontend/src/App.css` (184 lines, never imported)**
- **Finding:** confirmed via grep that no file in `Frontend/src` imports `App.css` — `main.jsx` imports `./style.scss` instead. This is very likely leftover Vite-template boilerplate CSS that was never deleted after the project's global styles moved to SCSS.
- **Suggested fix:** delete the file.

**3.5 — `react-router` vs `react-router-dom` import inconsistency (undeclared phantom dependency)**
- **Finding:** `app.routes.jsx`, `App.jsx`, `Home.jsx`, `Interview.jsx`, `Login.jsx` import from `'react-router'`; `Protected.jsx`, `Register.jsx` import from `'react-router-dom'`. `Frontend/package.json:16` declares only `react-router-dom` as a direct dependency — `react-router` resolves only because it's `react-router-dom`'s own transitive dependency, which is fragile (a future `react-router-dom` version bump could change or drop that transitive relationship and silently break every file importing from the bare `react-router` package).
- **Suggested fix:** standardize all imports on `react-router-dom` (the declared, versioned dependency), or add `react-router` as an explicit direct dependency if intentionally using its lower-level API.

**3.6 — Frontend `README.md` is unmodified Vite template boilerplate**
- **File:** `Frontend/README.md`
- **Finding:** contains only generic Vite/React scaffold text ("This template provides a minimal setup...") with zero HireEdge-specific content. There is no backend README either. For a project with auth, file upload, AI integration, and PDF export, there is no setup/env-var documentation anywhere in the repo.
- **Suggested fix:** write a real README covering required env vars (`MONGO_URI`, `jwt_secret`, `GOOGLE_GENAI_API_KEY`, `VITE_API_URL`), local dev setup, and the CORS/cookie caveats from 1.10/2.12 that currently block local full-stack dev.

**3.7 — Blob URL never revoked after PDF download**
- **File:** `Frontend/src/features/interview/hooks/useInterview.js:83`
- **Finding:** `window.URL.createObjectURL(...)` creates a blob URL that is used once to trigger a download and then never released via `URL.revokeObjectURL(url)`. The temporary `<a>` element is correctly cleaned up (`document.body.removeChild(link)`), but the blob reference itself leaks for the page's lifetime.
- **Impact:** minor memory leak — each PDF download leaves one blob alive in memory until the page is closed/reloaded. Not significant unless a user downloads many reports in one session.
- **Suggested fix:** call `URL.revokeObjectURL(url)` after `link.click()` (can be deferred slightly, e.g. via `setTimeout`, to ensure the download has started).

**3.8 — Unused import**
- **File:** `Frontend/src/features/interview/pages/Home.jsx:4` imports `useParams` from `react-router` but never uses it.
- **File:** `Frontend/src/features/interview/pages/Interview.jsx:4` also imports `useNavigate, useParams` — both are actually used here, so no issue in this file.
- **Suggested fix:** remove the unused `useParams` import from `Home.jsx`.

**3.9 — `useAuth` doesn't null-check its context (inconsistent with `useInterview`)**
- **File:** `Frontend/src/features/auth/hooks/useAuth.js:9-10`
- **Finding:** destructures `context` from `useContext(AuthContext)` with no check that `context` is non-null, unlike `useInterview.js:11-15`, which explicitly throws `"useInterview must be used within an InterviewProvider"` if the context is missing.
- **Impact:** cosmetic today since `AuthProvider` always wraps the app root (`App.jsx`), but if `useAuth` is ever called outside that tree, the failure mode is a cryptic `Cannot destructure property 'user' of 'null'` instead of a clear error.
- **Suggested fix:** add the same guard pattern used in `useInterview.js`.

**3.10 — Remaining `console.log`/`console.error` debug statements in shipped code**
- **File:** `backend/src/services/ai.service.js:118` (`console.log("=== AI SERVICE CALLED ===")`), `:229` (`console.log("HTML generated — length:", ...)`)
- **File:** `Frontend/src/features/interview/hooks/useInterview.js:57` (`console.log("Interview reports response:", response)`), `:69-71` (three `console.error` calls dumping full error/status/data on every failed report fetch)
- **Finding:** these are debug-style logs left in from development. Not sensitive (no PII/secrets logged), but noisy for production logs and should be removed or gated behind a debug flag.
- **Suggested fix:** remove, or wrap in a `if (import.meta.env.DEV)` / `NODE_ENV !== 'production'` guard.

**3.11 — Naming: `interview.controller.js` mixes Hinglish and English in user-facing error strings**
- **File:** `backend/src/controllers/interview.controller.js:9,19` — `"Resume PDF required hai"`, `"Job description required hai"`
- **Finding:** these strings mix Hindi ("hai") into otherwise-English error messages, while every other error message in the codebase (`auth.controller.js`, rest of `interview.controller.js`) is plain English. Purely a consistency/polish issue for a product-facing string, not a functional bug.
- **Suggested fix:** standardize on plain English (or fully localize if multi-language support is intended) for all user-facing strings.

**3.12 — No input validation library / schema enforcement on request bodies**
- **Finding:** `backend/src/controllers/auth.controller.js` and `interview.controller.js` do manual `if (!x) return res.status(400)...` checks only. There's no length/format validation on `username`, `email` (no regex/format check — any string is accepted as an "email"), or `password` (no minimum length/complexity enforced anywhere, client or server). `zod` is already a dependency (used for the Gemini response schema in `ai.service.js`) but is never used to validate incoming request bodies.
- **Suggested fix:** define `zod` schemas for register/login bodies and for interview-report creation, reusing the dependency that's already in the project.

---

## SECTION 4: ARCHITECTURE & PERFORMANCE IMPROVEMENTS

**4.1 — Missing database indexes**
- `backend/src/models/interviewReport.model.js`: no explicit index on `user` (used in every query: `find({ user: req.user.id })` in `getAllInterviewReportsController`, `findOne({ _id, user })` in `getInterviewReportByIdController`). Mongoose/Mongo will do a collection scan on `user` without one. `NEEDS VERIFICATION`: Mongo auto-indexes `_id` but not `user`; as the reports collection grows, `getAllInterviewReportsController`'s `.find({user}).sort({createdAt:-1})` will get progressively slower without a compound index on `{ user: 1, createdAt: -1 }`.
- `backend/src/models/usermodels.js`: `username` and `email` are declared `unique: true`, which *does* create unique indexes automatically — no action needed there.
- `backend/src/models/blacklist.model.js`: no index on `token` at all, despite `findOne({ token })` running on **every authenticated request** — this is the single highest-traffic query in the whole app and it's doing a full collection scan today. This compounds with 3.3 (no TTL, so the collection only grows).
- **Suggested fix:** add `blacklistTokenSchema.index({ token: 1 })` (or make it unique) and `interviewReportSchema.index({ user: 1, createdAt: -1 })`.

**4.2 — No pagination on `GET /api/interview`**
- **File:** `backend/src/controllers/interview.controller.js:107-121`
- **Finding:** `getAllInterviewReportsController` fetches *all* reports for a user with no `limit`/`skip`/cursor. Fine at low volume; becomes a real performance and payload-size problem once a user accumulates dozens/hundreds of reports (this app's whole premise is "generate a plan per job application," which could mean many reports over months of job-hunting).
- **Suggested fix:** add `?page=`/`?limit=` query params with sane defaults (e.g. 20 per page), and update `Home.jsx`'s reports list to paginate/lazy-load.

**4.3 — No response-shape standardization across the API**
- **Finding:** some endpoints return `{ message, user }` (auth), others `{ message, interviewReports }`, `{ message, interviewReport }`, `{ success, message, interviewReport }` (only `generateInterViewReportController` includes a `success` boolean — every other endpoint omits it, forcing the frontend to infer success purely from HTTP status). Minor, but worth standardizing (e.g. always `{ success, message, data }`) as the API surface grows.

**4.4 — Frontend state management: no error state anywhere in `InterviewContext`**
- **File:** `Frontend/src/features/interview/Interview.context.jsx`
- **Finding:** context only tracks `loading`, `report`, `reports` — no `error` field, which is the root structural cause of bug 1.2 (permanent loading spinner on fetch failure). Same gap doesn't exist quite as badly in `AuthContext`, since `Protected.jsx` at least has an explicit "no user → redirect to login" branch, but a network *error* (as opposed to "no user") during `getMe()` is also silently swallowed (`auth.context.jsx:20`, empty catch) with no distinct error UI — it's just treated the same as "not logged in."
- **Suggested fix:** add `error`/`setError` to both contexts and give every consuming page an explicit error-state render branch, not just loading/success.

**4.5 — Every interview-report page load re-fetches by ID with no caching**
- **File:** `Frontend/src/features/interview/pages/Interview.jsx:97-99` — `useEffect` calls `getReportById(interviewId)` unconditionally on mount/`interviewId` change, and `Home.jsx:14-16` calls `getReports()` unconditionally on mount too.
- **Finding:** no caching layer (React Query/SWR or even a simple in-memory cache keyed by ID) — navigating away from and back to the same report re-fetches and re-renders a full loading state every time, even though report content is immutable once generated.
- **Suggested fix:** consider adopting TanStack Query for the interview-report and reports-list fetches — would also solve 1.2/4.4's error-state gap for free (built-in `isError`/`error` states) and cut redundant network calls.

**4.6 — Puppeteer launched fresh per PDF request; no browser instance reuse**
- **File:** `backend/src/services/ai.service.js:83-113` (`generatePdfFromHtml`)
- **Finding:** every call to `generateResumePdfController` launches a brand-new headless Chromium process (`puppeteer.launch()`) and tears it down (`browser.close()`) at the end. Launching Chromium is expensive (hundreds of ms to seconds) and memory-heavy.
- **Impact:** acceptable for a low-traffic app in a serverless deploy (each function invocation is isolated anyway, so instance reuse across requests isn't straightforward there), but if this is ever run on a long-lived Node server rather than serverless functions, a pooled/reused browser instance would significantly cut per-request latency.
- **Suggested fix:** `NEEDS VERIFICATION` on actual deployment target (serverless vs. long-lived server) before recommending a pooling change — pooling only pays off outside serverless.

**4.7 — `resume`/`jobDescription`/`selfDescription` full text stored per report with no size cap enforced server-side**
- **File:** `backend/src/models/interviewReport.model.js:68-77` — `jobDescription`, `resume`, `selfDescription` are unbounded `String` fields.
- **Finding:** frontend caps `jobDescription` at 5000 chars (`Home.jsx:90`) but nothing enforces this server-side, and `resume` (parsed PDF text) and `selfDescription` have no length cap anywhere. Combined with no pagination (4.2) and `getAllInterviewReportsController` correctly `.select()`-ing these fields out of the list view (good practice already in place there), this is a moderate, not severe, storage-growth concern.
- **Suggested fix:** add `maxlength` validators to the schema matching whatever limits the product intends.

---

## SECTION 5: FEATURE SUGGESTIONS

1. **Async/background report generation with real status tracking**
   What: move Gemini + PDF generation off the request/response cycle (job queue or simple polling pattern) so `POST /api/interview` returns immediately with a `pending` report, and the frontend polls/subscribes for completion. Directly fixes the currently-dead `status` field (bug 1.9) by giving it a real purpose.
   Complexity: Medium. Priority: Must-have (Gemini + Puppeteer round-trip is exactly the kind of multi-second operation that shouldn't block an HTTP request, and it currently has no timeout protection).

2. **Mock interview / voice practice mode**
   What: let users answer the generated technical/behavioral questions out loud (or in text) and get AI feedback on their answer quality, structure, and completeness compared to the model answer already generated.
   Complexity: Hard (needs audio capture/transcription if voice; text-only version is Medium). Priority: Must-have — this is the natural next step of an "interview prep" product and is the biggest gap between what's built (static Q&A generation) and what the product name implies (active practice).

3. **Progress tracking on the preparation roadmap**
   What: let users check off tasks in the day-by-day `preparationPlan`, persisted per report, with a completion percentage shown on the report list.
   Complexity: Easy (schema already has the day/task structure — just needs a `completed: boolean` per task and a PATCH endpoint). Priority: Nice-to-have.

4. **Email notifications when a report finishes generating**
   What: pairs naturally with suggestion #1 (async generation) — notify the user by email when their report is ready, useful if generation ever takes long enough to leave the page.
   Complexity: Easy (transactional email provider + one trigger point). Priority: Nice-to-have.

5. **Resume version history / diff view**
   What: since `generateResumePdf` tailors a resume per job description, let users see and compare multiple AI-tailored resume versions across different reports/applications side by side.
   Complexity: Medium. Priority: Nice-to-have.

6. **"Log out of all devices" / session management page**
   What: directly addresses the JWT revocation gap in 2.4 — show a user their active sessions (or at minimum a "log out everywhere" button that bumps a `tokenVersion` field, invalidating all existing JWTs at once).
   Complexity: Medium. Priority: Must-have (this is a real security gap, not just a nice UX addition).

7. **Rate-limited "free tier" + usage quota display**
   What: given each report costs real money (Gemini + Puppeteer compute), show users a visible quota ("3 of 5 free reports used this month") tied to the rate-limiting work in 2.3 — turns a necessary cost control into a monetization/upgrade hook.
   Complexity: Medium. Priority: Nice-to-have (Must-have if this product is meant to be commercially viable rather than a portfolio piece).

8. **Company-specific interview insights**
   What: if the job description names a company, augment the report with publicly-known interview-format info for that company (e.g. "Google interviews typically include a system design round") — differentiates from a generic "paste a JD, get questions" tool.
   Complexity: Hard (needs a curated/maintained data source or careful prompting with grounding — real risk of hallucination). Priority: Nice-to-have.

9. **Export report as shareable link / PDF of the full report (not just resume)**
   What: currently only the tailored resume is exportable as PDF (`generateResumePdfController`); the full interview report (questions, roadmap, skill gaps) is only viewable in-app. Add "export full report as PDF" and/or a shareable read-only link (e.g. to send to a mentor/career coach for feedback).
   Complexity: Easy–Medium (reuses the existing Puppeteer HTML-to-PDF pipeline). Priority: Nice-to-have.

10. **Structured onboarding / profile so resume isn't re-entered per report**
    What: let a user save a canonical resume/profile once, then generate reports against multiple job descriptions without re-uploading the resume file every time.
    Complexity: Medium. Priority: Must-have — re-uploading the same resume PDF for every single job application is meaningful friction that undermines the "generate a plan in ~30 seconds" pitch on the homepage (`Home.jsx:67`).

---

## Dependency Vulnerability Summary (`npm audit`)

### `backend/` — 4 vulnerabilities (all HIGH), 293 total dependencies
| Package | Severity | Issue | Fix |
|---|---|---|---|
| `puppeteer` (direct, `^24.37.5`) | High | Pulls in vulnerable `@puppeteer/browsers`/`extract-zip` | `npm audit fix --force` → `puppeteer@25.8.0` (major bump) |
| `puppeteer-core` (transitive, via puppeteer) | High | Same root cause | same |
| `@puppeteer/browsers` (transitive) | High | Same root cause | same |
| `extract-zip` (transitive) | High | GHSA-jmr9-qjv8-65gv — unvalidated symlink path traversal (CVSS 8.1) | same |

### `Frontend/` — 10 vulnerabilities (8 High, 1 Moderate, 1 Low), 214 total dependencies
| Package | Severity | Issue | Fix |
|---|---|---|---|
| `axios` (direct, `^1.16.1`) | High | 10 advisories: DoS via recursion, prototype pollution, proxy credential leak (GHSA-gcfj-64vw-6mp9), NO_PROXY bypass | `npm audit fix` (non-major) |
| `vite` (direct, `^8.0.12`) | High | GHSA-fx2h-pf6j-xcff — Windows `server.fs.deny` path-traversal bypass in dev server | `npm audit fix` (non-major) |
| `react-router` (transitive, via react-router-dom) | High | 5 advisories: open redirect, XSS via missing protocol validation, CSRF bypass in RSC mode, inefficient-route-matching DoS | `npm audit fix` (non-major) |
| `react-router-dom` (direct, `^7.15.1`) | Moderate | Inherits react-router issues above | same |
| `postcss` (transitive) | High | GHSA-r28c-9q8g-f849 — path traversal via sourceMappingURL | `npm audit fix` |
| `nanoid` (transitive) | High | Indefinite loop with negative/zero size generators (DoS) | `npm audit fix` |
| `immutable` (transitive) | High | 32-bit trie overflow + hash-collision DoS | `npm audit fix` |
| `form-data` (transitive) | High | GHSA-hmw2-7cc7-3qxx — CRLF injection via unescaped multipart field names | `npm audit fix` |
| `brace-expansion` (transitive) | High | DoS via exponential/unbounded expansion | `npm audit fix` |
| `@babel/core` (transitive) | Low | Arbitrary file read via sourceMappingURL comment | `npm audit fix` |

All 14 findings across both projects report `fixAvailable`. Running `npm audit fix` in `Frontend/` should resolve all 10 without breaking changes (none flagged `isSemVerMajor`). The `backend/` fix for `puppeteer` **is** a major version bump (24→25) and should be tested against the resume-PDF-generation flow before deploying, given finding 1.8's note about `puppeteer` vs `puppeteer-core`+`@sparticuz/chromium` inconsistency — worth resolving both issues together rather than just bumping the version in place.

---

## Summary counts

- **Bugs:** 2 Critical, 5 High, 4 Medium, 2 Low
- **Security:** 1 Critical, 6 High, 3 Medium, 2 Low
- **Code quality:** 12 findings (no severity ranking requested)
- **Architecture/Performance:** 7 findings
- **Feature suggestions:** 10 (4 Must-have, 6 Nice-to-have)
- **Dependency vulnerabilities:** 4 (backend, all High) + 10 (frontend, 8 High / 1 Moderate / 1 Low)

**Items needing verification (flagged inline above, repeated here for visibility):**
- Whether the PDF-generation feature currently works at all in the deployed Vercel production environment (1.8).
- Whether local full-stack development is currently only possible by pointing the local frontend at the deployed prod backend, given the hardcoded CORS origin (1.10) and `secure:true` cookies (2.12).
- Whether Puppeteer's per-request browser launch (4.6) is a real performance concern, contingent on confirming serverless vs. long-lived-server deployment.
