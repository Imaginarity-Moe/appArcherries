import { Crown, Shield, User as UserIcon, UserCircle } from "lucide-react";
import type { Role } from "../auth/AuthContext";

/**
 * Visuell differenziertes Badge pro Rolle.
 * - superadmin → Gold-Krone (hierarchisch oben)
 * - admin → Cherry-Schild
 * - user → Neutral (Graphit)
 * - guest → Muted-Italic (kein Account)
 */
export default function RoleBadge({
  role,
  size = "md",
  withIcon = true,
}: {
  role: Role;
  size?: "sm" | "md";
  withIcon?: boolean;
}) {
  const sz = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  const iconSize = size === "sm" ? 12 : 14;

  const variants: Record<Role, { cls: string; label: string; icon: React.ReactNode }> = {
    superadmin: {
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700",
      label: "Superadmin",
      icon: <Crown size={iconSize} strokeWidth={2} />,
    },
    admin: {
      cls: "bg-cherry-100 text-cherry-700 dark:bg-cherry-900/30 dark:text-cherry-200 border border-cherry-300 dark:border-cherry-700",
      label: "Admin",
      icon: <Shield size={iconSize} strokeWidth={2} />,
    },
    user: {
      cls: "bg-surface text-secondary border border-hairline",
      label: "User",
      icon: <UserIcon size={iconSize} strokeWidth={1.75} />,
    },
    guest: {
      cls: "bg-surface text-muted italic border border-hairline border-dashed",
      label: "Gast",
      icon: <UserCircle size={iconSize} strokeWidth={1.5} />,
    },
  };

  const v = variants[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sz} ${v.cls}`}>
      {withIcon && v.icon}
      {v.label}
    </span>
  );
}
