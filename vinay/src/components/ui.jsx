export const Loader = () => <div className="loader">Loading…</div>;

export const ErrorBox = ({ error }) => (error ? <div className="alert error">{error}</div> : null);

export const StatCard = ({ label, value, hint, tone }) => (
  <div className={`stat ${tone || ''}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {hint && <div className="stat-hint">{hint}</div>}
  </div>
);

const BADGE_TONES = {
  graded: 'green', submitted: 'blue', pending: 'gray', missed: 'red', 'at risk': 'red',
  easy: 'green', medium: 'amber', hard: 'red',
  admin: 'purple', mentor: 'blue', student: 'gray',
};
export const Badge = ({ children }) => <span className={`badge ${BADGE_TONES[children] || 'gray'}`}>{children}</span>;

export const Progress = ({ value }) => (
  <div className="progress" title={`${value}%`}>
    <div className={`progress-fill ${value < 50 ? 'low' : value < 75 ? 'mid' : ''}`} style={{ width: `${value}%` }} />
  </div>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
