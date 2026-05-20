import { NavLink } from "react-router-dom";
import { Target, Zap, Wrench } from "lucide-react";

/**
 * Tab-Switcher für den Equipment-Bereich: Bögen ↔ Pfeile ↔ Zubehör.
 * Wird auf /bows, /arrows, /equipment oben in der Liste gerendert.
 */
export default function EquipmentTabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-cherry-500 text-cream shadow-cherry" : "text-secondary hover:text-primary"
    }`;
  return (
    <div className="flex rounded-xl bg-surface p-1 w-full gap-0.5">
      <NavLink to="/bows" end className={cls}>
        <Target size={14} strokeWidth={1.75} />
        Bögen
      </NavLink>
      <NavLink to="/arrows" end className={cls}>
        <Zap size={14} strokeWidth={1.75} />
        Pfeile
      </NavLink>
      <NavLink to="/equipment" end className={cls}>
        <Wrench size={14} strokeWidth={1.75} />
        Zubehör
      </NavLink>
    </div>
  );
}
