import React, { useState } from "react";
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
import VCenterConnect from "./components/Modules/VCenterConnect.js";
import RebelSplash from "./components/Modules/RebelSplash.js";

const API_BASE = "https://r3bel-production.up.railway.app";

// Shape that VCenterConnect passes to onAssets
export interface VCenterVM {
  name:        string;
  ip:          string | null;
  os:          string;
  cluster:     string;
  datacenter:  string;
  power_state: string;
}

export default function App() {
  // ── Global vCenter asset override ─────────────────────────────────────────
  // When the user connects vCenter and fetches assets, this is populated.
  // Any module that receives this as a prop should use it instead of /ghost/assets.
  const [vCenterAssets, setVCenterAssets] = useState<VCenterVM[]>([]);

  const hasVCenterAssets = vCenterAssets.length > 0;

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={<AppShell />}>
            <Route index element={<RebelDashboard />} />

            <Route path="inventory"  element={<AssetInventoryPage />} />
            <Route path="discovery"  element={<AssetDiscoveryPage />} />
            <Route path="registry"   element={<AssetRegistryPage />} />

            <Route path="cbom"          element={<CBOMPage />} />
            <Route path="pqc"           element={<PQCPosturePage />} />
            <Route path="/splash" element={<RebelSplash />} />

            <Route
              path="pqc-readiness"
              element={
                <PQCReadinessPage
                  vcenterAssets={hasVCenterAssets ? vCenterAssets : undefined}
                />
              }
            />
            <Route path="rating"    element={<CyberRatingPage />} />
            <Route path="reporting" element={<ReportingPage />} />

            <Route
              path="key-rotation"
              element={
                <KeyRotationPanel
                  apiBase={API_BASE}
                  assets={vCenterAssets}   // empty [] when not connected → same as before
                />
              }
            />

            {/* Connect To Infrastructure — sets the global asset override */}
            <Route
              path="vcenter"
              element={
                <VCenterConnect
                  apiBase={API_BASE}
                  onAssets={(vms) => setVCenterAssets(vms)}
                />
              }
            />

            <Route path="settings/assets" element={<AssetRegistryPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}