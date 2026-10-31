import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { ActivityChart, CompletionChart } from '../components/Charts.jsx';
import { Empty, ErrorBox, Loader, Progress, StatCard } from '../components/ui.jsx';
import StudentProgress from './StudentProgress.jsx';
import { CohortView } from './CohortAnalytics.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentProgress />;
  if (user.role === 'mentor') return <MentorDashboard />;
  return <AdminDashboard />;
}

function MentorDashboard() {
  const { user } = useAuth();
  const { data: cohorts, loading, error } = useFetch('/cohorts');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (cohorts?.length && !selected) setSelected(cohorts[0]._id);
  }, [cohorts, selected]);

  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {user.name.split(' ')[0]}</h1>
          <p className="muted">Cohort-level coding activity and learning progress</p>
        </div>
        <div className="row gap">
          {cohorts.length > 0 && (
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {cohorts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          <Link className="btn primary" to="/assignments/new">+ New assignment</Link>
        </div>
      </div>
      {cohorts.length === 0 ? <Empty>You are not assigned to any cohort yet. Ask an admin to add you.</Empty> : selected && <CohortView id={selected} />}
    </>
  );
}

function AdminDashboard() {
  const { data, loading, error } = useFetch('/analytics/overview');
  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const { totals, cohorts, activity } = data;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin overview</h1>
          <p className="muted">Platform-wide progress across all cohorts</p>
        </div>
        <div className="row gap">
          <Link className="btn ghost" to="/users">Manage users</Link>
          <Link className="btn primary" to="/cohorts">Manage cohorts</Link>
        </div>
      </div>
      <div className="stats">
        <StatCard label="Students" value={totals.students} />
        <StatCard label="Mentors" value={totals.mentors} />
        <StatCard label="Cohorts" value={totals.cohorts} />
        <StatCard label="Assignments" value={totals.assignments} />
        <StatCard label="Submissions" value={totals.submissions} />
      </div>
      <div className="grid-2">
        <section className="card">
          <h3>Cohort comparison</h3>
          {cohorts.length ? <CompletionChart data={cohorts} xKey="name" /> : <Empty>No cohorts yet.</Empty>}
        </section>
        <section className="card">
          <h3>Coding activity · last 30 days</h3>
          <ActivityChart data={activity} />
        </section>
      </div>
      <section className="card">
        <h3>Cohorts</h3>
        <table>
          <thead>
            <tr><th>Cohort</th><th>Students</th><th>Assignments</th><th>Completion</th><th>Avg score</th><th /></tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c._id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.students}</td>
                <td>{c.assignments}</td>
                <td className="cell-progress"><Progress value={c.completionRate} /> {c.completionRate}%</td>
                <td>{c.avgScore}%</td>
                <td className="right"><Link to={`/cohorts/${c._id}`}>View analytics →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
