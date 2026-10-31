# Student Progress Tracker: Setup to Deployment Guide

This guide covers everything, step by step: installing the tools, running the app on your computer, how the project is organised, and putting it live on the internet.

---

## Contents

1. [What you are building](#1-what-you-are-building)
2. [Install the prerequisites](#2-install-the-prerequisites)
3. [Get the project and install packages](#3-get-the-project-and-install-packages)
4. [Configure environment variables (.env)](#4-configure-environment-variables-env)
5. [Load demo data](#5-load-demo-data)
6. [Run in development mode](#6-run-in-development-mode)
7. [Use the app (walkthrough per role)](#7-use-the-app-walkthrough-per-role)
8. [How the project is organised](#8-how-the-project-is-organised)
9. [How each feature works internally](#9-how-each-feature-works-internally)
10. [API reference](#10-api-reference)
11. [Run in production mode locally](#11-run-in-production-mode-locally)
12. [Deploy: Option A, Render + MongoDB Atlas (free, easiest)](#12-deploy-option-a--render--mongodb-atlas-free-easiest)
13. [Deploy: Option B, your own Linux server (VPS) with PM2 + Nginx](#13-deploy-option-b--your-own-linux-server-vps-with-pm2--nginx)
14. [Push the code to GitHub](#14-push-the-code-to-github)
15. [Troubleshooting](#15-troubleshooting)
16. [Command cheat sheet](#16-command-cheat-sheet)

---

## 1. What you are building

A **MERN** application:

| Letter | Technology | Role in this project |
|---|---|---|
| **M** | MongoDB (+ Mongoose) | Database: users, cohorts, assignments, submissions |
| **E** | Express.js | Backend web server and REST API (`server/`) |
| **R** | React 18 (+ Vite, React Router, Recharts) | Frontend UI and charts (`src/`) |
| **N** | Node.js | Runs the backend and the build tools |

Three user roles:

- **Admin**: manages users, roles and cohorts, and sees platform-wide analytics.
- **Mentor**: creates coding assignments for their cohorts, reviews and grades submissions, and sees cohort analytics.
- **Student**: solves coding assignments in the browser, runs tests, submits, and tracks their own progress.

How the pieces talk to each other:

```
 Browser (React app)  ──HTTP /api/...──►  Express server (Node)  ──Mongoose──►  MongoDB
        ▲                                        │
        └──────────── JSON responses ◄───────────┘
```

- **Development:** two servers run. Vite (port **5180**) serves the React app with hot reload and forwards every `/api/*` request to Express (port **5000**).
- **Production:** you build React into static files (`dist/`), and Express serves both the website and the API from **one port**.

---

## 2. Install the prerequisites

You need **Node.js 18 or newer**, **MongoDB**, and **Git**. Check what you already have:

```bash
node -v      # should print v18.x or higher (v20/v22 recommended)
npm -v
git --version
mongosh --version
```

### 2.1 Node.js

**Linux / macOS (recommended: nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# close and reopen the terminal, then:
nvm install 22
nvm use 22
```

**Windows:** download the LTS installer from https://nodejs.org and run it.

### 2.2 MongoDB

You have two choices. Pick **one**:

**Choice 1: install MongoDB locally**

Ubuntu/Debian:
```bash
# follow the official steps for your Ubuntu version:
# https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
sudo systemctl start mongod
sudo systemctl enable mongod      # start automatically on boot
systemctl status mongod           # should say "active (running)"
```

macOS (Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Windows: install "MongoDB Community Server" from https://www.mongodb.com/try/download/community and choose "Install as a Service".

Test it:
```bash
mongosh --eval "db.version()"
```

**Choice 2: run MongoDB in Docker (no install)**
```bash
docker run -d --name mongo -p 27017:27017 -v mongo-data:/data/db mongo:7
```

**Choice 3: use MongoDB Atlas (cloud) without anything local.** See [section 12.1](#121-create-a-free-mongodb-atlas-database) to create a free database, then put its connection string in `.env`.

### 2.3 Git
- Linux: `sudo apt install git`
- macOS: `xcode-select --install`
- Windows: https://git-scm.com/download/win

---

## 3. Get the project and install packages

If you already have the folder (`/home/gangadhar/Documents/part-time/vinay`), just open a terminal there:

```bash
cd /home/gangadhar/Documents/part-time/vinay
```

If you are on a new machine, clone it from GitHub (after you push it, see [section 14](#14-push-the-code-to-github)):

```bash
git clone https://github.com/<your-username>/student-progress-tracker.git
cd student-progress-tracker
```

Install all dependencies (backend and frontend share one `package.json`):

```bash
npm install
```

This creates `node_modules/`. You only need to run it again if `package.json` changes.

What gets installed:

| Package | Why |
|---|---|
| `express` | web server and routing |
| `mongoose` | MongoDB models and queries |
| `jsonwebtoken` | creates and verifies login tokens (JWT) |
| `bcryptjs` | hashes passwords |
| `dotenv` | loads `.env` settings |
| `cors` | allows cross-origin API calls |
| `react`, `react-dom`, `react-router-dom` | the UI and page routing |
| `recharts` | dashboard charts |
| `vite`, `@vitejs/plugin-react` | dev server and production build (dev only) |
| `concurrently` | runs API and web servers together in one terminal (dev only) |

---

## 4. Configure environment variables (.env)

The server reads its settings from a file called `.env` in the project root. A template is provided:

```bash
cp .env.example .env        # Windows (PowerShell): Copy-Item .env.example .env
```

Contents:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_progress_tracker
JWT_SECRET=change-this-secret-in-production
```

| Variable | Meaning |
|---|---|
| `PORT` | Port the Express server listens on. Keep `5000` locally (the Vite dev proxy expects it). |
| `MONGO_URI` | Where MongoDB is. Local default shown above. For Atlas, paste your `mongodb+srv://...` string. |
| `JWT_SECRET` | Secret key used to sign login tokens. **Must be a long random value in production.** |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `.env` is listed in `.gitignore`, so it is never committed. Never put real secrets in Git.

---

## 5. Load demo data

```bash
npm run seed
```

⚠️ This **deletes everything** in the database named in `MONGO_URI`, then creates:

- 1 admin, 2 mentors, 12 students
- 2 cohorts ("MERN Batch 2026-A" and "MERN Batch 2026-B")
- 5 coding assignments per cohort (Sum, Reverse String, FizzBuzz, Two Sum, Balanced Brackets), due dates spread from 3 weeks ago to 2 weeks ahead
- realistic submissions, grades, feedback and activity history so the charts have data

Demo accounts (all use the password **`password123`**):

| Email | Role | Notes |
|---|---|---|
| `admin@tracker.dev` | admin | full access |
| `mentor@tracker.dev` | mentor | mentors both cohorts |
| `mentor2@tracker.dev` | mentor | mentors Batch B only |
| `student@tracker.dev` | student | in Batch A |

Run `npm run seed` again any time to reset to a clean demo state.

---

## 6. Run in development mode

```bash
npm run dev
```

You will see two coloured streams in the terminal:

```
[web]   ➜  Local:   http://localhost:5180/
[api] API running on http://localhost:5000
```

Open **http://localhost:5180** in your browser.

- Edit a file in `src/` and the browser updates instantly (hot reload).
- Edit a file in `server/` and the API restarts automatically (`node --watch`).
- Stop both with **Ctrl + C**.

You can also run the two halves in separate terminals:

```bash
npm run dev:api     # terminal 1: backend only, port 5000
npm run dev:web     # terminal 2: frontend only, port 5180
```

Quick API check from the terminal:

```bash
curl http://localhost:5000/api/auth/cohorts
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mentor@tracker.dev","password":"password123"}'
```

---

## 7. Use the app (walkthrough per role)

### Student (`student@tracker.dev`)
1. **Dashboard / My Progress**: completion %, average score, pending and missed counts, score-per-assignment chart, 30-day activity chart, and a table with status, tests passed, score and mentor feedback.
2. **Assignments**: cards for each assignment, filterable by Pending / Submitted / Graded / Missed.
3. Open an assignment, read the problem, write code in the editor (Tab inserts 2 spaces):
   - **Run tests** checks your code against the *visible* tests only. Nothing is saved.
   - **Submit** / **Resubmit** runs *all* tests including hidden ones, saves the submission and computes the auto score. Hidden tests show only pass/fail.
4. After the mentor grades it, the final score and feedback appear on the assignment and on My Progress.

### Mentor (`mentor@tracker.dev`)
1. **Dashboard**: choose a cohort to see its stat cards (completion rate, average score, pending grading, at-risk students), a completion-and-score chart per assignment, a coding-activity chart, a student table sortable by risk, score, completion or name, and an assignment table.
2. **+ New assignment**: title, cohort, description, difficulty, due date, max score, starter code and test cases.
   - Test case **Input** is a JSON *array of arguments* passed to `solve`. For example, `[2, 3]` calls `solve(2, 3)`, and `[[1,2,3], 5]` calls `solve([1,2,3], 5)`.
   - **Expected** is a JSON value: `5`, `"olleh"`, `[0,1]`, `true`.
   - Tick **Hidden** for tests students should not see.
3. Open an assignment to see the **Submissions** table. **Grade** opens the student's code beside a score and feedback form, with the score prefilled with the auto score. Click **Save grade**.
4. **Edit** or **Delete** an assignment from the same page. On the edit page you can paste a reference solution into "Starter code" and click **Run code above against saved tests** to check your tests.
5. Click any student's **Details →** to see their individual progress page.

### Admin (`admin@tracker.dev`)
1. **Dashboard**: platform totals, a cohort comparison chart, an activity chart and a cohort table.
2. **Cohorts**: create, edit or delete cohorts and tick which mentors run each one.
3. **Users**: search and filter, add users with any role, change a role or a student's cohort inline, and delete users.
4. An admin can do everything a mentor can, in every cohort.

### New students
Anyone can self-register at **/register**. Self-registration always creates a **student** (choosing a cohort is optional). Only an admin can create mentors or admins, or promote someone.

---

## 8. How the project is organised

```
vinay/
├── package.json          # one package for backend + frontend, all npm scripts
├── .env / .env.example   # server settings (PORT, MONGO_URI, JWT_SECRET)
├── vite.config.js        # Vite dev server on 5180, proxies /api → localhost:5000
├── index.html            # HTML shell that loads src/main.jsx
├── README.md             # short overview
├── SETUP_AND_DEPLOYMENT.md  # this guide
│
├── server/               # ── BACKEND (Express + Mongoose) ──
│   ├── index.js          # creates the app, connects MongoDB, error handler, serves dist/ if built
│   ├── routes.js         # every REST endpoint + permission checks + analytics
│   ├── models.js         # Mongoose schemas: User, Cohort, Assignment, Submission
│   ├── auth.js           # JWT sign/verify, requireAuth, requireRole, async wrapper
│   ├── runner.js         # executes student code against test cases (sandbox + timeout)
│   └── seed.js           # demo data generator
│
├── src/                  # ── FRONTEND (React) ──
│   ├── main.jsx          # React entry: Router + AuthProvider
│   ├── App.jsx           # all routes + role-protected route wrapper
│   ├── AuthContext.jsx   # logged-in user state, login/register/logout
│   ├── api.js            # fetch wrapper that adds the JWT header, handles 401
│   ├── useFetch.js       # small data-loading hook
│   ├── styles.css        # all styling (light + dark mode)
│   ├── components/
│   │   ├── Layout.jsx    # top navigation bar (links depend on role)
│   │   ├── Charts.jsx    # Recharts: activity, completion/score, per-assignment score
│   │   └── ui.jsx        # StatCard, Badge, Progress bar, Loader, date formatters
│   └── pages/
│       ├── Login.jsx, Register.jsx
│       ├── Dashboard.jsx        # picks Admin / Mentor / Student dashboard
│       ├── CohortAnalytics.jsx  # cohort dashboard (used by mentor dashboard too)
│       ├── StudentProgress.jsx  # one student's progress (also student home)
│       ├── Assignments.jsx      # list/cards
│       ├── AssignmentDetail.jsx # student solver OR mentor submissions + grading
│       ├── AssignmentForm.jsx   # create/edit assignment + test cases
│       ├── Cohorts.jsx          # list + admin create/edit
│       └── Users.jsx            # admin user management
│
└── dist/                 # created by `npm run build` (production frontend), not committed
```

npm scripts (`package.json`):

| Script | What it runs | When to use |
|---|---|---|
| `npm run dev` | API (`node --watch`) + Vite together | everyday development |
| `npm run dev:api` | backend only | debugging the API |
| `npm run dev:web` | frontend only | UI work (needs the API running) |
| `npm run build` | `vite build` → `dist/` | before production |
| `npm start` | `node server/index.js` | production (serves `dist/` + API) |
| `npm run seed` | `node server/seed.js` | reset the demo data |

---

## 9. How each feature works internally

### 9.1 Authentication (JWT)
1. On **register/login**, the server checks the password with **bcrypt** (passwords are stored hashed, never as plain text) and returns a **JWT** signed with `JWT_SECRET`, valid for 7 days.
2. The React app stores the token in `localStorage` (`spt_token`) and sends it on every request as `Authorization: Bearer <token>` (`src/api.js`).
3. On page refresh, `AuthContext` calls `GET /api/auth/me` to restore the user.
4. If any request returns **401**, the token is cleared and the user is sent to `/login`.

### 9.2 Role-based access control
- **Server (the real security):** `requireAuth` verifies the token and loads the user. `requireRole('admin','mentor')` blocks other roles with **403**. On top of that, `visibleCohortIds()` limits data by cohort:
  - admin: all cohorts
  - mentor: only cohorts where they are listed in `mentors`
  - student: only their own cohort
  So a mentor cannot read or grade another cohort's data even by calling the API directly.
- **Client (convenience only):** the `<Protected roles=[...]>` wrapper in `App.jsx` and the role-filtered nav in `Layout.jsx` hide pages a role can't use.

### 9.3 Data model (`server/models.js`)

| Collection | Key fields |
|---|---|
| **User** | name, email (unique), password (hashed, hidden by default), role, cohort (students) |
| **Cohort** | name (unique), description, startDate, mentors[] |
| **Assignment** | title, description, difficulty, cohort, createdBy, dueDate, maxScore, starterCode, testCases[{input, expected, hidden}] |
| **Submission** | assignment, student (one per pair, enforced by a unique index), code, passed/total, autoScore, score (mentor's final), feedback, status (`submitted`/`graded`), attempts, history[{at, passed, total}] |

### 9.4 Coding assessment and auto-grading (`server/runner.js`)
1. The student's code must define `function solve(...)`.
2. For each test case the server creates a fresh, isolated `vm` context, runs the code, then calls `solve(...JSON.parse(input))`.
3. The result is `JSON.stringify`-ed and compared with the expected JSON, after normalising formatting, so `[0, 1]` equals `[0,1]`.
4. Every run has a **1-second timeout**, so infinite loops are stopped. `console.log` output is captured and shown.
5. On **submit**: `autoScore = round(passed / total × maxScore)`. Resubmitting increments `attempts`, appends to `history`, and resets the status to `submitted` so the mentor re-grades.
6. Hidden tests are redacted in responses to students (they see pass/fail only).
7. The mentor's grade sets `score` (0–maxScore), `feedback`, `status = graded`, and `gradedBy`. Analytics use the mentor's `score` if it exists, otherwise `autoScore`.

> ⚠️ Node's `vm` module is **not** a hard security sandbox. That is fine for a portfolio project or trusted users. For a public product, run student code in an isolated container or a judge service such as **Judge0**.

### 9.5 Analytics (`/api/analytics/...`)
- **Completion rate** = submissions ÷ (students × assignments).
- **Average score** = mean of `score/maxScore` (or autoScore) as a percentage.
- **Activity** = number of submission attempts per day over the last 30 days (from `history`).
- **At-risk student** = missed 2+ past-due assignments, **or** average below 50%, **or** inactive for 14+ days.
- **Pending grading** = submissions whose status is still `submitted`.

---

## 10. API reference

All endpoints start with `/api`. Every endpoint except register, login and `auth/cohorts` needs `Authorization: Bearer <token>`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | create student account → `{token, user}` |
| POST | `/auth/login` | public | log in → `{token, user}` |
| GET | `/auth/cohorts` | public | cohort names for the register form |
| GET | `/auth/me` | any | current user |
| GET | `/users?role=&cohort=` | admin, mentor | list users (mentors see only their students) |
| POST | `/users` | admin | create user with any role |
| PUT | `/users/:id` | admin | change name/role/cohort/password |
| DELETE | `/users/:id` | admin | delete user + their submissions |
| GET | `/cohorts` | any | visible cohorts with student counts |
| POST | `/cohorts` | admin | create cohort |
| PUT / DELETE | `/cohorts/:id` | admin | edit / delete (also removes its assignments) |
| GET | `/assignments?cohort=` | any | list (students also get their submission status) |
| GET | `/assignments/:id` | any | details (hidden tests removed for students) |
| POST | `/assignments` | admin, mentor | create |
| PUT / DELETE | `/assignments/:id` | admin, mentor | edit / delete |
| POST | `/assignments/:id/run` | any | dry-run code (students: visible tests only) |
| POST | `/assignments/:id/submit` | student | submit code, auto-grade |
| GET | `/submissions?assignment=` | admin, mentor | submissions in visible cohorts |
| GET | `/submissions/mine` | student | own submissions |
| PUT | `/submissions/:id/grade` | admin, mentor | `{score, feedback}` |
| GET | `/analytics/overview` | admin | platform totals + per-cohort stats |
| GET | `/analytics/cohort/:id` | admin, mentor | cohort dashboard data |
| GET | `/analytics/student/:id` | self, their mentor, admin | student progress (`me` = self) |

Errors always come back as `{ "message": "..." }` with a proper status code (400, 401, 403, 404, 409, 500).

---

## 11. Run in production mode locally

This is exactly what a server does when you deploy:

```bash
npm install
npm run build        # creates dist/ (optimised React files)
npm start            # Express serves dist/ + /api on PORT (5000)
```

Open **http://localhost:5000**. Note that it's one port, with no Vite.

> If `dist/` exists, `npm start` serves the website. If you delete `dist/`, it serves only the API.

---

## 12. Deploy: Option A, Render + MongoDB Atlas (free, easiest)

You get a public URL like `https://student-progress-tracker.onrender.com`.

### 12.1 Create a free MongoDB Atlas database
1. Sign up at https://www.mongodb.com/cloud/atlas.
2. **Create** → choose the **M0 Free** cluster → pick a region close to your users → Create.
3. **Database Access** → *Add New Database User* → username, e.g. `trackeradmin`, plus a strong password (save it). Role: *Read and write to any database*.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`). Render's IPs change, so this is required on the free tier.
5. **Database** → *Connect* → *Drivers* → copy the connection string, which looks like:
   ```
   mongodb+srv://trackeradmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` and add the database name before the `?`:
   ```
   mongodb+srv://trackeradmin:YOURPASS@cluster0.xxxxx.mongodb.net/student_progress_tracker?retryWrites=true&w=majority
   ```
   If the password contains special characters such as `@ : / ? #`, URL-encode them (`@` → `%40`).

7. (Optional) Load demo data into Atlas from your computer:
   ```bash
   MONGO_URI="mongodb+srv://...your string..." npm run seed
   ```
   Windows PowerShell:
   ```powershell
   $env:MONGO_URI="mongodb+srv://...your string..."; npm run seed
   ```

### 12.2 Push your code to GitHub
See [section 14](#14-push-the-code-to-github).

### 12.3 Create the Render web service
1. Sign up at https://render.com with GitHub.
2. **New +** → **Web Service** → select your repository.
3. Fill in:

| Field | Value |
|---|---|
| Name | `student-progress-tracker` |
| Region | same as your Atlas region if possible |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

   > `--include=dev` matters: Vite is a dev dependency and is needed during the build.

4. **Environment Variables** → add:

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string (see section 4) |
| `NODE_VERSION` | `22` |

   Do **not** set `PORT`. Render provides it and the server reads it automatically.

5. Click **Create Web Service**. Watch the logs until you see `API running on http://localhost:XXXX`.
6. Open the `https://....onrender.com` URL and log in.

**Updates:** every `git push` to `main` redeploys automatically.

**Free-tier note:** the service sleeps after about 15 minutes idle, and the first request afterwards takes about 30–60 seconds to wake it.

---

## 13. Deploy: Option B, your own Linux server (VPS) with PM2 + Nginx

Use any Ubuntu 22.04/24.04 server (AWS EC2, DigitalOcean, Hostinger, etc.).

### 13.1 Connect and install software
```bash
ssh ubuntu@YOUR_SERVER_IP

sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# PM2 keeps the app running and restarts it on crash/reboot
sudo npm install -g pm2
```

For the database, either use **MongoDB Atlas** (section 12.1, recommended) or install MongoDB on the server using the official Ubuntu guide.

### 13.2 Get the code and build
```bash
cd ~
git clone https://github.com/<your-username>/student-progress-tracker.git
cd student-progress-tracker
npm install
npm run build

cp .env.example .env
nano .env        # set MONGO_URI and a strong JWT_SECRET; keep PORT=5000
npm run seed     # optional demo data. Do NOT run this on a database with real data.
```

### 13.3 Start with PM2
```bash
pm2 start server/index.js --name tracker
pm2 save
pm2 startup      # copy-paste the command it prints, so the app starts on reboot
pm2 status
pm2 logs tracker # live logs (Ctrl+C to exit)
```

### 13.4 Nginx reverse proxy (port 80 → 5000)
```bash
sudo nano /etc/nginx/sites-available/tracker
```
Paste (replace the domain, or use the server IP):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/tracker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t            # must say "syntax is ok"
sudo systemctl reload nginx
```

### 13.5 Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
Do **not** open port 5000 or 27017 to the internet.

### 13.6 Domain + free HTTPS
1. At your domain registrar, add an **A record**: `@` → `YOUR_SERVER_IP` (and `www` → same IP).
2. Wait for DNS to update, then:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot configures HTTPS and auto-renews.

### 13.7 Deploying updates later
```bash
cd ~/student-progress-tracker
git pull
npm install
npm run build
pm2 restart tracker
```

---

## 14. Push the code to GitHub

From the project folder on your computer:

```bash
cd /home/gangadhar/Documents/part-time/vinay
git init
git add .
git status            # make sure .env and node_modules are NOT listed
git commit -m "Student Progress Tracker (MERN)"
git branch -M main
```
Create an **empty** repository on https://github.com/new (no README), then:
```bash
git remote add origin https://github.com/<your-username>/student-progress-tracker.git
git push -u origin main
```

> The empty `vinay/` sub-folder inside the project is not used by the app and can be deleted.

---

## 15. Troubleshooting

| Problem | Cause → Fix |
|---|---|
| `MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB isn't running → `sudo systemctl start mongod` (Linux), `brew services start mongodb-community` (macOS), start the "MongoDB" service (Windows), or `docker start mongo`. |
| `MongoServerError: bad auth` (Atlas) | Wrong username or password in `MONGO_URI`, or special characters not URL-encoded. |
| Atlas connection timeout | Your IP isn't allowed → Atlas → Network Access → add your IP or `0.0.0.0/0`. |
| `Port 5180 is already in use` | Another app is on 5180 → stop it, or change `port` in `vite.config.js`. |
| `EADDRINUSE :::5000` | Another process uses 5000 → `lsof -i :5000` then `kill <PID>`, or change `PORT` in `.env` (and the proxy target in `vite.config.js`). On macOS, AirPlay Receiver uses port 5000: turn it off in System Settings or use another port. |
| Browser shows a different app on localhost | An old service worker from another project is cached → DevTools → Application → Service Workers → *Unregister*, then hard refresh (Ctrl+Shift+R). |
| Login works then immediately logs out | `JWT_SECRET` changed or the server restarted with a different secret → log in again. |
| "Invalid email or password" with demo accounts | Seed not run on this database → `npm run seed`. |
| Charts empty | No submissions yet → run `npm run seed` or submit some code as a student. |
| Render build fails: `vite: not found` | Build command must be `npm install --include=dev && npm run build`. |
| Render site shows "Cannot GET /" | Build didn't create `dist/` → check build logs. |
| `npm install` errors about Node version | Upgrade Node to 18+ (`nvm install 22`). |
| Submission says "Script execution timed out" | Student code has an infinite loop or is too slow (limit 1 s per test). |
| "Test case input/expected must be valid JSON" | Strings need double quotes: `"abc"`, not `abc`. Input must be an array of args: `[5]`, not `5`. |

---

## 16. Command cheat sheet

```bash
# first-time setup
npm install
cp .env.example .env
npm run seed

# daily development  →  http://localhost:5180
npm run dev            # Ctrl+C to stop

# production locally  →  http://localhost:5000
npm run build
npm start

# reset demo data (wipes DB)
npm run seed

# VPS
pm2 start server/index.js --name tracker
pm2 restart tracker
pm2 logs tracker
pm2 stop tracker
```

Demo logins (password `password123`): `admin@tracker.dev` · `mentor@tracker.dev` · `mentor2@tracker.dev` · `student@tracker.dev`
