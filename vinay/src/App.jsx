import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assignments from './pages/Assignments.jsx';
import AssignmentDetail from './pages/AssignmentDetail.jsx';
import AssignmentForm from './pages/AssignmentForm.jsx';
import Cohorts from './pages/Cohorts.jsx';
import CohortAnalytics from './pages/CohortAnalytics.jsx';
import StudentProgress from './pages/StudentProgress.jsx';
import Users from './pages/Users.jsx';
import { Loader } from './components/ui.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="assignments/new" element={<Protected roles={['admin', 'mentor']}><AssignmentForm /></Protected>} />
        <Route path="assignments/:id" element={<AssignmentDetail />} />
        <Route path="assignments/:id/edit" element={<Protected roles={['admin', 'mentor']}><AssignmentForm /></Protected>} />
        <Route path="cohorts" element={<Protected roles={['admin', 'mentor']}><Cohorts /></Protected>} />
        <Route path="cohorts/:id" element={<Protected roles={['admin', 'mentor']}><CohortAnalytics /></Protected>} />
        <Route path="students/:id" element={<StudentProgress />} />
        <Route path="users" element={<Protected roles={['admin']}><Users /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
