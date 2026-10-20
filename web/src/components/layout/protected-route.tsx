import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-context';

function AppShellSkeleton() {
  return (
    <div className="min-h-svh bg-background" aria-busy="true" aria-label="Cargando tu sesión">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
          <Skeleton className="h-40 md:col-span-6 lg:col-span-8" />
          <Skeleton className="h-40 md:col-span-6 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AppShellSkeleton />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
