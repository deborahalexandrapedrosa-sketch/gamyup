import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { FullPageLoader } from "./components/ui";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ParticipantLayout from "./components/layouts/ParticipantLayout";
import Dashboard from "./pages/participant/Dashboard";
import Ranking from "./pages/participant/Ranking";
import Achievements from "./pages/participant/Achievements";
import History from "./pages/participant/History";
import Scan from "./pages/participant/Scan";
import ActivityRunner from "./pages/participant/ActivityRunner";

import AdminLayout from "./components/layouts/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import ProgramPage from "./pages/admin/ProgramPage";
import TrainingPage from "./pages/admin/TrainingPage";
import ClassPage from "./pages/admin/ClassPage";
import SessionPage from "./pages/admin/SessionPage";
import PresentationPage from "./pages/admin/PresentationPage";
import UsersPage from "./pages/admin/UsersPage";
import SettingsPage from "./pages/admin/SettingsPage";

function ProtectedRoute({ role }: { role: "admin" | "participant" }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="participant" />}>
        <Route path="/app" element={<ParticipantLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="scan" element={<Scan />} />
          <Route path="a/:token" element={<ActivityRunner />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="history" element={<History />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/sessions/:id/present" element={<PresentationPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="programs/:id" element={<ProgramPage />} />
          <Route path="trainings/:id" element={<TrainingPage />} />
          <Route path="classes/:id" element={<ClassPage />} />
          <Route path="sessions/:id" element={<SessionPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
