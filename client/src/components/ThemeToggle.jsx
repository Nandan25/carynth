import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative inline-flex h-8 w-14 items-center rounded-full border border-border dark:border-border-dark bg-white dark:bg-surface-dark transition-colors"
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-accent transition-transform ${
          isDark ? "translate-x-7" : "translate-x-1"
        } flex items-center justify-center text-[11px]`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
