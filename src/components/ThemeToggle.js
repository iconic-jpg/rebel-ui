import { jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from "../hooks/useTheme.js";
export function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (_jsx("button", { onClick: toggle, "aria-label": `Switch to ${theme === "dark" ? "light" : "dark"} mode`, title: `Switch to ${theme === "dark" ? "light" : "dark"} mode`, style: { fontSize: "1.2rem", padding: "0.4em 0.7em" }, children: theme === "dark" ? "☀️" : "🌙" }));
}
