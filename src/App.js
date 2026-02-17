import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Chat from "./components/Chat/Chat.js";
import SecurityDashboard from "./components/SecurityDashboard.js";
export default function App() {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Chat, {}) }), _jsx(Route, { path: "/security-dashboard", element: _jsx(SecurityDashboard, {}) })] }) }));
}
