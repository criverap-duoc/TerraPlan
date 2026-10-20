# Despliegue en free tier

Guía manual (la ejecuta una persona, no el CI): Render para la API, Vercel para la web, Neon para
PostgreSQL y Atlas M0 para MongoDB. Verificar las condiciones vigentes de cada free tier antes de
empezar; los límites cambian.

## Pre-requisitos

- Cuentas gratuitas en [Render](https://render.com), [Neon](https://neon.tech),
  [Atlas](https://www.mongodb.com/atlas) y [Vercel](https://vercel.com).
- Repositorio con `main` en verde (workflow `CI`).
- Secretos generados: `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` distintos, aleatorios y de al menos
  32 caracteres (`openssl rand -base64 48`).

## Paso 1 · Neon (PostgreSQL 16)

1. Crear proyecto y base `terraplan`; copiar la cadena `DATABASE_URL` (agregar `?sslmode=require`).
2. En el SQL Editor verificar la extensión que sostiene la reserva atómica:

   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```

   Si el rol no puede crearla, hacerlo desde el rol owner del proyecto.
3. Aplicar migraciones desde local apuntando a Neon:

   ```bash
   DATABASE_URL="postgresql://…" pnpm --filter api migration:run
   ```

## Paso 2 · Atlas M0 (MongoDB)

1. Crear cluster M0, usuario de base de datos y permitir la IP de Render (`0.0.0.0/0` en el MVP).
2. Copiar `MONGO_URL` (`mongodb+srv://usuario:clave@cluster.mongodb.net/terraplan`).
3. Verificar la conexión con `mongosh "<MONGO_URL>" --eval "db.runCommand({ ping: 1 })"`.

## Paso 3 · Render (API)

1. **New → Blueprint**, conectar el repositorio: `render.yaml` crea el servicio `terraplan-api`
   (runtime Docker, `dockerfilePath: ./api/Dockerfile`, `healthCheckPath: /api/v1/health`).
2. Completar las variables marcadas `sync: false`: `DATABASE_URL`, `MONGO_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AQUAMETRIC_URL`, `AQUAMETRIC_API_KEY`.
3. Ajustar `CORS_ORIGINS` al dominio real de Vercel (por defecto `https://terraplan.vercel.app`).
4. Deploy automático en cada push a `main`. El build local equivalente es:

   ```bash
   docker build -f api/Dockerfile -t terraplan-api .
   docker run --rm -p 3000:3000 --env-file api/.env terraplan-api
   ```

   El contexto debe ser la **raíz** del repo: el Dockerfile copia el `pnpm-lock.yaml` y
   `pnpm-workspace.yaml` raíz para instalar el workspace.

## Paso 4 · Vercel (web)

1. **Add New → Project**, conectar el repositorio.
2. Build command `pnpm --filter web build`; output directory `web/dist`.
3. Variable de entorno `VITE_API_URL=https://<servicio>.onrender.com/api/v1`.
4. Redeploy tras cambiar la variable (Vite la inyecta en build time).

## Paso 5 · Seed de producción (una sola vez)

```bash
DATABASE_URL="<neon>" MONGO_URL="<atlas>" pnpm --filter api seed:all
```

Los seeds son idempotentes por `email`/`code`: correrlos dos veces no duplica filas. Cambiar las
contraseñas demo antes de compartir la URL con terceros.

## Paso 6 · UptimeRobot

Monitor HTTP(s) cada 5 minutos a `https://<servicio>.onrender.com/api/v1/health`. Render free duerme
el servicio tras ~15 min de inactividad y el primer request puede tardar 30–50 s; el monitor lo
mantiene despierto y avisa si el health check deja de responder.

## Paso 7 · Verificación

```bash
curl -i https://<servicio>.onrender.com/api/v1/health          # 200
curl -i https://<servicio>.onrender.com/docs                   # Swagger
```

En la UI: login con un usuario demo, abrir la agenda, crear una campaña con el asistente y confirmar
la reserva. Revisar que la bitácora de la campaña registre los eventos.

## Costos y límites

| Pieza | Plan | Nota |
|---|---|---|
| Render | Free | Duerme por inactividad; 750 h/mes de instancia. |
| Neon | Free | Límite de almacenamiento y de *compute* por mes. |
| Atlas | M0 | 512 MB; IP allowlist obligatoria. |
| Vercel | Hobby | Solo uso personal/no comercial. |
| UptimeRobot | Free | 50 monitores cada 5 min. |
