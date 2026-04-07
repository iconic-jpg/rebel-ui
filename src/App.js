import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import RebelDashboard from "./components/RebelDashboard/RebelDashboard.js";
import Login from "./components/Auth/Login.js";
import Signup from "./components/Auth/Signup.js";
import AppShell from "./components/Shell/AppShell.js";
import AssetInventoryPage from "./components/Modules/AssetInventory.js";
import AssetRegistryPage from "./components/Modules/AssetRegistryPage.js";
import AssetDiscoveryPage from "./components/Modules/AssetDiscovery.js";
import CBOMPage from "./components/Modules/CBOM.js";
import PQCPosturePage from "./components/Modules/PQCPosture.js";
import PQCReadinessPage from "./components/Modules/PQCReadiness.js";
import CyberRatingPage from "./components/Modules/CyberRating.js";
import ReportingPage from "./components/Modules/Reporting.js";
import { ThemeProvider } from './components/context/ThemeContext.js';
import KeyRotationPanel from "./components/Modules/KeyRotationPanel.js";
export default function App() {
    return (_jsx(ThemeProvider, { children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/signup", element: _jsx(Signup, {}) }), _jsxs(Route, { path: "/", element: _jsx(AppShell, {}), children: [_jsx(Route, { index: true, element: _jsx(RebelDashboard, {}) }), _jsx(Route, { path: "inventory", element: _jsx(AssetInventoryPage, {}) }), _jsx(Route, { path: "discovery", element: _jsx(AssetDiscoveryPage, {}) }), _jsx(Route, { path: "registry", element: _jsx(AssetRegistryPage, {}) }), _jsx(Route, { path: "cbom", element: _jsx(CBOMPage, {}) }), _jsx(Route, { path: "pqc", element: _jsx(PQCPosturePage, {}) }), _jsx(Route, { path: "pqc-readiness", element: _jsx(PQCReadinessPage, {}) }), _jsx(Route, { path: "rating", element: _jsx(CyberRatingPage, {}) }), _jsx(Route, { path: "reporting", element: _jsx(ReportingPage, {}) }), _jsx(Route, { path: "/key-rotation", element: _jsx(KeyRotationPanel, {}) }), _jsx(Route, { path: "settings/assets", element: _jsx(AssetRegistryPage, {}) })] })] }) }) }));
}
