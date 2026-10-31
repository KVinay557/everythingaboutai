import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Badge } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'mentor', 'student'], end: true },
  { to: '/assignments', label: 'Assignments', roles: ['admin', 'mentor', 'student'] },
  { to: '/cohorts', label: 'Cohorts', roles: ['admin', 'mentor'] },
  { to: '/students/me', label: 'My Progress', roles: ['student'] },
  { to: '/users', label: 'Users', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">SP</span> Student Progress Tracker
        </div>
        <nav>
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span className="user-name">{user.name}</span>
          <Badge>{user.role}</Badge>
          <button className="btn ghost sm" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
