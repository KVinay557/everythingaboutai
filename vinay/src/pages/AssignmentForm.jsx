import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { ErrorBox, Loader } from '../components/ui.jsx';

const blank = {
  title: '',
  description: '',
  difficulty: 'easy',
  cohort: '',
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  maxScore: 100,
  starterCode: 'function solve(input) {\n  // your code here\n}\n',
  testCases: [{ input: '[1]', expected: '1', hidden: false }],
};

export default function AssignmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: cohorts } = useFetch('/cohorts');
  const { data: existing, loading } = useFetch(id ? `/assignments/${id}` : null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [testOutput, setTestOutput] = useState(null);

  useEffect(() => {
    if (existing) {
      setForm({ ...existing, cohort: existing.cohort?._id || existing.cohort, dueDate: existing.dueDate.slice(0, 10) });
    }
  }, [existing]);
  useEffect(() => {
    if (!id && cohorts?.length && !form.cohort) setForm((f) => ({ ...f, cohort: cohorts[0]._id }));
  }, [cohorts, id, form.cohort]);

  if (id && loading) return <Loader />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setCase = (i, k, v) => setForm({ ...form, testCases: form.testCases.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  const addCase = () => setForm({ ...form, testCases: [...form.testCases, { input: '', expected: '', hidden: false }] });
  const removeCase = (i) => setForm({ ...form, testCases: form.testCases.filter((_, j) => j !== i) });

  const payload = () => ({
    title: form.title, description: form.description, difficulty: form.difficulty, cohort: form.cohort,
    dueDate: form.dueDate, maxScore: Number(form.maxScore), starterCode: form.starterCode, testCases: form.testCases,
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = id ? await api.put(`/assignments/${id}`, payload()) : await api.post('/assignments', payload());
      navigate(`/assignments/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  // Lets mentors check test cases against a reference solution (only when editing a saved assignment).
  const checkStarter = async () => {
    try {
      setTestOutput(await api.post(`/assignments/${id}/run`, { code: form.starterCode }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{id ? 'Edit assignment' : 'New programming assignment'}</h1>
          <p className="muted">Students write a JavaScript <code>solve(...)</code> function that is auto-tested against your test cases.</p>
        </div>
        <Link className="btn ghost" to={id ? `/assignments/${id}` : '/assignments'}>Cancel</Link>
      </div>
      <form className="card form" onSubmit={submit}>
        <ErrorBox error={error} />
        <div className="grid-2">
          <label>Title<input required value={form.title} onChange={set('title')} /></label>
          <label>
            Cohort
            <select required value={form.cohort} onChange={set('cohort')}>
              {cohorts?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <label>Problem description<textarea required rows={5} value={form.description} onChange={set('description')} /></label>
        <div className="grid-3">
          <label>
            Difficulty
            <select value={form.difficulty} onChange={set('difficulty')}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>Due date<input type="date" required value={form.dueDate} onChange={set('dueDate')} /></label>
          <label>Max score<input type="number" min={1} required value={form.maxScore} onChange={set('maxScore')} /></label>
        </div>
        <label>
          Starter code
          <textarea className="code short" spellCheck={false} value={form.starterCode} onChange={set('starterCode')} />
        </label>
        {id && (
          <div className="row gap">
            <button type="button" className="btn ghost sm" onClick={checkStarter}>Run code above against saved tests</button>
            {testOutput && <span className="small">{testOutput.passed}/{testOutput.total} passed</span>}
          </div>
        )}

        <div className="card-head">
          <h3>Test cases</h3>
          <button type="button" className="btn ghost sm" onClick={addCase}>+ Add test case</button>
        </div>
        <p className="muted small">
          Input is a JSON array of arguments passed to <code>solve</code>, e.g. <code>[[1,2,3], 5]</code>. Expected is a JSON value, e.g. <code>"abc"</code> or <code>[0,1]</code>.
          Hidden tests are only run on submit and their details are not shown to students.
        </p>
        <div className="testcases">
          {form.testCases.map((t, i) => (
            <div className="testcase" key={i}>
              <span className="muted">#{i + 1}</span>
              <input placeholder="Input, e.g. [2, 3]" required value={t.input} onChange={(e) => setCase(i, 'input', e.target.value)} />
              <input placeholder="Expected, e.g. 5" required value={t.expected} onChange={(e) => setCase(i, 'expected', e.target.value)} />
              <label className="inline">
                <input type="checkbox" checked={t.hidden} onChange={(e) => setCase(i, 'hidden', e.target.checked)} /> Hidden
              </label>
              <button type="button" className="btn ghost sm" onClick={() => removeCase(i)} aria-label="Remove test case">✕</button>
            </div>
          ))}
        </div>
        <div className="row end">
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create assignment'}</button>
        </div>
      </form>
    </>
  );
}
