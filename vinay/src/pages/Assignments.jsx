import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useFetch } from '../useFetch.js';
import { Badge, Empty, ErrorBox, fmtDate, Loader } from '../components/ui.jsx';

export default function Assignments() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const { data: cohorts } = useFetch(isStudent ? null : '/cohorts');
  const [cohort, setCohort] = useState('');
  const { data, loading, error } = useFetch(`/assignments${cohort ? `?cohort=${cohort}` : ''}`);
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    if (!data) return [];
    if (!isStudent || filter === 'all') return data;
    return data.filter((a) => studentStatus(a) === filter);
  }, [data, filter, isStudent]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assignments</h1>
          <p className="muted">{isStudent ? 'Programming assignments for your cohort' : 'Create, review and grade coding assignments'}</p>
        </div>
        <div className="row gap">
          {isStudent ? (
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="missed">Missed</option>
            </select>
          ) : (
            <>
              <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
                <option value="">All cohorts</option>
                {cohorts?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <Link className="btn primary" to="/assignments/new">+ New assignment</Link>
            </>
          )}
        </div>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox error={error} />
      ) : rows.length === 0 ? (
        <Empty>No assignments found.</Empty>
      ) : (
        <div className="assignment-grid">
          {rows.map((a) => (
            <Link key={a._id} to={`/assignments/${a._id}`} className="card assignment-card">
              <div className="row between">
                <Badge>{a.difficulty}</Badge>
                {isStudent ? <Badge>{studentStatus(a)}</Badge> : <span className="muted small">{a.cohort?.name}</span>}
              </div>
              <h3>{a.title}</h3>
              <p className="muted clamp">{a.description}</p>
              <div className="row between small">
                <span className={new Date(a.dueDate) < new Date() ? 'text-red' : 'muted'}>Due {fmtDate(a.dueDate)}</span>
                {isStudent ? (
                  <span>
                    {a.submission ? `${a.submission.score ?? a.submission.autoScore}/${a.maxScore}` : `${a.maxScore} pts`}
                  </span>
                ) : (
                  <span>{a.submitted} submitted · {a.submitted - a.graded} to grade</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function studentStatus(a) {
  if (a.submission) return a.submission.status;
  return new Date(a.dueDate) < new Date() ? 'missed' : 'pending';
}
