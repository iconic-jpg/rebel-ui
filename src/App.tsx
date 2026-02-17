import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Chat from "./components/Chat/Chat";
import SecurityDashboard from "./components/SecurityDashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/security-dashboard" element={<SecurityDashboard />} />
      </Routes>
    </Router>
  );
}
