import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'mentor', 'student'], default: 'student' },
    cohort: { type: ObjectId, ref: 'Cohort', default: null }, // students only
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

const cohortSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date, default: Date.now },
    mentors: [{ type: ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const testCaseSchema = new Schema(
  {
    input: { type: String, required: true }, // JSON array of arguments, e.g. "[2, 3]"
    expected: { type: String, required: true }, // JSON value, e.g. "5"
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    cohort: { type: ObjectId, ref: 'Cohort', required: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 100, min: 1 },
    starterCode: { type: String, default: 'function solve(input) {\n  // your code here\n}\n' },
    testCases: { type: [testCaseSchema], default: [] },
  },
  { timestamps: true }
);

const submissionSchema = new Schema(
  {
    assignment: { type: ObjectId, ref: 'Assignment', required: true },
    student: { type: ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    autoScore: { type: Number, default: 0 },
    score: { type: Number, default: null }, // final score set by mentor
    feedback: { type: String, default: '' },
    gradedBy: { type: ObjectId, ref: 'User', default: null },
    attempts: { type: Number, default: 1 },
    history: [{ at: { type: Date, default: Date.now }, passed: Number, total: Number, _id: false }],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export const User = model('User', userSchema);
export const Cohort = model('Cohort', cohortSchema);
export const Assignment = model('Assignment', assignmentSchema);
export const Submission = model('Submission', submissionSchema);
