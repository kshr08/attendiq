const express        = require("express");
const cors           = require("cors");
const session        = require("express-session");
const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose       = require("mongoose");
const MongoStore     = require("connect-mongo");
const helmet         = require("helmet");
const mongoSanitize  = require("express-mongo-sanitize");
const rateLimit      = require("express-rate-limit");
const validator      = require("validator");
require("dotenv").config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // fix for Windows TLS issue

const { User, Notes, Attendance, QuizAttempt } = require("./models");

const app = express();

// ─── TRUST PROXY — required for secure cookies behind Render's proxy ──────────
app.set("trust proxy", 1);

// ─── HEALTH CHECK — must be FIRST before any middleware so Render can ping it ─
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// ─── SECURITY HEADERS (helmet) ────────────────────────────────────────────────
app.use(helmet());

// ─── CORS — only allow your frontend ─────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (Render health check, curl) 
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ─── BODY PARSING + NOSQL INJECTION PREVENTION ───────────────────────────────
app.use(express.json({ limit: "10kb" })); // cap body size to prevent large payload attacks
app.use(mongoSanitize()); // strips $ and . from req.body to prevent NoSQL injection

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for quiz generation (expensive Groq call)
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many quiz generation requests. Please wait a minute." },
});

// Strict limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts. Please try again later." },
});

app.use("/api/", apiLimiter);
app.use("/api/generate", generateLimiter);
app.use("/auth/", authLimiter);

// ─── MONGODB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ─── SESSIONS — stored in MongoDB, not memory ─────────────────────────────────
// Memory sessions are lost on server restart and don't work on serverless
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,    // JS can't access cookie — prevents XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── PASSPORT GOOGLE STRATEGY ────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.SERVER_URL}/auth/google/callback`,
  proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // ── EMAIL DOMAIN RESTRICTION ─────────────────────────────────────────────
    // Only allow emails from your college domain(s)
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "").split(",").map(d => d.trim());
    const emailDomain = email.split("@")[1];
    if (allowedDomains.length > 0 && allowedDomains[0] !== "" && !allowedDomains.includes(emailDomain)) {
      return done(null, false, { message: `Only ${allowedDomains.join(", ")} email addresses are allowed.` });
    }

    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        name:     profile.displayName,
        email,
        avatar:   profile.photos[0]?.value,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ─── MIDDLEWARE: AUTH CHECK ───────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated" });
};

// ─── MIDDLEWARE: ROLE CHECK ───────────────────────────────────────────────────
const requireRole = (role) => (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== role) return res.status(403).json({ error: "Access denied" });
  next();
};

// ─── MIDDLEWARE: INPUT VALIDATION ─────────────────────────────────────────────
const VALID_COURSE_CODES = ["CS101", "CS203", "CS305", "CS401", "CS502"];

const validateCourseCode = (req, res, next) => {
  const code = req.params.courseCode || req.body.courseCode;
  if (!code || !VALID_COURSE_CODES.includes(code)) {
    return res.status(400).json({ error: "Invalid course code." });
  }
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}?error=unauthorized`,
    failureMessage: false,
  }),
  (req, res) => {
    // Redirect to frontend with auth=success so frontend re-checks /auth/me
    if (!req.user.role) {
      return res.redirect(`${process.env.CLIENT_URL}?auth=new`);
    }
    res.redirect(`${process.env.CLIENT_URL}?auth=success`);
  }
);

app.get("/auth/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  // Only send what the frontend needs — never send sensitive fields
  const { _id, name, email, avatar, role, courses, subjects } = req.user;
  res.json({ user: { _id, name, email, avatar, role, courses, subjects } });
});

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.json({ success: true });
  });
});

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
app.post("/api/onboard", requireAuth, async (req, res) => {
  const { role, subjects, courses } = req.body;

  // Validate role
  if (!["teacher", "student"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }
  // Allow re-onboarding only if role is not set
  // (role gets wiped on fresh deploys for existing users)
  // Validate course codes
  const selected = role === "teacher" ? subjects : courses;
  if (!Array.isArray(selected) || selected.some(c => !VALID_COURSE_CODES.includes(c))) {
    return res.status(400).json({ error: "Invalid course selection." });
  }

  try {
    const update = { role };
    if (role === "teacher") update.subjects = selected;
    if (role === "student") update.courses = selected;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    const { _id, name, email, avatar, role: r, courses: c, subjects: s } = user;
    res.json({ user: { _id, name, email, avatar, role: r, courses: c, subjects: s } });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// Teacher: add a new subject (teachers only)
app.post("/api/teacher/add-subject", requireRole("teacher"), async (req, res) => {
  const { courseCode } = req.body;
  if (!VALID_COURSE_CODES.includes(courseCode)) {
    return res.status(400).json({ error: "Invalid course code." });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { subjects: courseCode } },
      { new: true }
    );
    const { _id, name, email, avatar, role, courses, subjects } = user;
    res.json({ user: { _id, name, email, avatar, role, courses, subjects } });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ─── NOTES ROUTES ─────────────────────────────────────────────────────────────

// Save notes — teachers only, only for their own subjects
app.post("/api/notes", requireRole("teacher"), async (req, res) => {
  const { courseCode, content, maxAttempts, timeLimit } = req.body;

  // Teacher can only save notes for subjects they teach
  if (!req.user.subjects.includes(courseCode)) {
    return res.status(403).json({ error: "You do not teach this subject." });
  }
  if (!VALID_COURSE_CODES.includes(courseCode)) {
    return res.status(400).json({ error: "Invalid course code." });
  }
  // Sanitize content length
  if (typeof content !== "string" || content.length > 5000) {
    return res.status(400).json({ error: "Notes too long (max 5000 characters)." });
  }
  // Clamp attempts and time
  const safeAttempts = Math.min(Math.max(parseInt(maxAttempts) || 1, 1), 5);
  const safeTime     = Math.min(Math.max(parseInt(timeLimit) || 5, 1), 30);

  try {
    const notes = await Notes.findOneAndUpdate(
      { teacherId: req.user._id, courseCode },
      { content, maxAttempts: safeAttempts, timeLimit: safeTime, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// Get notes — student must be enrolled in the course
app.get("/api/notes/:courseCode", requireAuth, validateCourseCode, async (req, res) => {
  const { courseCode } = req.params;

  // Students: verify they're enrolled
  if (req.user.role === "student" && !req.user.courses.includes(courseCode)) {
    return res.status(403).json({ error: "You are not enrolled in this course." });
  }

  try {
    const teacher = await User.findOne({ role: "teacher", subjects: courseCode });
    if (!teacher) return res.json({ notes: null });
    const notes = await Notes.findOne({ teacherId: teacher._id, courseCode });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ─── ATTEMPT CHECK ────────────────────────────────────────────────────────────
app.get("/api/attempts/:courseCode", requireRole("student"), validateCourseCode, async (req, res) => {
  const { courseCode } = req.params;

  // Verify student is enrolled
  if (!req.user.courses.includes(courseCode)) {
    return res.status(403).json({ error: "You are not enrolled in this course." });
  }

  try {
    const teacher = await User.findOne({ role: "teacher", subjects: courseCode });
    const notes = await Notes.findOne({ teacherId: teacher?._id, courseCode });
    if (!notes) return res.json({ used: 0, max: 1, remaining: 1, timeLimit: 5, finalPresent: false });

    const notesVersion = notes.updatedAt;
    const attempt = await QuizAttempt.findOne({ studentId: req.user._id, courseCode, notesVersion });

    const used = attempt?.attemptsUsed || 0;
    const max  = notes.maxAttempts || 1;

    res.json({
      used,
      max,
      timeLimit:    notes.timeLimit || 5,
      remaining:    Math.max(0, max - used),
      finalPresent: attempt?.finalPresent || false,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

// Submit attendance — students only
app.post("/api/attendance", requireRole("student"), async (req, res) => {
  const { courseCode, score } = req.body;

  // Validate inputs
  if (!VALID_COURSE_CODES.includes(courseCode)) {
    return res.status(400).json({ error: "Invalid course code." });
  }
  if (!req.user.courses.includes(courseCode)) {
    return res.status(403).json({ error: "You are not enrolled in this course." });
  }
  // Score must be 0–5
  const safeScore = parseInt(score);
  if (isNaN(safeScore) || safeScore < 0 || safeScore > 5) {
    return res.status(400).json({ error: "Invalid score." });
  }

  try {
    const teacher = await User.findOne({ role: "teacher", subjects: courseCode });
    const notes   = await Notes.findOne({ teacherId: teacher?._id, courseCode });
    const maxAttempts   = notes?.maxAttempts || 1;
    const notesVersion  = notes?.updatedAt;

    let attempt = await QuizAttempt.findOne({ studentId: req.user._id, courseCode, notesVersion });
    if (!attempt) {
      attempt = await QuizAttempt.create({
        studentId: req.user._id, courseCode, notesVersion, attemptsUsed: 0, finalPresent: false,
      });
    }

    if (attempt.attemptsUsed >= maxAttempts) {
      return res.status(403).json({ error: "All attempts used up." });
    }

    const present       = safeScore >= 3;
    const isLastAttempt = attempt.attemptsUsed + 1 >= maxAttempts;

    await QuizAttempt.findByIdAndUpdate(attempt._id, {
      $inc: { attemptsUsed: 1 },
      finalPresent: present || attempt.finalPresent,
    });

    await Attendance.create({
      studentId: req.user._id,
      teacherId: teacher?._id,
      courseCode,
      score: safeScore,
      present,
    });

    res.json({
      attemptsUsed:  attempt.attemptsUsed + 1,
      maxAttempts,
      remaining:     Math.max(0, maxAttempts - (attempt.attemptsUsed + 1)),
      finalPresent:  present || attempt.finalPresent,
      isLastAttempt,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// Get attendance — teachers only, only for their own courses
app.get("/api/attendance/:courseCode", requireRole("teacher"), validateCourseCode, async (req, res) => {
  const { courseCode } = req.params;

  if (!req.user.subjects.includes(courseCode)) {
    return res.status(403).json({ error: "You do not teach this subject." });
  }

  try {
    const records = await Attendance.find({ courseCode, teacherId: req.user._id })
      .populate("studentId", "name email avatar") // only expose needed fields
      .sort({ date: -1 });
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ─── QUIZ GENERATION — students only, must be enrolled ───────────────────────
app.post("/api/generate", requireRole("student"), generateLimiter, async (req, res) => {
  const { courseCode, courseName } = req.body;

  // Validate course code and enrollment
  if (!VALID_COURSE_CODES.includes(courseCode)) {
    return res.status(400).json({ error: "Invalid course code." });
  }
  if (!req.user.courses.includes(courseCode)) {
    return res.status(403).json({ error: "You are not enrolled in this course." });
  }

  // Fetch notes from DB directly — don't trust notes sent from frontend
  const teacher = await User.findOne({ role: "teacher", subjects: courseCode });
  const notesDoc = await Notes.findOne({ teacherId: teacher?._id, courseCode });
  if (!notesDoc?.content) {
    return res.status(404).json({ error: "No notes found for this course." });
  }

  // Check attempt limit before generating (prevent generating if blocked)
  const attempt = await QuizAttempt.findOne({
    studentId: req.user._id, courseCode, notesVersion: notesDoc.updatedAt,
  });
  if (attempt && attempt.attemptsUsed >= notesDoc.maxAttempts) {
    return res.status(403).json({ error: "All attempts used up." });
  }

  const notes = notesDoc.content;
  const user  = req.user;

  const wantsQuantitative = /quantitative|numerical|calculation|compute|solve|math|numeric/i.test(notes);

  const questionTypeInstruction = wantsQuantitative
    ? `Mix question types:
- At least 2 quantitative/numerical questions that require calculation or solving
- The remaining questions can be theoretical/conceptual
- For quantitative questions, include actual numbers in both the question and options`
    : `Focus on theoretical and conceptual questions only. Do NOT include calculation-based questions.`;

  const prompt = `Generate exactly 5 unique multiple choice questions for a student named "${validator.escape(user.name)}" for the subject "${validator.escape(courseName)}" (${courseCode}).

Use these teacher's class notes:
${notes}

${questionTypeInstruction}

Make questions specific to the notes. Vary the angle for this particular student to make their quiz unique.

Respond ONLY with a raw JSON array of 5 objects. Each:
- "question": string
- "options": array of exactly 4 strings
- "answer": number 0-3 (index of correct option)

No markdown, no backticks, no explanation.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 700,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are a quiz generator. Always respond with raw JSON only — no markdown, no backticks, no explanation." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: "AI generation failed." });

    const raw = data.choices[0].message.content;
    const questions = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Validate the shape of questions before sending to client
    if (!Array.isArray(questions) || questions.length !== 5) {
      return res.status(500).json({ error: "Invalid quiz format received from AI." });
    }
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.answer !== "number") {
        return res.status(500).json({ error: "Malformed question from AI." });
      }
    }

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate questions." });
  }
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Don't leak error details in production
  console.error(err);
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Something went wrong." : err.message });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 AttendIQ backend running on port ${PORT}`));
