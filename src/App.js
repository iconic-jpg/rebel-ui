import { jsx as _jsx } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RebelDashboard from "./components/RebelDashboard/RebelDashboard.js";
export default function App() {
    return (_jsx(Router, { children: _jsx(Routes, { children: _jsx(Route, { path: "/", element: _jsx(RebelDashboard, {}) }) }) }));
}
