import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { useAuth } from './auth-context';
import { roleLabel } from './role-label';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Datos de tu sesión en TerraPlan.</p>
      </div>

      <Card className="max-w-md shadow-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-medium">{user?.fullName ?? 'Sesión activa'}</p>
            <p className="truncate font-mono text-sm tabular-nums text-muted-foreground">
              {user?.email}
            </p>
          </div>
          {user ? <Badge variant="secondary">{roleLabel(user.role)}</Badge> : null}
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
