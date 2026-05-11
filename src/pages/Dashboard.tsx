import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-2">
        Willkommen, {user?.display_name ?? user?.email}
      </h1>
      <p className="text-archer-700">
        Das Grundgerüst steht. Trainings-/Score-Erfassung kommt im nächsten Schritt.
      </p>
    </div>
  );
}
