import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import CatalogPage from "./pages/CatalogPage";
import UnitPage from "./pages/UnitPage";
import ProgressDashboardPage from "./pages/ProgressDashboardPage";
import MistakeReviewPage from "./pages/MistakeReviewPage";
import ToeicRoadmapPage from "./pages/ToeicRoadmapPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<CatalogPage />} />
            <Route path="roadmap" element={<ToeicRoadmapPage />} />
            <Route path="units/:unitNumber" element={<UnitPage />} />
            <Route path="progress" element={<ProgressDashboardPage />} />
            <Route path="mistakes" element={<MistakeReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
