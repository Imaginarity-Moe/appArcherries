import { NavLink } from "react-router-dom";
import { Target, Zap } from "lucide-react";

/**
 * Tab-Switcher für den Equipment-Bereich: Meine Bögen ↔ Meine Pfeile.
 * Wird auf /bows und /arrows oben in der Liste gerendert.
 */
export default function EquipmentTabs() {
  return (
    <div className="flex rounded-xl bg-surface p-1 w-full">
      <NavLink
        to="/bows"
        end
        className={({ isActive }) =>
          `flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            isActive
              ? "bg-cherry-500 text-cream shadow-cherry"
              : "text-secondary hover:text-primary"
          }`
        }
      >
        <Target size={14} strokeWidth={1.75} />
        Bögen
      </NavLink>
      <NavLink
        to="/arrows"
        end
        className={({ isActive }) =>
          `flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            isActive
              ? "bg-cherry-500 text-cream shadow-cherry"
              : "text-secondary hover:text-primary"
          }`
        }
      >
        <Zap size={14} strokeWidth={1.75} />
        Pfeile
      </NavLink>
    </div>
  );
}
