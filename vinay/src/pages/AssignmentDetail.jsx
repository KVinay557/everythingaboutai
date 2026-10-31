import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { Badge, Empty, ErrorBox, fmtDate, fmtDateTime, Loader } from '../components/ui.jsx';

export default function AssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: a, loading, error, reload } = useFetch(`/assignments/${id}`);
  if (loading) return <Loader />;
  if (error) return <ErrorBox error={error} />;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row gap"><Badge>{a.difficulty}</Badge><span className="muted small">{a.cohort?.name}</span></div>
          <h1>{a.title}</h1>
          <p className="muted">Due {fmtDate(a.dueDate)} · {a.maxScore} points · by {a.createdBy?.name}</p>
        </div>
        <Link className="btn ghost" to="/assignments">← Assignments</Link>
      </div>
      <section className="card">
        <h3>Problem</h3>
        <p className="prewrap">{a.description}</p>
        <TestCaseTable cases={a.testCases} />
        {a.hiddenTestCount > 0 && <p className="muted small">+ {a.hiddenTestCount} hidden test case(s) run on submit.</p>}
      </section>
      {user.role === 'student' ? <Solver assignment={a} onSubmitted={reload} /> : <MentorPanel assignment={a} />}
    </>
  );
}

function TestCaseTable({ cases }) {
  if (!cases?.length) return null;
  return (
    <table className="compact">
      <thead><tr><th>#</th><th>Input (arguments)</th><th>Expected</th><th /></tr></thead>
      <tbody>
        {cases.map((t, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td><code>{t.input}</code></td>
            <td><code>{t.expected}</code></td>
            <td>{t.hidden && <Badge>hidden</Badge>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Solver({ assignment, onSubmitted }) {
  const sub = assignment.submission;
  const [code, setCode] = useState(sub?.code || assignment.starterCode);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const call = async (kind) => {
    setBusy(kind);
    setError('');
    try {
      const res = await api.post(`/assignments/${assignment._id}/${kind}`, { code });
      setResult({ kind, ...res, ...(res.submission ? { passed: res.submission.passed, total: res.submission.total } : {}) });
      if (kind === 'submit') onSubmitted();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = e.target;
      const next = code.slice(0, s) + '  ' + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => e.target.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="grid-2 solver">
      <section className="card">
        <div className="card-head">
          <h3>Your solution <span className="muted small">(JavaScript)</span></h3>
          <div className="row gap">
            <button className="btn ghost" disabled={!!busy} onClick={() => call('run')}>{busy === 'run' ? 'Running…' : 'Run tests'}</button>
            <button className="btn primary" disabled={!!busy} onClick={() => call('submit')}>{busy === 'submit' ? 'Submitting…' : sub ? 'Resubmit' : 'Submit'}</button>
          </div>
        </div>
        <textarea className="code" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKeyDown} />
        <ErrorBox error={error} />
      </section>
      <section className="card">
        {sub && (
          <div className="submission-summary">
            <h3>Latest submission</h3>
            <div className="row gap wrap">
              <Badge>{sub.status}</Badge>
              <span>Tests: {sub.passed}/{sub.total}</span>
              <span>Auto score: {sub.autoScore}/{assignment.maxScore}</span>
              {sub.score !== null && <strong>Final: {sub.score}/{assignment.maxScore}</strong>}
              <span className="muted small">Attempt {sub.attempts} · {fmtDateTime(sub.submittedAt)}</span>
            </div>
            {sub.feedback && <div className="feedback"><strong>Mentor feedback:</strong> {sub.feedback}</div>}
          </div>
        )}
        <h3>{result ? (result.kind === 'run' ? 'Test run (visible tests)' : 'Submission results') : 'Results'}</h3>
        {!result ? (
          <Empty>Run your code to see test results.</Empty>
        ) : (
          <>
            <div className={`result-banner ${result.passed === result.total ? 'ok' : 'bad'}`}>
              {result.passed}/{result.total} tests passed
            </div>
            <ul className="results">
              {result.results.map((r) => (
                <li key={r.index} className={r.passed ? 'pass' : 'fail'}>
                  <div><strong>{r.passed ? '✓' : '✗'} Test {r.index + 1}</strong> {r.hidden && <Badge>hidden</Badge>}</div>
                  {!r.hidden || r.input ? (
                    <div className="small mono">
                      {r.input && <div>input: {r.input}</div>}
                      {r.expected && <div>expected: {r.expected}</div>}
                      {r.output !== undefined && <div>got: {r.output}</div>}
                      {r.error && <div className="text-red">error: {r.error}</div>}
                      {r.logs?.length > 0 && <div className="muted">console: {r.logs.join(' | ')}</div>}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function MentorPanel({ assignment }) {
  const navigate = useNavigate();
  const { data: subs, loading, error, reload } = useFetch(`/submissions?assignment=${assignment._id}`);
  const [open, setOpen] = useState(null);

  const remove = async () => {
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    await api.del(`/assignments/${assignment._id}`);
    navigate('/assignments');
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3>Submissions {subs && <span className="muted">({subs.length})</span>}</h3>
        <div className="row gap">
          <Link className="btn ghost" to={`/assignments/${assignment._id}/edit`}>Edit</Link>
          <button className="btn danger" onClick={remove}>Delete</button>
        </div>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox error={error} />
      ) : subs.length === 0 ? (
        <Empty>No submissions yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Submitted</th><th>Attempts</th><th>Tests</th><th>Auto</th><th>Final</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <SubmissionRow key={s._id} s={s} max={assignment.maxScore} open={open === s._id} onToggle={() => setOpen(open === s._id ? null : s._id)} onGraded={reload} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SubmissionRow({ s, max, open, onToggle, onGraded }) {
  const [score, setScore] = useState(s.score ?? s.autoScore);
  const [feedback, setFeedback] = useState(s.feedback);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setScore(s.score ?? s.autoScore);
    setFeedback(s.feedback);
  }, [s]);

  const grade = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.put(`/submissions/${s._id}/grade`, { score: Number(score), feedback });
      onGraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr>
        <td><Link to={`/students/${s.student._id}`}>{s.student.name}</Link></td>
        <td>{fmtDateTime(s.submittedAt)}</td>
        <td>{s.attempts}</td>
        <td>{s.passed}/{s.total}</td>
        <td>{s.autoScore}</td>
        <td>{s.score ?? '—'}</td>
        <td><Badge>{s.status}</Badge></td>
        <td className="right"><button className="btn ghost sm" onClick={onToggle}>{open ? 'Close' : s.status === 'graded' ? 'Review' : 'Grade'}</button></td>
      </tr>
      {open && (
        <tr className="expand">
          <td colSpan={8}>
            <div className="grid-2">
              <pre className="code-view">{s.code}</pre>
              <form onSubmit={grade} className="grade-form">
                <label>Score (0–{max})<input type="number" min={0} max={max} value={score} onChange={(e) => setScore(e.target.value)} /></label>
                <label>Feedback<textarea rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve…" /></label>
                <ErrorBox error={error} />
                <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save grade'}</button>
                {s.gradedBy && <p className="muted small">Last graded by {s.gradedBy.name}</p>}
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
