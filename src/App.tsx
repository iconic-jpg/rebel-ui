import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import RebelDashboard from "./components/RebelDashboard/RebelDashboard.js";
import Login from "./components/Auth/Login.js";
import Signup from "./components/Auth/Signup.js";
import AppShell from "./components/Shell/AppShell.js";
import AssetInventoryPage from "./components/Modules/AssetInventory.js";
import AssetDiscoveryPage from "./components/Modules/AssetDiscovery.js";
import CBOMPage from "./components/Modules/CBOM.js";
import PQCPosturePage from "./components/Modules/PQCPosture.js";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public — no sidebar */}
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* AppShell draws the sidebar, Outlet renders the page */}
        <Route path="/" element={<AppShell />}>
          <Route index        element={<RebelDashboard />} />
          <Route path="inventory" element={<AssetInventoryPage />} />
          <Route path="discovery" element={<AssetDiscoveryPage />} />
          <Route path="cbom"      element={<CBOMPage />} />
          <Route path="pqc"       element={<PQCPosturePage />} />
        </Route>
      </Routes>
    </Router>
  );
}