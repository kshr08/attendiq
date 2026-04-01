const express        = require("express");
const cors           = require("cors");
const session        = require("express-session");
const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose       = require("mongoose");
require("dotenv").config();

const { User, Notes, Attendance, QuizAttempt } = require("./models");

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── MONGODB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ─── PASSPORT GOOGLE STRATEGY ────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  "http://localhost:3001/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // New user — create with no role yet, they'll pick it on first login
      user = await User.create({
        googleId: profile.id,
        name:     profile.displayName,
        email:    profile.emails[0].value,
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

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated" });
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// Start Google login
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/login?error=true` }),
  (req, res) => {
    // If new user (no role set), send to onboarding
    if (!req.user.role) {
      return res.redirect(`${process.env.CLIENT_URL}/onboarding`);
    }
    res.redirect(process.env.CLIENT_URL);
  }
);

// Get current logged-in user
app.get("/auth/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

// Logout
app.get("/auth/logout", (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// ─── ONBOARDING ROUTES ────────────────────────────────────────────────────────

// Set role + initial subjects/courses after first login
app.post("/api/onboard", requireAuth, async (req, res) => {
  const { role, subjects, courses } = req.body;
  try {
    const update = { role };
    if (role === "teacher") update.subjects = subjects;
    if (role === "student") update.courses = courses;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher: add a new subject
app.post("/api/teacher/add-subject", requireAuth, async (req, res) => {
  const { courseCode } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { subjects: courseCode } }, // addToSet prevents duplicates
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTES ROUTES ─────────────────────────────────────────────────────────────

// Save/update notes for a course
app.post("/api/notes", requireAuth, async (req, res) => {
  const { courseCode, content, maxAttempts, timeLimit } = req.body;
  try {
    const notes = await Notes.findOneAndUpdate(
      { teacherId: req.user._id, courseCode },
      { content, maxAttempts: maxAttempts || 1, timeLimit: timeLimit || 5, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notes for a course (used by student to generate quiz)
app.get("/api/notes/:courseCode", requireAuth, async (req, res) => {
  try {
    // Find the teacher who teaches this course
    const teacher = await User.findOne({ role: "teacher", subjects: req.params.courseCode });
    if (!teacher) return res.json({ notes: null });
    const notes = await Notes.findOne({ teacherId: teacher._id, courseCode: req.params.courseCode });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ATTENDANCE ROUTES ────────────────────────────────────────────────────────

// Save attendance after quiz — uses lifetime attempt tracking
app.post("/api/attendance", requireAuth, async (req, res) => {
  const { courseCode, score } = req.body;
  try {
    const teacher = await User.findOne({ role: "teacher", subjects: courseCode });
    const notes = await Notes.findOne({ teacherId: teacher?._id, courseCode });
    const maxAttempts = notes?.maxAttempts || 1;
    const notesVersion = notes?.updatedAt;

    // Get or create attempt record
    let attempt = await QuizAttempt.findOne({
      studentId: req.user._id, courseCode, notesVersion,
    });

    if (!attempt) {
      attempt = await QuizAttempt.create({
        studentId: req.user._id, courseCode, notesVersion, attemptsUsed: 0, finalPresent: false,
      });
    }

    // Block if attempts exhausted
    if (attempt.attemptsUsed >= maxAttempts) {
      return res.status(403).json({ error: "All attempts used up." });
    }

    const present = score >= 3;
    const isLastAttempt = attempt.attemptsUsed + 1 >= maxAttempts;

    // Increment attempts used; mark present if passed
    await QuizAttempt.findByIdAndUpdate(attempt._id, {
      $inc: { attemptsUsed: 1 },
      finalPresent: present || attempt.finalPresent, // once present, stays present
    });

    // Save attendance record
    const record = await Attendance.create({
      studentId: req.user._id,
      teacherId: teacher?._id,
      courseCode, score,
      // Mark present if passed, or mark absent if this was the last attempt and still failed
      present: present || (!present && isLastAttempt ? false : undefined) || present,
    });

    res.json({
      record,
      attemptsUsed: attempt.attemptsUsed + 1,
      maxAttempts,
      remaining: Math.max(0, maxAttempts - (attempt.attemptsUsed + 1)),
      finalPresent: present || attempt.finalPresent,
      isLastAttempt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check lifetime attempts for a student for a course
app.get("/api/attempts/:courseCode", requireAuth, async (req, res) => {
  try {
    const teacher = await User.findOne({ role: "teacher", subjects: req.params.courseCode });
    const notes = await Notes.findOne({ teacherId: teacher?._id, courseCode: req.params.courseCode });
    if (!notes) return res.json({ used: 0, max: 1, remaining: 1, timeLimit: 5, finalPresent: false });

    const maxAttempts = notes.maxAttempts || 1;
    const notesVersion = notes.updatedAt;

    // Find or create attempt record for this student + this version of notes
    let attempt = await QuizAttempt.findOne({
      studentId: req.user._id,
      courseCode: req.params.courseCode,
      notesVersion,
    });

    const used = attempt?.attemptsUsed || 0;
    const finalPresent = attempt?.finalPresent || false;

    res.json({
      used,
      max: maxAttempts,
      timeLimit: notes.timeLimit || 5,
      remaining: Math.max(0, maxAttempts - used),
      finalPresent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance for a course (teacher view) — all dates, sorted newest first
app.get("/api/attendance/:courseCode", requireAuth, async (req, res) => {
  try {
    const records = await Attendance.find({ courseCode: req.params.courseCode, teacherId: req.user._id })
      .populate("studentId", "name email avatar")
      .sort({ date: -1 }); // newest first — frontend groups by date
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── QUIZ GENERATION ──────────────────────────────────────────────────────────
app.post("/api/generate", requireAuth, async (req, res) => {
  const { courseCode, courseName, notes } = req.body;
  const user = req.user;

  // Detect if teacher has requested quantitative questions
  const wantsQuantitative = /quantitative|numerical|calculation|compute|solve|math|numeric/i.test(notes);

  const questionTypeInstruction = wantsQuantitative
    ? `Mix question types:
- At least 2 quantitative/numerical questions that require calculation or solving (based on any numbers, formulas, or problems in the notes)
- The remaining questions can be theoretical/conceptual
- For quantitative questions, include actual numbers in both the question and options`
    : `Focus on theoretical and conceptual questions only — definitions, explanations, comparisons, and understanding of concepts. Do NOT include calculation-based questions unless the notes explicitly ask for them.`;

  const prompt = `Generate exactly 5 unique multiple choice questions for a student named "${user.name}" (ID: ${user._id}) for the subject "${courseName}" (${courseCode}).

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
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.choices[0].message.content;
    const questions = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate questions." });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 AttendIQ backend running on http://localhost:${PORT}`));
