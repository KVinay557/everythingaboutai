import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ErrorBox } from '../components/ui.jsx';

const DEMO = [
  ['Admin', 'admin@tracker.dev'],
  ['Mentor', 'mentor@tracker.dev'],
  ['Student', 'student@tracker.dev'],
];

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand center"><span className="logo">SP</span> Student Progress Tracker</div>
        <h2>Sign in</h2>
        <ErrorBox error={error} />
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted center">New student? <Link to="/register">Create an account</Link></p>
        <div className="demo">
          <div className="muted small">Demo accounts (password: password123)</div>
          <div className="row gap">
            {DEMO.map(([label, email]) => (
              <button type="button" key={email} className="btn ghost sm" onClick={() => setForm({ email, password: 'password123' })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
