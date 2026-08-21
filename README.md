# HireEdge 🚀

**AI-Powered Interview Preparation SaaS**

HireEdge is a full-stack SaaS platform that helps job seekers prepare for technical and behavioral interviews using Generative AI. It analyzes your resume, generates personalized interview questions, and evaluates your answers — helping you walk into interviews with confidence.

🔗 **Live Demo:** [hire-edge-delta.vercel.app](https://hire-edge-delta.vercel.app/login)

---

## ✨ Features

- 🤖 **AI-Generated Interview Questions** — Powered by Google Gemini 2.5 Flash, tailored to your resume and target role
- 📄 **Resume Parsing** — Upload a PDF resume and extract structured data automatically
- 🔐 **Secure Authentication** — JWT-based auth with access token blacklisting on logout for true session invalidation
- ✅ **Schema Validation** — Request/response validation with Zod for reliable, type-safe data handling
- 🔄 **Persistent Sessions** — Custom `useAuth` hook + `AuthContext` keep users logged in across refreshes
- 🛡️ **Protected Routes** — Route-level guards on both frontend and backend
- 🎨 **Clean, Responsive UI** — Built with React and SCSS

---

## 🛠️ Tech Stack

**Frontend**
- React.js
- React Router DOM
- Axios
- SCSS

**Backend**
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken) with token blacklisting

**AI / Validation**
- Google Gemini 2.5 Flash API
- Zod (schema validation, including `zodToJsonSchema` for structured AI output)

**Tooling**
- Git (Conventional Commits)

---

## 📂 Project Structure

```
hireedge/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/         # AuthContext
│   │   ├── hooks/            # useAuth
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
│
├── server/                 # Express backend
│   ├── controllers/
│   ├── middleware/          # auth, error handling
│   ├── models/
│   ├── routes/
│   ├── schemas/             # Zod schemas
│   ├── utils/                # Gemini integration, PDF parsing
│   └── server.js
│
├── .env.example
└── README.md
```

---

## ⚙️ Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local instance or MongoDB Atlas)
- A Google Gemini API key ([Get one here](https://ai.google.dev/))

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ankitkr52/hireedge.git
cd hireedge
```

### 2. Install dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
GEMINI_API_KEY=your_google_gemini_api_key
CLIENT_URL=http://localhost:5173
```

Create a `.env` file inside the `client/` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

> ⚠️ Never commit your `.env` file. It's already listed in `.gitignore`.

### 4. Run the development servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

The app should now be running at `http://localhost:5173` (frontend) and `http://localhost:5000` (backend API).

---

## 🔑 Authentication Flow

1. User registers/logs in → server issues an **access token** and **refresh token**
2. Access token is sent with each protected request via `Authorization: Bearer <token>`
3. On logout, the token is added to a **blacklist** so it can no longer be used, even if it hasn't expired
4. Frontend `useAuth` hook + `AuthContext` manage session state and auto-redirect unauthenticated users

---

## 📡 API Endpoints (Sample)

| Method | Endpoint | Description | Auth Required |
|--------|-----------|--------------|----------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Log in and receive tokens | No |
| POST | `/api/auth/logout` | Log out and blacklist token | Yes |
| GET | `/api/auth/me` | Get current logged-in user | Yes |
| POST | `/api/resume/upload` | Upload and parse resume PDF | Yes |
| POST | `/api/interview/generate` | Generate AI interview questions | Yes |

> Update this table with your actual routes as the project grows.

---

## 🧪 Running Tests

```bash
cd server
npm test
```

*(Add this section once a test suite is in place — Jest/Supertest recommended for the backend.)*

---

## 🗺️ Roadmap

- [ ] Add real-time mock interview mode
- [ ] Add answer scoring/feedback with Gemini
- [ ] Add analytics dashboard for progress tracking
- [ ] Deploy to production (Vercel + Hostinger VPS)

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
