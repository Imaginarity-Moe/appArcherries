import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";

// Eager: Auth-Pages und Haupt-Flow (Dashboard, neues Training, TrainingDetail) bleiben im Main-Bundle
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NewTraining from "./pages/NewTraining";
import TrainingDetail from "./pages/TrainingDetail";
import Profile from "./pages/Profile";
import HelpHub from "./pages/Help";
import HelpGettingStarted from "./pages/help/HelpGettingStarted";
import HelpDisciplines from "./pages/help/HelpDisciplines";
import HelpScoring from "./pages/help/HelpScoring";
import HelpPegs from "./pages/help/HelpPegs";
import HelpBows from "./pages/help/HelpBows";
import HelpGlossary from "./pages/help/HelpGlossary";
import HelpApp from "./pages/help/HelpApp";
import Join from "./pages/Join";

// Lazy: Pages mit schweren Deps werden erst geladen wenn die Route besucht wird
const TrainingSummary = lazy(() => import("./pages/TrainingSummary"));   // Recharts
const Stats           = lazy(() => import("./pages/Stats"));              // Recharts
const ParcoursList    = lazy(() => import("./pages/Parcours"));           // Leaflet
const NewParcours     = lazy(() => import("./pages/NewParcours"));        // Leaflet
const ParcoursDetail  = lazy(() => import("./pages/ParcoursDetail"));     // Leaflet
const Bows            = lazy(() => import("./pages/Bows"));               // Bow-Profile-Manager

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-forest-700">Lade…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LazyFallback() {
  return <div className="p-8 text-forest-700">Lade…</div>;
}

function L({ children }: { children: JSX.Element }) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>;
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
        <Route path="/join/:token" element={<Join />} />

        {/* Hauptbereich */}
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/trainings/new" element={<RequireAuth><NewTraining /></RequireAuth>} />
        <Route path="/trainings/:id" element={<RequireAuth><TrainingDetail /></RequireAuth>} />
        <Route path="/trainings/:id/summary" element={<RequireAuth><L><TrainingSummary /></L></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><L><Stats /></L></RequireAuth>} />
        <Route path="/parcours" element={<RequireAuth><L><ParcoursList /></L></RequireAuth>} />
        <Route path="/parcours/new" element={<RequireAuth><L><NewParcours /></L></RequireAuth>} />
        <Route path="/parcours/:id" element={<RequireAuth><L><ParcoursDetail /></L></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/bows" element={<RequireAuth><L><Bows /></L></RequireAuth>} />

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
