import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import { PageSpinner } from "./components/Spinner";

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
import Join from "./pages/Join";
import EmailSettings from "./pages/EmailSettings";
import Welcome from "./pages/Welcome";

// Lazy: Pages mit schweren Deps werden erst geladen wenn die Route besucht wird
const TrainingSummary = lazy(() => import("./pages/TrainingSummary"));   // Recharts
const Stats           = lazy(() => import("./pages/Stats"));              // Recharts
const ParcoursList    = lazy(() => import("./pages/Parcours"));           // Leaflet
const NewParcours     = lazy(() => import("./pages/NewParcours"));        // Leaflet
const ParcoursDetail  = lazy(() => import("./pages/ParcoursDetail"));     // Leaflet
const ParcoursEdit    = lazy(() => import("./pages/ParcoursEdit"));       // Leaflet
const ParcoursLanes   = lazy(() => import("./pages/ParcoursLanes"));      // Bahnen-Verwaltung
const Bows            = lazy(() => import("./pages/Bows"));               // Bow-Profile-Manager
const BowEdit         = lazy(() => import("./pages/BowEdit"));            // Bow-Form (new + edit)
const Arrows          = lazy(() => import("./pages/Arrows"));             // Pfeil-Set-Manager
const ArrowEdit       = lazy(() => import("./pages/ArrowEdit"));          // Pfeil-Set-Form (new + edit)
const Equipment       = lazy(() => import("./pages/Equipment"));          // Sehnen/Tabs/Releases/Sonstiges
const EquipmentEdit   = lazy(() => import("./pages/EquipmentEdit"));      // Equipment-Form (new + edit)
const Friends         = lazy(() => import("./pages/Friends"));            // Freundschafts-Verwaltung
const TrainingArchive = lazy(() => import("./pages/TrainingArchive"));    // Archivierte Trainings
const Admin           = lazy(() => import("./pages/Admin"));              // User-Verwaltung (admin-only)

function RequireAuth({ children, skipOnboardingGate }: { children: JSX.Element; skipOnboardingGate?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  // Onboarding-Gate: User ohne abgeschlossenes Onboarding → /welcome.
  // skipOnboardingGate erlaubt /welcome selbst sich zu rendern + e-mail-settings deep-link.
  // Gäste (role='guest') überspringen Onboarding — sie kommen per QR-Link rein.
  if (
    !skipOnboardingGate
    && user.role !== "guest"
    && !user.onboarding_completed_at
  ) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
}

function LazyFallback() {
  return <PageSpinner />;
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
        <Route path="/email-settings" element={<EmailSettings />} />
        <Route path="/welcome" element={<RequireAuth skipOnboardingGate><Welcome /></RequireAuth>} />

        {/* Hauptbereich */}
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/trainings/new" element={<RequireAuth><NewTraining /></RequireAuth>} />
        <Route path="/trainings/:id" element={<RequireAuth><TrainingDetail /></RequireAuth>} />
        <Route path="/trainings/:id/summary" element={<RequireAuth><L><TrainingSummary /></L></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><L><Stats /></L></RequireAuth>} />
        <Route path="/parcours" element={<RequireAuth><L><ParcoursList /></L></RequireAuth>} />
        <Route path="/parcours/new" element={<RequireAuth><L><NewParcours /></L></RequireAuth>} />
        <Route path="/parcours/:id" element={<RequireAuth><L><ParcoursDetail /></L></RequireAuth>} />
        <Route path="/parcours/:id/edit" element={<RequireAuth><L><ParcoursEdit /></L></RequireAuth>} />
        <Route path="/parcours/:id/lanes" element={<RequireAuth><L><ParcoursLanes /></L></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/bows" element={<RequireAuth><L><Bows /></L></RequireAuth>} />
        <Route path="/bows/new" element={<RequireAuth><L><BowEdit mode="new" /></L></RequireAuth>} />
        <Route path="/bows/:id/edit" element={<RequireAuth><L><BowEdit mode="edit" /></L></RequireAuth>} />
        <Route path="/arrows" element={<RequireAuth><L><Arrows /></L></RequireAuth>} />
        <Route path="/arrows/new" element={<RequireAuth><L><ArrowEdit mode="new" /></L></RequireAuth>} />
        <Route path="/arrows/:id/edit" element={<RequireAuth><L><ArrowEdit mode="edit" /></L></RequireAuth>} />
        <Route path="/equipment" element={<RequireAuth><L><Equipment /></L></RequireAuth>} />
        <Route path="/equipment/new" element={<RequireAuth><L><EquipmentEdit mode="new" /></L></RequireAuth>} />
        <Route path="/equipment/:id/edit" element={<RequireAuth><L><EquipmentEdit mode="edit" /></L></RequireAuth>} />
        <Route path="/friends" element={<RequireAuth><L><Friends /></L></RequireAuth>} />
        <Route path="/trainings/archive" element={<RequireAuth><L><TrainingArchive /></L></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><L><Admin /></L></RequireAuth>} />

        {/* Hilfe (Accordion + Suche auf einer Page; Deep-Links via #anchor) */}
        <Route path="/help" element={<RequireAuth><HelpHub /></RequireAuth>} />
        <Route path="/help/:section" element={<RequireAuth><HelpHub /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
