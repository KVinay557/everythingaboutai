import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../useFetch.js';
import { ActivityChart, CompletionChart } from '../components/Charts.jsx';
import { Badge, Empty, ErrorBox, fmtDate, Loader, Progress, StatCard } from '../components/ui.jsx';

export default function CohortAnalytics() {
  const { id } = useParams();
  return <CohortView id={id} showTitle />;
}

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  completion: (a, b) => b.completionRate - a.completionRate,
  score: (a, b) => b.avgScore - a.avgScore,
  risk: (a, b) => Number(b.atRisk) - Number(a.atRisk) || a.avgScore - b.avgScore,
};

export function CohortView({ id, showTitle }) {
  const { data, loading, error } = useFetch(`/analytics/cohort/${id}`);
  const [sort, setSort] = useState('risk');
  const students = useMemo(() => (data ? [...data.perStudent].sort(SORTS[sort]) : []), [data, sort]);

  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} />;
  const { cohort, summary, perAssignment, activity } = data;

  return (
    <>
      {showTitle && (
        <div className="page-head">
          <div>
            <h1>{cohort.name}</h1>
            <p className="muted">
              {cohort.description} · Mentors: {cohort.mentors.map((m) => m.name).join(', ') || 'none'}
            </p>
          </div>
          <Link className="btn ghost" to="/cohorts">← All cohorts</Link>
        </div>
      )}
      <div className="stats">
        <StatCard label="Students" value={summary.students} />
        <StatCard label="Assignments" value={summary.assignments} />
        <StatCard label="Completion rate" value={`${summary.completionRate}%`} hint={`${summary.submissions} submissions`} />
        <StatCard label="Average score" value={`${summary.avgScore}%`} />
        <StatCard label="Pending grading" value={summary.pendingGrading} tone={summary.pendingGrading ? 'warn' : ''} />
        <StatCard label="At-risk students" value={summary.atRisk} tone={summary.atRisk ? 'danger' : ''} />
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Assignment completion &amp; scores</h3>
          {perAssignment.length ? <CompletionChart data={perAssignment} /> : <Empty>No assignments yet.</Empty>}
        </section>
        <section className="card">
          <h3>Coding activity · last 30 days</h3>
          <ActivityChart data={activity} />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Students</h3>
          <label className="inline">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="risk">At risk first</option>
              <option value="score">Average score</option>
              <option value="completion">Completion</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        {students.length === 0 ? (
          <Empty>No students in this cohort.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Completed</th><th>Completion</th><th>Avg score</th><th>Attempts</th><th>Missed</th><th>Last active</th><th /></tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className={s.atRisk ? 'row-risk' : ''}>
                    <td>
                      <strong>{s.name}</strong> {s.atRisk && <Badge>at risk</Badge>}
                      <div className="muted small">{s.email}</div>
                    </td>
                    <td>{s.completed}/{summary.assignments}</td>
                    <td className="cell-progress"><Progress value={s.completionRate} /> {s.completionRate}%</td>
                    <td>{s.completed ? `${s.avgScore}%` : '—'}</td>
                    <td>{s.attempts}</td>
                    <td>{s.missed}</td>
                    <td>{fmtDate(s.lastActive)}</td>
                    <td className="right"><Link to={`/students/${s._id}`}>Details →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">A student is flagged at risk if they missed 2+ past-due assignments, average below 50%, or have been inactive for 14+ days.</p>
      </section>

      <section className="card">
        <h3>Assignments</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Assignment</th><th>Due</th><th>Submitted</th><th>Graded</th><th>Completion</th><th>Avg score</th></tr>
            </thead>
            <tbody>
              {perAssignment.map((a) => (
                <tr key={a._id}>
                  <td><Link to={`/assignments/${a._id}`}>{a.title}</Link></td>
                  <td>{fmtDate(a.dueDate)}</td>
                  <td>{a.submitted}/{summary.students}</td>
                  <td>{a.graded}/{a.submitted}</td>
                  <td className="cell-progress"><Progress value={a.completionRate} /> {a.completionRate}%</td>
                  <td>{a.submitted ? `${a.avgScore}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
