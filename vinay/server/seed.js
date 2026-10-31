import 'dotenv/config';
import mongoose from 'mongoose';
import { User, Cohort, Assignment, Submission } from './models.js';
import { runTests } from './runner.js';

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY);

const PROBLEMS = [
  {
    title: 'Sum of Two Numbers',
    difficulty: 'easy',
    description: 'Write `solve(a, b)` that returns the sum of two numbers.',
    starterCode: 'function solve(a, b) {\n  // return the sum\n}\n',
    good: 'function solve(a, b) { return a + b; }',
    bad: 'function solve(a, b) { return a - b; }',
    testCases: [
      { input: '[2, 3]', expected: '5' },
      { input: '[-1, 1]', expected: '0' },
      { input: '[100, 250]', expected: '350', hidden: true },
    ],
  },
  {
    title: 'Reverse a String',
    difficulty: 'easy',
    description: 'Write `solve(str)` that returns the string reversed.',
    starterCode: 'function solve(str) {\n  \n}\n',
    good: "function solve(s) { return s.split('').reverse().join(''); }",
    bad: 'function solve(s) { return s; }',
    testCases: [
      { input: '["hello"]', expected: '"olleh"' },
      { input: '["a"]', expected: '"a"' },
      { input: '["racecar"]', expected: '"racecar"', hidden: true },
      { input: '["MERN"]', expected: '"NREM"', hidden: true },
    ],
  },
  {
    title: 'FizzBuzz Array',
    difficulty: 'medium',
    description:
      'Write `solve(n)` that returns an array from 1..n where multiples of 3 are "Fizz", multiples of 5 are "Buzz", and multiples of both are "FizzBuzz". Other entries are numbers.',
    starterCode: 'function solve(n) {\n  const out = [];\n  return out;\n}\n',
    good: "function solve(n){const o=[];for(let i=1;i<=n;i++)o.push(i%15===0?'FizzBuzz':i%3===0?'Fizz':i%5===0?'Buzz':i);return o;}",
    bad: "function solve(n){const o=[];for(let i=1;i<=n;i++)o.push(i%3===0?'Fizz':i);return o;}",
    testCases: [
      { input: '[3]', expected: '[1,2,"Fizz"]' },
      { input: '[5]', expected: '[1,2,"Fizz",4,"Buzz"]' },
      { input: '[15]', expected: '[1,2,"Fizz",4,"Buzz","Fizz",7,8,"Fizz","Buzz",11,"Fizz",13,14,"FizzBuzz"]', hidden: true },
    ],
  },
  {
    title: 'Two Sum Indices',
    difficulty: 'medium',
    description: 'Write `solve(nums, target)` that returns the indices `[i, j]` (i < j) of the two numbers that add up to target.',
    starterCode: 'function solve(nums, target) {\n  \n}\n',
    good: 'function solve(n,t){const m={};for(let i=0;i<n.length;i++){if(m[t-n[i]]!==undefined)return [m[t-n[i]],i];m[n[i]]=i;}}',
    bad: 'function solve(n,t){return [0,1];}',
    testCases: [
      { input: '[[2,7,11,15], 9]', expected: '[0,1]' },
      { input: '[[3,2,4], 6]', expected: '[1,2]' },
      { input: '[[1,5,3,8], 11]', expected: '[2,3]', hidden: true },
    ],
  },
  {
    title: 'Balanced Brackets',
    difficulty: 'hard',
    description: 'Write `solve(str)` that returns `true` if every bracket `()[]{}` in the string is balanced, otherwise `false`.',
    starterCode: 'function solve(str) {\n  \n}\n',
    good: "function solve(s){const st=[],p={')':'(',']':'[','}':'{'};for(const c of s){if('([{'.includes(c))st.push(c);else if(p[c]&&st.pop()!==p[c])return false;}return st.length===0;}",
    bad: "function solve(s){return s.length%2===0;}",
    testCases: [
      { input: '["()[]{}"]', expected: 'true' },
      { input: '["(]"]', expected: 'false' },
      { input: '["{[()]}"]', expected: 'true', hidden: true },
      { input: '["(("]', expected: 'false', hidden: true },
    ],
  },
];

const STUDENT_NAMES = [
  'Aarav Sharma', 'Diya Patel', 'Rohan Reddy', 'Ananya Iyer', 'Kabir Singh', 'Meera Nair',
  'Arjun Rao', 'Sneha Kulkarni', 'Vikram Joshi', 'Isha Gupta', 'Rahul Verma', 'Priya Menon',
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_progress_tracker');
  await Promise.all([User.deleteMany(), Cohort.deleteMany(), Assignment.deleteMany(), Submission.deleteMany()]);

  const password = 'password123';
  await User.create({ name: 'Admin User', email: 'admin@tracker.dev', password, role: 'admin' });
  const mentorA = await User.create({ name: 'Neha Kapoor', email: 'mentor@tracker.dev', password, role: 'mentor' });
  const mentorB = await User.create({ name: 'Suresh Kumar', email: 'mentor2@tracker.dev', password, role: 'mentor' });

  const cohorts = await Cohort.create([
    { name: 'MERN Batch 2026-A', description: 'Full-stack JavaScript, weekday batch', startDate: daysFromNow(-45), mentors: [mentorA._id] },
    { name: 'MERN Batch 2026-B', description: 'Full-stack JavaScript, weekend batch', startDate: daysFromNow(-30), mentors: [mentorB._id, mentorA._id] },
  ]);

  const students = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const email = i === 0 ? 'student@tracker.dev' : `${name.split(' ')[0].toLowerCase()}@tracker.dev`;
    students.push(await User.create({ name, email, password, role: 'student', cohort: cohorts[i % 2]._id }));
  }

  // Due dates spread from 3 weeks ago to 2 weeks ahead.
  const dueOffsets = [-21, -14, -7, 3, 14];
  for (const cohort of cohorts) {
    const mentor = cohort.mentors[0];
    const members = students.filter((s) => s.cohort.equals(cohort._id));
    for (const [pi, p] of PROBLEMS.entries()) {
      const a = await Assignment.create({
        title: p.title, description: p.description, difficulty: p.difficulty, starterCode: p.starterCode,
        testCases: p.testCases, cohort: cohort._id, createdBy: mentor, dueDate: daysFromNow(dueOffsets[pi]), maxScore: 100,
      });
      for (const [si, st] of members.entries()) {
        // Later problems get fewer submissions; a couple of students lag behind.
        const skill = (si * 37) % 100;
        if (pi >= 3 && skill < 40) continue;
        if (si === members.length - 1 && pi >= 1) continue;
        const code = skill > 30 || pi === 0 ? p.good : p.bad;
        const { passed, total } = runTests(code, p.testCases);
        const attempts = 1 + (skill % 3);
        const last = new Date(Math.min(Date.now() - DAY / 4, a.dueDate.getTime() - ((si % 4) + 1) * DAY / 2));
        const history = Array.from({ length: attempts }, (_, k) => ({
          at: new Date(last.getTime() - (attempts - 1 - k) * DAY * 0.7),
          passed: k === attempts - 1 ? passed : Math.max(0, passed - 1),
          total,
        }));
        const autoScore = Math.round((passed / total) * 100);
        const graded = a.dueDate < new Date() && si % 3 !== 0;
        await Submission.create({
          assignment: a._id, student: st._id, code, passed, total, autoScore, attempts, history, submittedAt: last,
          status: graded ? 'graded' : 'submitted',
          score: graded ? Math.min(100, autoScore + (skill % 10)) : null,
          feedback: graded ? (autoScore === 100 ? 'Great work, clean solution.' : 'Check the edge cases in hidden tests.') : '',
          gradedBy: graded ? mentor : null,
        });
      }
    }
  }

  console.log('Seed complete. All accounts use password: password123');
  console.log('  admin@tracker.dev   (admin)');
  console.log('  mentor@tracker.dev  (mentor, both cohorts)');
  console.log('  mentor2@tracker.dev (mentor, Batch B)');
  console.log('  student@tracker.dev (student, Batch A)');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
