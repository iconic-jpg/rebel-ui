import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import GoogleCallback from "./components/Modules/GoogleCallback.js";

const API_BASE = "https://r3bel-production.up.railway.app";

export interface VCenterVM {
  name:        string;
  ip:          string | null;
  os:          string;
  cluster:     string;
  datacenter:  string;
  power_state: string;
}

export default function App() {
  const [vCenterAssets, setVCenterAssets] = useState<VCenterVM[]>([]);
  const hasVCenterAssets = vCenterAssets.length > 0;

  return (
    <ThemeProvider>
      {/* ── BrowserRouter replaces HashRouter so real paths work ── */}
      <Router>
        <Routes>

          {/* ── Public routes — no shell, no auth check ── */}
          <Route path="/login"                element={<Login />} />
          <Route path="/signup"               element={<Signup />} />
          <Route path="/splash"               element={<RebelSplash />} />

          {/* ── Google OAuth callback — MUST be top-level, outside AppShell ── */}
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* ── Protected routes inside AppShell ── */}
          <Route path="/" element={<AppShell />}>
            <Route index element={<RebelDashboard />} />

            <Route path="inventory"  element={<AssetInventoryPage />} />
            <Route path="discovery"  element={<AssetDiscoveryPage />} />
            <Route path="registry"   element={<AssetRegistryPage />} />

            <Route path="cbom" element={<CBOMPage />} />
            <Route path="pqc"  element={<PQCPosturePage />} />

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
                  assets={vCenterAssets}
                />
              }
            />

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