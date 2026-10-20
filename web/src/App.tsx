import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { PageSkeleton } from '@/components/layout/page-skeleton';
import { ProtectedRoute } from '@/components/layout/protected-route';

const LoginPage = lazy(() =>
  import('@/features/auth/login-page').then((module) => ({ default: module.LoginPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/auth/profile-page').then((module) => ({ default: module.ProfilePage })),
);
const AgendaPage = lazy(() =>
  import('@/features/agenda/agenda-page').then((module) => ({ default: module.AgendaPage })),
);
const CampaignsPage = lazy(() =>
  import('@/features/campaigns/campaigns-page').then((module) => ({
    default: module.CampaignsPage,
  })),
);
const NewCampaignPage = lazy(() =>
  import('@/features/campaigns/new-campaign-page').then((module) => ({
    default: module.NewCampaignPage,
  })),
);
const CampaignDetailPage = lazy(() =>
  import('@/features/campaigns/campaign-detail-page').then((module) => ({
    default: module.CampaignDetailPage,
  })),
);
const ResourcesPage = lazy(() =>
  import('@/features/resources/resources-page').then((module) => ({
    default: module.ResourcesPage,
  })),
);
const CatalogPage = lazy(() =>
  import('@/features/catalog/catalog-page').then((module) => ({
    default: module.CatalogPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<AgendaPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/new" element={<NewCampaignPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
