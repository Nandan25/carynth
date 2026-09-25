import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const linkBase =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const linkActive = "bg-accent-soft text-accent dark:bg-accent/20 dark:text-accent-light";
const linkInactive =
  "text-muted hover:bg-black/5 dark:text-muted-dark dark:hover:bg-white/5";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border dark:border-border-dark bg-white dark:bg-surface-dark px-4 py-5">
      <div className="mb-8 px-2">
        <span className="font-display text-xl font-semibold">Resumly</span>
      </div>

      <nav className="flex-1 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/templates"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Templates
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Settings
        </NavLink>
      </nav>

      <div className="space-y-3 border-t border-border dark:border-border-dark pt-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted dark:text-muted-dark">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-black/5 dark:text-muted-dark dark:hover:bg-white/5"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
