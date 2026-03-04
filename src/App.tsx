import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import RebelDashboard from "./components/RebelDashboard/RebelDashboard";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Route */}
        <Route path="/" element={<RebelDashboard />} />
      </Routes>
    </Router>
  );
}