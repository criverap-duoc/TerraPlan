import { cn } from 'cn';
import { CalendarDays, ClipboardList, Droplets, LogOut, UserRound, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Agenda', icon: CalendarDays, end: true },
  { to: '/campaigns', label: 'Campañas', icon: ClipboardList },
  { to: '/resources', label: 'Recursos', icon: Wrench },
  { to: '/profile', label: 'Perfil', icon: UserRound },
];

const navLinkClasses = (isActive: boolean) =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors lg:flex-none lg:flex-row lg:justify-start lg:gap-2 lg:rounded-md lg:px-3 lg:py-2 lg:text-sm',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );

function BrandMark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <Droplets className="size-4" aria-hidden="true" />
    </span>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-4 lg:hidden">
        <BrandMark />
        <span className="text-base font-semibold tracking-tight">TerraPlan</span>
        <span className="ml-auto truncate text-xs text-muted-foreground">{user?.fullName}</span>
      </header>

      <aside className="hidden border-r bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <BrandMark />
          <span className="text-base font-semibold tracking-tight">TerraPlan</span>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              <item.icon className="size-5 lg:size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate font-mono text-xs tabular-nums text-muted-foreground">
            {user?.email}
          </p>
          <Button variant="ghost" className="mt-2 w-full justify-start" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-screen-xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex h-16 items-stretch">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
