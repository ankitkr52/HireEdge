# HireEdge 🚀

**AI-Powered Interview Preparation SaaS**

HireEdge is a full-stack MERN application that helps job seekers prepare for interviews using Google's Gemini AI. Paste a job description, upload a resume (or write a quick self-description), and HireEdge generates a personalized interview report — tailored technical and behavioral questions, a skill-gap analysis, and a day-by-day preparation roadmap — plus an ATS-optimized, AI-tailored resume you can download as a PDF.

🔗 **Live Demo:** [hire-edge-delta.vercel.app](https://hire-edge-delta.vercel.app/login)

---

## ✨ Features

- 🤖 **AI-Generated Interview Reports** — Powered by Google Gemini 2.5 Flash: technical questions, behavioral questions, skill gaps, and a multi-day prep plan, all scored against the target job description
- 📄 **Resume Parsing** — Upload a PDF resume; text is extracted server-side with `pdf-parse` and fed to the AI alongside the job description
- 🧾 **AI-Tailored Resume PDF** — Generates an ATS-friendly resume rewritten for the target role and renders it to a downloadable PDF with Puppeteer
- 🔐 **Secure Authentication** — JWT stored in an httpOnly cookie, with a server-side blacklist so logout actually invalidates the token (not just client-side removal)
- 🛡️ **Protected Routes** — Route-level guards on both the frontend (`Protected` component) and backend (`authUser` middleware)
- 📚 **Report History** — Every generated report is saved per user and listed for later reference
- 🎨 **Clean, Responsive UI** — Built with React 19 and SCSS

---

## 🛠️ Tech Stack

**Frontend** (`Frontend/`)
- React 19 + Vite
- React Router DOM v7
- Axios
- SCSS (Sass)

**Backend** (`backend/`)
- Node.js + Express 5
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) with a MongoDB-backed token blacklist
- `bcrypt` for password hashing
- `multer` (in-memory) for resume PDF uploads
- `pdf-parse` for resume text extraction
- `puppeteer` for HTML → PDF resume rendering

**AI**
- Google Gemini 2.5 Flash (`@google/genai`), with structured JSON output validated via `zod` / `zod-to-json-schema`

---

## 📂 Project Structure

```
HireEdge/
├── backend/
│   ├── server.js                    # entry point — connects DB, starts Express
│   └── src/
│       ├── app.js                   # Express app: middleware, CORS, routes, error handling
│       ├── config/database.js       # Mongoose connection
│       ├── controllers/             # auth.controller.js, interview.controller.js
│       ├── middleWare/              # auth.middleware.js (JWT check), file.middleware.js (Multer)
│       ├── models/                  # usermodels.js, blacklist.model.js, interviewReport.model.js
│       ├── routes/                  # auth.routes.js, interview.routes.js
│       └── services/ai.service.js   # Gemini calls + Puppeteer PDF generation
│
├── Frontend/
│   └── src/
│       ├── App.jsx, main.jsx, app.routes.jsx
│       └── features/
│           ├── auth/                # context, hooks, services, Login/Register pages
│           └── interview/           # context, hooks, services, Home/Interview pages
│
└── README.md
```

---

## ⚙️ Prerequisites

- Node.js (v18 or higher)
- npm
- A MongoDB instance (local or MongoDB Atlas)
- A Google Gemini API key ([Get one here](https://ai.google.dev/))

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ankitkr52/HireEdge.git
cd HireEdge
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../Frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `backend/`:

```env
MONGO_URI=your_mongodb_connection_string
jwt_secret=your_jwt_secret
GOOGLE_GENAI_API_KEY=your_google_gemini_api_key
```

Create a `.env` file inside `Frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

> ⚠️ Never commit your `.env` files — they're already listed in `.gitignore`.

### 4. Run the development servers

```bash
# Terminal 1 — Backend (runs on port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend
cd Frontend
npm run dev
```

> **Note:** the backend's CORS policy and cookie settings are currently configured for the deployed production origin. Running the frontend locally against a local backend may require adjusting `backend/src/app.js`'s CORS `origin` and the cookie `secure`/`sameSite` options in `auth.controller.js`.

---

## 🔑 Authentication Flow

1. User registers/logs in → server hashes the password with `bcrypt` and issues a JWT in an httpOnly cookie (1-day expiry)
2. The cookie is sent automatically with each request (`withCredentials`) to protected routes
3. On logout, the token is stored in a MongoDB blacklist collection, so it's rejected even if it hasn't expired yet
4. `authUser` middleware verifies the JWT and checks the blacklist on every protected request
5. Frontend `AuthContext` + `useAuth` hook fetch the current user on load and manage session state; `Protected` redirects unauthenticated users to `/login`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|-----------|--------------|----------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Log in and receive a session cookie | No |
| GET | `/api/auth/logout` | Log out and blacklist the current token | No |
| GET | `/api/auth/get-me` | Get the current logged-in user | Yes |
| POST | `/api/interview` | Generate an interview report from a resume/self-description + job description | Yes |
| GET | `/api/interview` | List all interview reports for the current user | Yes |
| GET | `/api/interview/report/:interviewReportId` | Get a single interview report by ID | Yes |
| POST | `/api/interview/resume/pdf/:interviewReportId` | Generate and download an AI-tailored resume PDF for a report | Yes |

---

## 🗺️ Roadmap

- [ ] Async report generation with real status tracking
- [ ] Mock interview / answer-feedback mode
- [ ] Progress tracking on the preparation roadmap
- [ ] Rate limiting on AI-backed endpoints

---

## 🤝 Contributing

This is currently a solo learning/portfolio project, but suggestions and issues are welcome. Feel free to open an issue or fork the repo.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Ankit Kumar**
- GitHub: [@ankitkr52](https://github.com/ankitkr52)
- Email: ankit72p@gmail.com

---

⭐ If you find this project interesting, consider giving it a star on GitHub!
