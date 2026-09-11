# AttendIQ 🎯

**AI-powered, quiz-verified classroom attendance — built solo, end to end.**

AttendIQ replaces manual roll-calls with a self-serve flow: a teacher posts class notes, and each student proves they were paying attention by clearing a short AI-generated quiz built *from those exact notes*. Attendance is only marked present when the quiz is passed.

🔗 **Live app:** frontend on Vercel(http://attendiq-delta.vercel.app/) · backend on Render ([`/health`](.) check endpoint wired up for uptime monitoring)

---

## 👀 Why this project stands out

- **End-to-end ownership** — one person designed the data model, wrote a hardened Express API, built the entire React frontend, integrated a third-party LLM, and shipped it to production (Vercel + Render, with UptimeRobot keeping the free-tier backend warm).
- **Production-grade security, not just a CRUD demo** — `helmet`, `express-mongo-sanitize`, tiered `express-rate-limit` policies (general API, auth, and a stricter one on the AI generation route), an explicit CORS allow-list, `httpOnly`/`secure` session cookies backed by `connect-mongo`, and server-side role/enrollment checks on every sensitive route.
- **LLM integration done thoughtfully, not naively** — quiz prompts run teacher/course input through `validator.escape` before hitting the model (basic prompt-injection hardening), responses are strictly schema-validated before being trusted, and question style (quantitative vs. theoretical) adapts automatically based on the notes content.
- **Anti-abuse logic baked into the schema** — attempts are tracked per `(student, course, notesVersion)` via a unique compound index, so a student can't grind infinite retries, and re-attempts are correctly reset only when the teacher actually updates their notes.
- **Real access-control model** — Google OAuth with optional email-domain allow-listing, a two-role system (teacher/student) enforced via middleware, and ownership checks (a teacher can only manage the subjects they actually teach; a student can only quiz on courses they're enrolled in).
- **Deployed and monitored, not just running locally** — split frontend/backend deployment, environment-based CORS/cookie config for dev vs. production, and a dedicated `/health` endpoint for uptime checks.

---

## ✨ Features

**For teachers**
- Google sign-in, then pick the subject(s) they teach
- Post/update class notes per course, with configurable quiz attempt limit and time limit
- View a live, chronologically grouped attendance log per course

**For students**
- Google sign-in, then enroll in courses
- Take a timed, AI-generated 5-question MCQ quiz sourced from the teacher's latest notes
- Attendance is auto-marked present on a passing score (≥3/5); limited attempts per notes version, with a live countdown timer per attempt

**Under the hood**
- Quiz questions are generated fresh per student per attempt (not a static bank) via Groq's `llama-3.1-8b-instant`
- Automatic detection of whether notes call for quantitative/calculation questions or purely conceptual ones
- Attendance history is queryable per course with full audit trail (score, pass/fail, timestamp)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Passport.js, Google OAuth 2.0, `express-session` + `connect-mongo` |
| AI | Groq API (`llama-3.1-8b-instant`) for dynamic quiz generation |
| Security | Helmet, express-mongo-sanitize, express-rate-limit, validator |
| Hosting | Vercel (frontend), Render (backend) + UptimeRobot |

---

## 🏗️ Architecture

```
attendiq/
├── frontend/          # React + Vite SPA
│   ├── src/App.jsx    # Views: Login, Onboarding, Teacher/Student dashboards, Quiz
│   └── vercel.json    # SPA rewrite rules
└── backend/           # Express REST API
    ├── server.js      # Auth, routes, security middleware, Groq integration
    └── models.js      # User, Notes, Attendance, QuizAttempt schemas
```

**Data model highlights**
- `User` — Google identity + role (`teacher`/`student`) + enrolled/taught course codes
- `Notes` — one per `(teacher, courseCode)`, versioned by `updatedAt`
- `QuizAttempt` — unique per `(student, courseCode, notesVersion)`, tracks attempts used and final pass state
- `Attendance` — immutable log of every quiz submission (score, present/absent, date)

---

## 🔌 Key API Endpoints

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/auth/google` → `/auth/google/callback` | OAuth login flow |
| `POST` | `/api/onboard` | Set role + courses/subjects |
| `POST` | `/api/notes` | Teacher posts/updates notes for a course |
| `GET` | `/api/notes/:courseCode` | Fetch current notes (auth + enrollment checked) |
| `POST` | `/api/generate` | Generate a fresh AI quiz for a student's attempt |
| `POST` | `/api/attendance` | Submit quiz score → mark attendance |
| `GET` | `/api/attendance/:courseCode` | Teacher view of attendance records |
| `GET` | `/health` | Uptime/health check |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas connection string
- A Google OAuth 2.0 client (ID + secret)
- A Groq API key

### Backend
```bash
cd attendiq/backend
npm install
# create a .env file — see Environment Variables below
npm run dev
```

### Frontend
```bash
cd attendiq/frontend
npm install
npm run dev
```

### Environment Variables (backend `.env`)
```
MONGODB_URI=
SESSION_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SERVER_URL=
CLIENT_URL=
ALLOWED_EMAIL_DOMAINS=          # optional, comma-separated
GROQ_API_KEY=
NODE_ENV=development
```

### Environment Variables (frontend)
```
VITE_API_URL=                   # backend base URL
```

---

## 🗺️ Roadmap / Ideas
- Configurable pass threshold per course (currently fixed at 3/5)
- Teacher-side analytics dashboard (attendance trends over time)
- Export attendance records to CSV
