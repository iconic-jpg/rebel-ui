import React from "react";
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
import { ThemeProvider } from './components/context/ThemeContext.js'
import KeyRotationPanel from "./components/Modules/KeyRotationPanel.js";

const API_BASE = "https://r3bel-production.up.railway.app";


export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={<AppShell />}>
            <Route index element={<RebelDashboard />} />
            <Route path="inventory" element={<AssetInventoryPage />} />
            <Route path="discovery" element={<AssetDiscoveryPage />} />
            <Route path="registry" element={<AssetRegistryPage />} />

            <Route path="cbom" element={<CBOMPage />} />
            <Route path="pqc" element={<PQCPosturePage />} />
            <Route path="pqc-readiness" element={<PQCReadinessPage />} />
            <Route path="rating" element={<CyberRatingPage />} />
            <Route path="reporting" element={<ReportingPage />} />

            <Route path="key-rotation" element={<KeyRotationPanel apiBase={API_BASE} assets={[]} />} />

            <Route path="settings/assets" element={<AssetRegistryPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}