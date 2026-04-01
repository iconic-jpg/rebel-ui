import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{ fontSize: "1.2rem", padding: "0.4em 0.7em" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}