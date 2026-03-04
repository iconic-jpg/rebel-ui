import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RebelDashboard from "./components/RebelDashboard/RebelDashboard.js";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RebelDashboard />} />
      </Routes>
    </Router>
  );
}