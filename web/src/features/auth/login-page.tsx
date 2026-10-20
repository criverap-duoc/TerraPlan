import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Droplets, Loader2, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';

import { useAuth } from './auth-context';
import { loginSchema, type LoginFormValues } from './login-schema';

function resolveLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return error.problem?.detail ?? 'Credenciales incorrectas.';
    }
    return error.problem?.detail ?? 'No pudimos iniciar sesión. Intenta nuevamente.';
  }
  return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(resolveLoginError(error));
    }
  };

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Droplets className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold tracking-tight">TerraPlan</span>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              <h1 className="text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
            </CardTitle>
            <CardDescription>
              Accede para planificar y seguir tus campañas de muestreo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                void handleSubmit(onSubmit)(event);
              }}
            >
              {formError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive-soft-foreground/20 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@laboratorio.cl"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
                {errors.email ? (
                  <p id="email-error" className="text-sm text-destructive-soft-foreground">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                {errors.password ? (
                  <p id="password-error" className="text-sm text-destructive-soft-foreground">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                aria-busy={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="size-4" aria-hidden="true" />
                )}
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {import.meta.env.DEV ? (
          <Card className="mt-4 bg-muted shadow-none">
            <CardContent>
              <p className="text-sm font-medium">Credenciales de demostración</p>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                coordinator@terraplan.local
              </p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">Coord1234!</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
