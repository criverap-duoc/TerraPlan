import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { ComingSoon } from '@/components/layout/coming-soon';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { LoginPage } from '@/features/auth/login-page';
import { ProfilePage } from '@/features/auth/profile-page';
import { CampaignDetailPage } from '@/features/campaigns/campaign-detail-page';
import { CampaignsPage } from '@/features/campaigns/campaigns-page';
import { CatalogPage } from '@/features/catalog/catalog-page';
import { ResourcesPage } from '@/features/resources/resources-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ComingSoon
                title="Agenda"
                description="Campañas del día y disponibilidad de técnicos, equipos y vehículos."
              />
            }
          />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route
            path="campaigns/new"
            element={
              <ComingSoon
                title="Nueva campaña"
                description="Sitio, parámetros, ventana factible y reserva de recursos."
              />
            }
          />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
