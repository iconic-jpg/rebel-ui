
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import RebelDashboard from "./components/RebelDashboard/RebelDashboard.js";
import Login from "./components/Auth/Login.js";
import Signup from "./components/Auth/Signup.js";
import AppShell from "./components/Shell/AppShell.js";
import Landing from "./components/Landing/Landing.js";
import InstitutionOnboarding from "./components/Institution/InstitutionOnboarding.js";

import AssetInventoryPage from "./components/Modules/AssetInventory.js";
import AssetRegistryPage from "./components/Modules/AssetRegistryPage.js";
import AssetDiscoveryPage from "./components/Modules/AssetDiscovery.js";
import CBOMPage from "./components/Modules/CBOM.js";
import PQCPosturePage from "./components/Modules/PQCPosture.js";
import Compliance from "./components/Modules/Compliance.js";
import PQCReadinessPage from "./components/Modules/PQCReadiness.js";
import CyberRatingPage from "./components/Modules/CyberRating.js";
import ReportingPage from "./components/Modules/Reporting.js";
import KeyRotationPanel from "./components/Modules/KeyRotationPanel.js";
import VCenterConnect from "./components/Modules/VCenterConnect.js";
import RebelSplash from "./components/Modules/RebelSplash.js";
import GoogleCallback from "./components/Modules/GoogleCallback.js";
import IntegrationsPage from "./components/Modules/IntegrationsPage.js";
import RemediationCenter from "./components/Modules/RemediationCenter.js";
import SIEMDashboard from "./components/Modules/SIEMDashboard.js";

import { ThemeProvider } from "./components/context/ThemeContext.js";

const API_BASE = "https://r3bel-5464.onrender.com";

export interface VCenterVM {
  name: string;
  ip: string | null;
  os: string;
  cluster: string;
  datacenter: string;
  power_state: string;
}

export default function App() {
  const [vCenterAssets, setVCenterAssets] = useState<VCenterVM[]>([]);
  const hasVCenterAssets = vCenterAssets.length > 0;

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public entry routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/splash" element={<RebelSplash />} />
          <Route
            path="/auth/google/callback"
            element={<GoogleCallback />}
          />

          {/* Institutional onboarding — standalone, outside AppShell */}
          <Route
            path="/onboarding"
            element={<InstitutionOnboarding />}
          />

          {/* Existing Rebel application */}
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<RebelDashboard />} />

            <Route path="inventory" element={<AssetInventoryPage />} />
            <Route path="discovery" element={<AssetDiscoveryPage />} />
            <Route path="registry" element={<AssetRegistryPage />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="siem" element={<SIEMDashboard />} />

            <Route path="cbom" element={<CBOMPage />} />
            <Route path="pqc" element={<PQCPosturePage />} />
            <Route path="remediation" element={<RemediationCenter />} />

            <Route
              path="pqc-readiness"
              element={
                <PQCReadinessPage
                  vcenterAssets={
                    hasVCenterAssets ? vCenterAssets : undefined
                  }
                />
              }
            />

            <Route path="rating" element={<CyberRatingPage />} />
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

            <Route path="integrations" element={<IntegrationsPage />} />

            <Route
              path="vcenter"
              element={
                <VCenterConnect
                  apiBase={API_BASE}
                  onAssets={(vms) => setVCenterAssets(vms)}
                />
              }
            />

            <Route
              path="settings/assets"
              element={<AssetRegistryPage />}
            />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
