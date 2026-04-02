import { useState, useEffect } from "react";
function getInitialTheme() {
    const stored = localStorage.getItem("theme");
    if (stored)
        return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
}
export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);
    const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));
    return { theme, toggle };
}
