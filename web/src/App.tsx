import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { ComingSoon } from '@/components/layout/coming-soon';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { LoginPage } from '@/features/auth/login-page';
import { ProfilePage } from '@/features/auth/profile-page';

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
          <Route
            path="campaigns"
            element={
              <ComingSoon
                title="Campañas"
                description="Todas las campañas de muestreo, filtrables por estado, sitio y fecha."
              />
            }
          />
          <Route
            path="campaigns/new"
            element={
              <ComingSoon
                title="Nueva campaña"
                description="Sitio, parámetros, ventana factible y reserva de recursos."
              />
            }
          />
          <Route
            path="campaigns/:id"
            element={
              <ComingSoon
                title="Detalle de campaña"
                description="Estado, ventanas, reservas, clima y bitácora de eventos."
              />
            }
          />
          <Route
            path="resources"
            element={
              <ComingSoon
                title="Recursos"
                description="Técnicos, equipos y vehículos con su disponibilidad."
              />
            }
          />
          <Route
            path="catalog"
            element={
              <ComingSoon
                title="Catálogo"
                description="Parámetros, unidades y límites normativos compartidos con AquaMetric."
              />
            }
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
