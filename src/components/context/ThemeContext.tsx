import { createContext, useContext } from "react";

interface ThemeContextValue {
  theme: "dark" | "light";
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);