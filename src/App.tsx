import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { APIProvider } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import AdminLayout from "@/layouts/AdminLayout";
import LoginPage from "@/pages/auth/LoginPage";
import StoreListPage from "@/pages/admin/StoreListPage";
import StoreFormPage from "@/pages/admin/StoreFormPage";
import BatchUpdatePage from "@/pages/admin/BatchUpdatePage";
import MigrationPage from "@/pages/admin/MigrationPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";

import MainLayout from "@/layouts/MainLayout";

function App() {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="zh-TW" region="TW">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/stores" replace />} />
            <Route path="stores" element={<StoreListPage />} />
            <Route path="stores/new" element={<StoreFormPage />} />
            <Route path="stores/:id" element={<StoreFormPage />} />
            <Route path="batch-update" element={<BatchUpdatePage />} />
            <Route path="migration" element={<MigrationPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </APIProvider>
  );
}

export default App;
