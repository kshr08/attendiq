const mongoose = require("mongoose");

// ─── USER MODEL ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  googleId:  { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  avatar:    { type: String },
  role:      { type: String, enum: ["teacher", "student"], default: null }, // null = not set yet (new user)
  // Students: list of course codes they're enrolled in
  courses:   [{ type: String }],
  // Teachers: list of course codes they teach
  subjects:  [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// ─── NOTES MODEL ─────────────────────────────────────────────────────────────
const notesSchema = new mongoose.Schema({
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode:  { type: String, required: true },
  content:     { type: String, default: "" },
  maxAttempts: { type: Number, default: 1 },   // how many times student can take the quiz
  timeLimit:   { type: Number, default: 5 },   // in minutes
  updatedAt:   { type: Date, default: Date.now },
});
// One notes doc per teacher per course
notesSchema.index({ teacherId: 1, courseCode: 1 }, { unique: true });

// ─── ATTENDANCE MODEL ─────────────────────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode: { type: String, required: true },
  score:      { type: Number, required: true },
  present:    { type: Boolean, required: true },
  date:       { type: Date, default: Date.now },
});

// ─── QUIZ ATTEMPT MODEL ───────────────────────────────────────────────────────
// Tracks lifetime attempts per student per course (not per day)
// notesVersion ties attempts to a specific quiz set by the teacher
// If teacher updates notes, notesVersion resets and students get fresh attempts
const quizAttemptSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode:   { type: String, required: true },
  notesVersion: { type: Date, required: true }, // matches notes.updatedAt so teacher can reset by saving new notes
  attemptsUsed: { type: Number, default: 0 },
  finalPresent: { type: Boolean, default: false }, // true once student passes
});
quizAttemptSchema.index({ studentId: 1, courseCode: 1, notesVersion: 1 }, { unique: true });

const User         = mongoose.model("User", userSchema);
const Notes        = mongoose.model("Notes", notesSchema);
const Attendance   = mongoose.model("Attendance", attendanceSchema);
const QuizAttempt  = mongoose.model("QuizAttempt", quizAttemptSchema);

module.exports = { User, Notes, Attendance, QuizAttempt };
