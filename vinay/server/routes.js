import { Router } from 'express';
import mongoose from 'mongoose';
import { User, Cohort, Assignment, Submission } from './models.js';
import { requireAuth, requireRole, signToken, wrap } from './auth.js';
import { runTests, redactHidden } from './runner.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  cohort: u.cohort,
  createdAt: u.createdAt,
});

// Cohort ids the current user is allowed to see.
async function visibleCohortIds(user) {
  if (user.role === 'admin') return (await Cohort.find({}, '_id')).map((c) => c._id);
  if (user.role === 'mentor') return (await Cohort.find({ mentors: user._id }, '_id')).map((c) => c._id);
  return user.cohort ? [user.cohort] : [];
}

async function canSeeCohort(user, cohortId) {
  const ids = await visibleCohortIds(user);
  return ids.some((id) => id.equals(cohortId));
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// ---------- Auth ----------
router.post(
  '/auth/register',
  wrap(async (req, res) => {
    const { name, email, password, cohort } = req.body;
    if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
    if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, 'Email already registered');
    // Self-registration always creates a student; admins create mentors.
    const user = await User.create({ name, email, password, role: 'student', cohort: cohort || null });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) throw httpError(401, 'Invalid email or password');
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// Public list so new students can pick a cohort while registering.
router.get(
  '/auth/cohorts',
  wrap(async (_req, res) => res.json(await Cohort.find({}, 'name').sort('name')))
);

router.use(requireAuth);

router.get('/auth/me', (req, res) => res.json(publicUser(req.user)));

// ---------- Users ----------
router.get(
  '/users',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.cohort) filter.cohort = req.query.cohort;
    if (req.user.role === 'mentor') {
      filter.role = 'student';
      filter.cohort = { $in: await visibleCohortIds(req.user) };
      if (req.query.cohort && (await canSeeCohort(req.user, req.query.cohort))) filter.cohort = req.query.cohort;
    }
    res.json(await User.find(filter).populate('cohort', 'name').sort('name'));
  })
);

router.post(
  '/users',
  requireRole('admin'),
  wrap(async (req, res) => {
    const { name, email, password, role, cohort } = req.body;
    if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
    if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, 'Email already registered');
    const user = await User.create({ name, email, password, role, cohort: role === 'student' ? cohort || null : null });
    res.status(201).json(publicUser(user));
  })
);

router.put(
  '/users/:id',
  requireRole('admin'),
  wrap(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, 'User not found');
    const { name, role, cohort, password } = req.body;
    if (name) user.name = name;
    if (role) user.role = role;
    if (cohort !== undefined) user.cohort = user.role === 'student' ? cohort || null : null;
    if (password) user.password = password;
    await user.save();
    res.json(publicUser(user));
  })
);

router.delete(
  '/users/:id',
  requireRole('admin'),
  wrap(async (req, res) => {
    if (req.user._id.equals(req.params.id)) throw httpError(400, 'You cannot delete yourself');
    await User.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ student: req.params.id });
    await Cohort.updateMany({}, { $pull: { mentors: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------- Cohorts ----------
router.get(
  '/cohorts',
  wrap(async (req, res) => {
    const ids = await visibleCohortIds(req.user);
    const cohorts = await Cohort.find({ _id: { $in: ids } }).populate('mentors', 'name email').sort('name').lean();
    const counts = await User.aggregate([
      { $match: { role: 'student', cohort: { $in: ids } } },
      { $group: { _id: '$cohort', n: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.n]));
    res.json(cohorts.map((c) => ({ ...c, studentCount: countMap[c._id.toString()] || 0 })));
  })
);

router.post(
  '/cohorts',
  requireRole('admin'),
  wrap(async (req, res) => {
    const { name, description, startDate, mentors } = req.body;
    if (!name) throw httpError(400, 'Cohort name is required');
    res.status(201).json(await Cohort.create({ name, description, startDate, mentors }));
  })
);

router.put(
  '/cohorts/:id',
  requireRole('admin'),
  wrap(async (req, res) => {
    const update = {};
    for (const k of ['name', 'description', 'startDate', 'mentors']) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const cohort = await Cohort.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!cohort) throw httpError(404, 'Cohort not found');
    res.json(cohort);
  })
);

router.delete(
  '/cohorts/:id',
  requireRole('admin'),
  wrap(async (req, res) => {
    const assignments = await Assignment.find({ cohort: req.params.id }, '_id');
    await Submission.deleteMany({ assignment: { $in: assignments.map((a) => a._id) } });
    await Assignment.deleteMany({ cohort: req.params.id });
    await User.updateMany({ cohort: req.params.id }, { cohort: null });
    await Cohort.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

// ---------- Assignments ----------
async function loadAssignment(req) {
  const a = await Assignment.findById(req.params.id).populate('cohort', 'name').populate('createdBy', 'name');
  if (!a || !(await canSeeCohort(req.user, a.cohort._id))) throw httpError(404, 'Assignment not found');
  return a;
}

const studentView = (a) => {
  const obj = a.toObject();
  obj.testCases = obj.testCases.filter((t) => !t.hidden);
  obj.hiddenTestCount = a.testCases.length - obj.testCases.length;
  return obj;
};

router.get(
  '/assignments',
  wrap(async (req, res) => {
    const ids = await visibleCohortIds(req.user);
    const filter = { cohort: { $in: ids } };
    if (req.query.cohort) filter.cohort = ids.find((id) => id.equals(req.query.cohort)) || null;
    const list = await Assignment.find(filter, '-testCases -starterCode').populate('cohort', 'name').sort('dueDate').lean();

    if (req.user.role === 'student') {
      const subs = await Submission.find({ student: req.user._id }, 'assignment status score autoScore passed total').lean();
      const byA = Object.fromEntries(subs.map((s) => [s.assignment.toString(), s]));
      return res.json(list.map((a) => ({ ...a, submission: byA[a._id.toString()] || null })));
    }
    const counts = await Submission.aggregate([
      { $match: { assignment: { $in: list.map((a) => a._id) } } },
      { $group: { _id: '$assignment', submitted: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } } } },
    ]);
    const cMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));
    res.json(list.map((a) => ({ ...a, submitted: cMap[a._id]?.submitted || 0, graded: cMap[a._id]?.graded || 0 })));
  })
);

router.get(
  '/assignments/:id',
  wrap(async (req, res) => {
    const a = await loadAssignment(req);
    if (req.user.role !== 'student') return res.json(a);
    const submission = await Submission.findOne({ assignment: a._id, student: req.user._id }).lean();
    res.json({ ...studentView(a), submission });
  })
);

function validateAssignment(body) {
  for (const tc of body.testCases || []) {
    try {
      JSON.parse(tc.input);
      JSON.parse(tc.expected);
    } catch {
      throw httpError(400, `Test case input/expected must be valid JSON (got input: ${tc.input}, expected: ${tc.expected})`);
    }
  }
}

router.post(
  '/assignments',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    if (!(await canSeeCohort(req.user, req.body.cohort))) throw httpError(403, 'You do not mentor this cohort');
    validateAssignment(req.body);
    const { title, description, difficulty, cohort, dueDate, maxScore, starterCode, testCases } = req.body;
    const a = await Assignment.create({ title, description, difficulty, cohort, dueDate, maxScore, starterCode, testCases, createdBy: req.user._id });
    res.status(201).json(a);
  })
);

router.put(
  '/assignments/:id',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    const a = await loadAssignment(req);
    validateAssignment(req.body);
    if (req.body.cohort && !(await canSeeCohort(req.user, req.body.cohort))) throw httpError(403, 'You do not mentor this cohort');
    for (const k of ['title', 'description', 'difficulty', 'cohort', 'dueDate', 'maxScore', 'starterCode', 'testCases']) {
      if (req.body[k] !== undefined) a[k] = req.body[k];
    }
    await a.save();
    res.json(a);
  })
);

router.delete(
  '/assignments/:id',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    const a = await loadAssignment(req);
    await Submission.deleteMany({ assignment: a._id });
    await a.deleteOne();
    res.json({ ok: true });
  })
);

// Dry run against visible tests only; nothing is saved.
router.post(
  '/assignments/:id/run',
  wrap(async (req, res) => {
    const a = await loadAssignment(req);
    const visible = a.testCases.filter((t) => !t.hidden);
    res.json(runTests(req.body.code || '', req.user.role === 'student' ? visible : a.testCases));
  })
);

router.post(
  '/assignments/:id/submit',
  requireRole('student'),
  wrap(async (req, res) => {
    const a = await loadAssignment(req);
    const code = req.body.code || '';
    if (!code.trim()) throw httpError(400, 'Code cannot be empty');
    const { results, passed, total } = runTests(code, a.testCases);
    const autoScore = total ? Math.round((passed / total) * a.maxScore) : 0;
    const now = new Date();

    let sub = await Submission.findOne({ assignment: a._id, student: req.user._id });
    if (sub) {
      Object.assign(sub, { code, passed, total, autoScore, status: 'submitted', score: null, submittedAt: now });
      sub.attempts += 1;
      sub.history.push({ at: now, passed, total });
      await sub.save();
    } else {
      sub = await Submission.create({
        assignment: a._id, student: req.user._id, code, passed, total, autoScore,
        history: [{ at: now, passed, total }], submittedAt: now,
      });
    }
    res.json({ submission: sub, results: redactHidden(results) });
  })
);

// ---------- Submissions ----------
router.get(
  '/submissions',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    const ids = await visibleCohortIds(req.user);
    const aFilter = { cohort: { $in: ids } };
    if (req.query.assignment) aFilter._id = req.query.assignment;
    const assignments = await Assignment.find(aFilter, '_id');
    const subs = await Submission.find({ assignment: { $in: assignments.map((a) => a._id) } })
      .populate('student', 'name email')
      .populate('assignment', 'title maxScore')
      .populate('gradedBy', 'name')
      .sort('-submittedAt');
    res.json(subs);
  })
);

router.get(
  '/submissions/mine',
  requireRole('student'),
  wrap(async (req, res) => {
    res.json(await Submission.find({ student: req.user._id }).populate('assignment', 'title maxScore dueDate').sort('-submittedAt'));
  })
);

router.put(
  '/submissions/:id/grade',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    const sub = await Submission.findById(req.params.id).populate('assignment');
    if (!sub || !(await canSeeCohort(req.user, sub.assignment.cohort))) throw httpError(404, 'Submission not found');
    const score = Number(req.body.score);
    if (Number.isNaN(score) || score < 0 || score > sub.assignment.maxScore) {
      throw httpError(400, `Score must be between 0 and ${sub.assignment.maxScore}`);
    }
    Object.assign(sub, { score, feedback: req.body.feedback || '', status: 'graded', gradedBy: req.user._id });
    await sub.save();
    res.json(sub);
  })
);

// ---------- Analytics ----------
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const finalScore = (s) => (s.score ?? s.autoScore);

function activitySeries(subs, days = 30) {
  const start = new Date(Date.now() - (days - 1) * DAY);
  start.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY);
    return { date: d.toISOString().slice(0, 10), attempts: 0 };
  });
  for (const s of subs) {
    for (const h of s.history || []) {
      const i = Math.floor((new Date(h.at) - start) / DAY);
      if (i >= 0 && i < days) buckets[i].attempts += 1;
    }
  }
  return buckets.map((b) => ({ ...b, label: b.date.slice(5) }));
}

router.get(
  '/analytics/overview',
  requireRole('admin'),
  wrap(async (_req, res) => {
    const [students, mentors, cohorts, assignments, submissions] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'mentor' }),
      Cohort.find().lean(),
      Assignment.find({}, 'cohort maxScore').lean(),
      Submission.find({}, 'assignment score autoScore history').lean(),
    ]);
    const studentsByCohort = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$cohort', n: { $sum: 1 } } },
    ]);
    const sMap = Object.fromEntries(studentsByCohort.map((c) => [String(c._id), c.n]));
    const aByCohort = {};
    for (const a of assignments) (aByCohort[a.cohort] ||= []).push(a);
    const subsByA = {};
    for (const s of submissions) (subsByA[s.assignment] ||= []).push(s);

    const cohortStats = cohorts.map((c) => {
      const as = aByCohort[c._id] || [];
      const subs = as.flatMap((a) => subsByA[a._id] || []);
      const expected = as.length * (sMap[c._id] || 0);
      const scoreSum = as.reduce(
        (acc, a) => acc + (subsByA[a._id] || []).reduce((x, s) => x + pct(finalScore(s), a.maxScore), 0), 0);
      return {
        _id: c._id,
        name: c.name,
        students: sMap[c._id] || 0,
        assignments: as.length,
        completionRate: pct(subs.length, expected),
        avgScore: subs.length ? Math.round(scoreSum / subs.length) : 0,
      };
    });
    res.json({
      totals: { students, mentors, cohorts: cohorts.length, assignments: assignments.length, submissions: submissions.length },
      cohorts: cohortStats,
      activity: activitySeries(submissions),
    });
  })
);

router.get(
  '/analytics/cohort/:id',
  requireRole('admin', 'mentor'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id) || !(await canSeeCohort(req.user, req.params.id))) {
      throw httpError(404, 'Cohort not found');
    }
    const cohort = await Cohort.findById(req.params.id).populate('mentors', 'name').lean();
    const [students, assignments] = await Promise.all([
      User.find({ role: 'student', cohort: cohort._id }, 'name email').sort('name').lean(),
      Assignment.find({ cohort: cohort._id }, 'title dueDate maxScore difficulty').sort('dueDate').lean(),
    ]);
    const subs = await Submission.find({ assignment: { $in: assignments.map((a) => a._id) } }).lean();
    const aMap = Object.fromEntries(assignments.map((a) => [a._id.toString(), a]));
    const now = Date.now();

    const perAssignment = assignments.map((a) => {
      const s = subs.filter((x) => x.assignment.equals(a._id));
      return {
        _id: a._id,
        title: a.title,
        dueDate: a.dueDate,
        submitted: s.length,
        graded: s.filter((x) => x.status === 'graded').length,
        completionRate: pct(s.length, students.length),
        avgScore: s.length ? Math.round(s.reduce((acc, x) => acc + pct(finalScore(x), a.maxScore), 0) / s.length) : 0,
      };
    });

    const pastDue = assignments.filter((a) => new Date(a.dueDate) < now);
    const perStudent = students.map((st) => {
      const mine = subs.filter((x) => x.student.equals(st._id));
      const avg = mine.length
        ? Math.round(mine.reduce((acc, x) => acc + pct(finalScore(x), aMap[x.assignment].maxScore), 0) / mine.length)
        : 0;
      const lastActive = mine.flatMap((x) => x.history.map((h) => new Date(h.at))).sort((a, b) => b - a)[0] || null;
      const missed = pastDue.filter((a) => !mine.some((x) => x.assignment.equals(a._id))).length;
      const inactiveDays = lastActive ? Math.floor((now - lastActive) / DAY) : Infinity;
      return {
        _id: st._id,
        name: st.name,
        email: st.email,
        completed: mine.length,
        completionRate: pct(mine.length, assignments.length),
        avgScore: avg,
        attempts: mine.reduce((acc, x) => acc + x.attempts, 0),
        lastActive,
        missed,
        atRisk: missed >= 2 || (mine.length > 0 && avg < 50) || inactiveDays > 14,
      };
    });

    res.json({
      cohort,
      summary: {
        students: students.length,
        assignments: assignments.length,
        submissions: subs.length,
        completionRate: pct(subs.length, students.length * assignments.length),
        avgScore: perStudent.filter((s) => s.completed).length
          ? Math.round(perStudent.filter((s) => s.completed).reduce((a, s) => a + s.avgScore, 0) / perStudent.filter((s) => s.completed).length)
          : 0,
        pendingGrading: subs.filter((s) => s.status === 'submitted').length,
        atRisk: perStudent.filter((s) => s.atRisk).length,
      },
      perAssignment,
      perStudent,
      activity: activitySeries(subs),
    });
  })
);

router.get(
  '/analytics/student/:id',
  wrap(async (req, res) => {
    const id = req.params.id === 'me' ? req.user._id : req.params.id;
    if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Student not found');
    const student = await User.findOne({ _id: id, role: 'student' }).populate('cohort', 'name').lean();
    if (!student) throw httpError(404, 'Student not found');
    const allowed =
      req.user.role === 'admin' ||
      req.user._id.equals(student._id) ||
      (req.user.role === 'mentor' && student.cohort && (await canSeeCohort(req.user, student.cohort._id)));
    if (!allowed) throw httpError(403, 'You cannot view this student');

    const assignments = student.cohort
      ? await Assignment.find({ cohort: student.cohort._id }, 'title dueDate maxScore difficulty').sort('dueDate').lean()
      : [];
    const subs = await Submission.find({ student: student._id }).lean();
    const now = Date.now();

    const rows = assignments.map((a) => {
      const s = subs.find((x) => x.assignment.equals(a._id));
      let status = 'pending';
      if (s) status = s.status;
      else if (new Date(a.dueDate) < now) status = 'missed';
      return {
        _id: a._id,
        title: a.title,
        difficulty: a.difficulty,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        status,
        score: s ? finalScore(s) : null,
        percent: s ? pct(finalScore(s), a.maxScore) : null,
        passed: s?.passed ?? null,
        total: s?.total ?? null,
        attempts: s?.attempts ?? 0,
        feedback: s?.feedback || '',
        submittedAt: s?.submittedAt || null,
      };
    });
    const done = rows.filter((r) => r.percent !== null);
    res.json({
      student,
      summary: {
        assignments: rows.length,
        completed: done.length,
        completionRate: pct(done.length, rows.length),
        avgScore: done.length ? Math.round(done.reduce((a, r) => a + r.percent, 0) / done.length) : 0,
        missed: rows.filter((r) => r.status === 'missed').length,
        attempts: subs.reduce((a, s) => a + s.attempts, 0),
      },
      assignments: rows,
      activity: activitySeries(subs),
    });
  })
);

export default router;
