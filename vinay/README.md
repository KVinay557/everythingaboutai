# Student Progress Tracker (MERN)

Full-stack app for mentors to run coding cohorts: role-based access, a coding
assessment module with auto-graded JavaScript assignments, and cohort/student
progress analytics.

**Stack:** MongoDB + Mongoose · Express · React 18 + React Router + Recharts (Vite) · Node.js · JWT auth

## Features

- **Auth & roles:** JWT login/registration, bcrypt-hashed passwords. Three roles:
  - **Admin:** manages users, roles, cohorts and mentor assignment; platform-wide overview.
  - **Mentor:** creates programming assignments for their cohorts, reviews code, grades and gives feedback; cohort analytics.
  - **Student:** solves assignments in the browser, runs tests, submits/resubmits, tracks their own progress.
- **Coding assessments:** students write `solve(...)`; code runs server-side in a sandboxed `vm` context with a 1 s timeout
  against visible and hidden test cases. Auto-score = % tests passed × max score; mentors can override with a final score and feedback.
- **Analytics dashboards:** completion rate and average score per assignment, 30-day coding-activity chart,
  per-student table with at-risk flags (2+ missed assignments, avg < 50%, or inactive 14+ days), and individual student progress pages.

## Run locally

Full step-by-step guide (setup → deployment): [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md)


Requires Node 18+ and MongoDB running on `localhost:27017` (or set `MONGO_URI` in `.env`).

```bash
npm install
npm run seed     # demo data (wipes the database)
npm run dev      # API on :5000, web on http://localhost:5180
```

Demo logins (password `password123`): `admin@tracker.dev`, `mentor@tracker.dev`, `mentor2@tracker.dev`, `student@tracker.dev`.

Production: `npm run build && npm start` serves the built React app and API together on `PORT` (default 5000).

## Project layout

```
server/   index.js (app), routes.js (REST API), models.js, auth.js (JWT + role middleware), runner.js (code runner), seed.js
src/      React app: pages/, components/, AuthContext.jsx, api.js, useFetch.js
```

## REST API (all under /api)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users (admin) | `GET/POST /users`, `PUT/DELETE /users/:id` |
| Cohorts | `GET /cohorts`, `POST /cohorts`, `PUT/DELETE /cohorts/:id` (admin) |
| Assignments | `GET/POST /assignments`, `GET/PUT/DELETE /assignments/:id`, `POST /assignments/:id/run`, `POST /assignments/:id/submit` |
| Submissions | `GET /submissions`, `GET /submissions/mine`, `PUT /submissions/:id/grade` |
| Analytics | `GET /analytics/overview`, `GET /analytics/cohort/:id`, `GET /analytics/student/:id` (`me` for self) |

> Note: Node's `vm` module is not a security boundary. That is fine for a demo, but in production student code should run in an isolated container or a judge service (e.g. Judge0).
