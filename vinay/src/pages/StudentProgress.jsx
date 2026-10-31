import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { ActivityChart, ScoreChart } from '../components/Charts.jsx';
import { Badge, Empty, ErrorBox, fmtDate, Loader, Progress, StatCard } from '../components/ui.jsx';

export default function StudentProgress() {
  const { id = 'me' } = useParams();
  const { user } = useAuth();
  const { data, loading, error } = useFetch(`/analytics/student/${id}`);
  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} />;

  const { student, summary, assignments, activity } = data;
  const isSelf = user._id === student._id;
  const upcoming = assignments.filter((a) => a.status === 'pending');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isSelf ? `Hi, ${student.name.split(' ')[0]}` : student.name}</h1>
          <p className="muted">
            {student.cohort ? student.cohort.name : 'Not assigned to a cohort yet'}
            {!isSelf && ` · ${student.email}`}
          </p>
        </div>
        {!isSelf && student.cohort && <Link className="btn ghost" to={`/cohorts/${student.cohort._id}`}>← Cohort</Link>}
      </div>

      <div className="stats">
        <StatCard label="Completion" value={`${summary.completionRate}%`} hint={`${summary.completed} of ${summary.assignments} assignments`} />
        <StatCard label="Average score" value={summary.completed ? `${summary.avgScore}%` : '—'} />
        <StatCard label="Pending" value={upcoming.length} />
        <StatCard label="Missed" value={summary.missed} tone={summary.missed ? 'danger' : ''} />
        <StatCard label="Total attempts" value={summary.attempts} />
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Scores by assignment</h3>
          {summary.completed ? <ScoreChart data={assignments} /> : <Empty>No submissions yet.</Empty>}
        </section>
        <section className="card">
          <h3>Coding activity · last 30 days</h3>
          <ActivityChart data={activity} />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Assignments</h3>
          <div className="cell-progress wide"><Progress value={summary.completionRate} /> {summary.completionRate}% complete</div>
        </div>
        {assignments.length === 0 ? (
          <Empty>No assignments yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Assignment</th><th>Difficulty</th><th>Due</th><th>Status</th><th>Tests</th><th>Score</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a._id}>
                    <td><Link to={`/assignments/${a._id}`}>{a.title}</Link></td>
                    <td><Badge>{a.difficulty}</Badge></td>
                    <td>{fmtDate(a.dueDate)}</td>
                    <td><Badge>{a.status}</Badge></td>
                    <td>{a.total ? `${a.passed}/${a.total}` : '—'}</td>
                    <td>{a.score !== null ? `${a.score}/${a.maxScore}` : '—'}</td>
                    <td className="muted small">{a.feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
