import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useFetch } from '../useFetch.js';
import { Badge, ErrorBox, Loader } from '../components/ui.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useFetch('/users');
  const { data: cohorts } = useFetch('/cohorts');
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState('');

  const rows = useMemo(
    () =>
      (users || []).filter(
        (u) => (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [users, role, q]
  );

  const update = async (u, patch) => {
    setActionError('');
    try {
      await api.put(`/users/${u._id}`, patch);
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This also removes their submissions.`)) return;
    try {
      await api.del(`/users/${u._id}`);
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Manage roles and cohort membership</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ Add user'}</button>
      </div>
      {showForm && <UserForm cohorts={cohorts || []} onDone={() => { setShowForm(false); reload(); }} />}
      <section className="card">
        <div className="card-head">
          <input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="mentor">Mentors</option>
            <option value="student">Students</option>
          </select>
        </div>
        <ErrorBox error={actionError} />
        {loading ? (
          <Loader />
        ) : error ? (
          <ErrorBox error={error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cohort</th><th /></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u._id}>
                    <td>
                      {u.role === 'student' ? <Link to={`/students/${u._id}`}>{u.name}</Link> : u.name}
                      {u._id === me._id && <span className="muted small"> (you)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u._id === me._id ? (
                        <Badge>{u.role}</Badge>
                      ) : (
                        <select value={u.role} onChange={(e) => update(u, { role: e.target.value, cohort: e.target.value === 'student' ? u.cohort?._id : null })}>
                          <option value="student">student</option>
                          <option value="mentor">mentor</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {u.role === 'student' ? (
                        <select value={u.cohort?._id || ''} onChange={(e) => update(u, { cohort: e.target.value })}>
                          <option value="">— none —</option>
                          {cohorts?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="right">
                      {u._id !== me._id && <button className="btn danger sm" onClick={() => remove(u)}>Delete</button>}
                    </td>
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

function UserForm({ cohorts, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', cohort: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>Add user</h3>
      <ErrorBox error={error} />
      <div className="grid-3">
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Temporary password<input required minLength={6} value={form.password} onChange={set('password')} /></label>
        <label>
          Role
          <select value={form.role} onChange={set('role')}>
            <option value="student">Student</option>
            <option value="mentor">Mentor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {form.role === 'student' && (
          <label>
            Cohort
            <select value={form.cohort} onChange={set('cohort')}>
              <option value="">— none —</option>
              {cohorts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="row end"><button className="btn primary">Create user</button></div>
    </form>
  );
}
