import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NewTraining from "./pages/NewTraining";
import TrainingDetail from "./pages/TrainingDetail";
import TrainingSummary from "./pages/TrainingSummary";
import Stats from "./pages/Stats";
import ParcoursList from "./pages/Parcours";
import NewParcours from "./pages/NewParcours";
import ParcoursDetail from "./pages/ParcoursDetail";
import Profile from "./pages/Profile";
import HelpHub from "./pages/Help";
import HelpGettingStarted from "./pages/help/HelpGettingStarted";
import HelpDisciplines from "./pages/help/HelpDisciplines";
import HelpScoring from "./pages/help/HelpScoring";
import HelpPegs from "./pages/help/HelpPegs";
import HelpBows from "./pages/help/HelpBows";
import HelpGlossary from "./pages/help/HelpGlossary";
import HelpApp from "./pages/help/HelpApp";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-forest-700">Lade…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Hauptbereich */}
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/trainings/new" element={<RequireAuth><NewTraining /></RequireAuth>} />
        <Route path="/trainings/:id" element={<RequireAuth><TrainingDetail /></RequireAuth>} />
        <Route path="/trainings/:id/summary" element={<RequireAuth><TrainingSummary /></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><Stats /></RequireAuth>} />
        <Route path="/parcours" element={<RequireAuth><ParcoursList /></RequireAuth>} />
        <Route path="/parcours/new" element={<RequireAuth><NewParcours /></RequireAuth>} />
        <Route path="/parcours/:id" element={<RequireAuth><ParcoursDetail /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Hilfe */}
        <Route path="/help" element={<RequireAuth><HelpHub /></RequireAuth>}>
          <Route path="getting-started" element={<HelpGettingStarted />} />
          <Route path="disciplines" element={<HelpDisciplines />} />
          <Route path="scoring" element={<HelpScoring />} />
          <Route path="pegs" element={<HelpPegs />} />
          <Route path="bows" element={<HelpBows />} />
          <Route path="glossary" element={<HelpGlossary />} />
          <Route path="app" element={<HelpApp />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
