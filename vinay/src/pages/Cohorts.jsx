import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { Empty, ErrorBox, fmtDate, Loader } from '../components/ui.jsx';

export default function Cohorts() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { data: cohorts, loading, error, reload } = useFetch('/cohorts');
  const { data: mentors } = useFetch(isAdmin ? '/users?role=mentor' : null);
  const [editing, setEditing] = useState(null); // null | 'new' | cohort

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.name}? Its assignments and submissions will be removed and students unassigned.`)) return;
    await api.del(`/cohorts/${c._id}`);
    reload();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cohorts</h1>
          <p className="muted">{isAdmin ? 'Create cohorts and assign mentors' : 'Cohorts you mentor'}</p>
        </div>
        {isAdmin && <button className="btn primary" onClick={() => setEditing('new')}>+ New cohort</button>}
      </div>
      {editing && (
        <CohortForm
          cohort={editing === 'new' ? null : editing}
          mentors={mentors || []}
          onDone={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox error={error} />
      ) : cohorts.length === 0 ? (
        <Empty>No cohorts yet.</Empty>
      ) : (
        <div className="assignment-grid">
          {cohorts.map((c) => (
            <div key={c._id} className="card">
              <h3>{c.name}</h3>
              <p className="muted">{c.description || 'No description'}</p>
              <p className="small">
                <strong>{c.studentCount}</strong> students · started {fmtDate(c.startDate)}
              </p>
              <p className="small muted">Mentors: {c.mentors.map((m) => m.name).join(', ') || 'none'}</p>
              <div className="row gap">
                <Link className="btn primary sm" to={`/cohorts/${c._id}`}>Analytics</Link>
                {isAdmin && (
                  <>
                    <button className="btn ghost sm" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn danger sm" onClick={() => remove(c)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CohortForm({ cohort, mentors, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: cohort?.name || '',
    description: cohort?.description || '',
    startDate: (cohort?.startDate || new Date().toISOString()).slice(0, 10),
    mentors: cohort?.mentors.map((m) => m._id) || [],
  });
  const [error, setError] = useState('');

  const toggleMentor = (id) =>
    setForm({ ...form, mentors: form.mentors.includes(id) ? form.mentors.filter((m) => m !== id) : [...form.mentors, id] });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (cohort) await api.put(`/cohorts/${cohort._id}`, form);
      else await api.post('/cohorts', form);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{cohort ? `Edit ${cohort.name}` : 'New cohort'}</h3>
      <ErrorBox error={error} />
      <div className="grid-2">
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
      </div>
      <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div>
        <div className="label">Mentors</div>
        <div className="row gap wrap">
          {mentors.length === 0 && <span className="muted small">No mentors yet. Create one on the Users page.</span>}
          {mentors.map((m) => (
            <label key={m._id} className="chip">
              <input type="checkbox" checked={form.mentors.includes(m._id)} onChange={() => toggleMentor(m._id)} /> {m.name}
            </label>
          ))}
        </div>
      </div>
      <div className="row end gap">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary">{cohort ? 'Save' : 'Create cohort'}</button>
      </div>
    </form>
  );
}
