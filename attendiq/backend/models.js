const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId:  { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  avatar:    { type: String },
  role:      { type: String, enum: ["teacher", "student"], default: null }, 
  courses:   [{ type: String }],
  subjects:  [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const notesSchema = new mongoose.Schema({
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode:  { type: String, required: true },
  content:     { type: String, default: "" },
  maxAttempts: { type: Number, default: 1 },
  timeLimit:   { type: Number, default: 5 }, 
  updatedAt:   { type: Date, default: Date.now },
});
notesSchema.index({ teacherId: 1, courseCode: 1 }, { unique: true });

const attendanceSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode: { type: String, required: true },
  score:      { type: Number, required: true },
  present:    { type: Boolean, required: true },
  date:       { type: Date, default: Date.now },
});

const quizAttemptSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseCode:   { type: String, required: true },
  notesVersion: { type: Date, required: true }, 
  attemptsUsed: { type: Number, default: 0 },
  finalPresent: { type: Boolean, default: false },
});
quizAttemptSchema.index({ studentId: 1, courseCode: 1, notesVersion: 1 }, { unique: true });

const User         = mongoose.model("User", userSchema);
const Notes        = mongoose.model("Notes", notesSchema);
const Attendance   = mongoose.model("Attendance", attendanceSchema);
const QuizAttempt  = mongoose.model("QuizAttempt", quizAttemptSchema);

module.exports = { User, Notes, Attendance, QuizAttempt };
