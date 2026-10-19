# TerraPlan

Agenda de campañas de muestreo ambiental: calcula ventanas factibles según los tiempos de
conservación de cada parámetro, reserva técnico + equipo + vehículo de forma atómica y reprograma
cuando el clima o el caudal no permiten muestrear.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 24 + TypeScript |
| API | NestJS 12 · TypeORM 0.3 (PostgreSQL 16) · Mongoose (MongoDB) |
| Auth | JWT + Passport + argon2 |
| Frontend | React 19 · Vite · Tailwind 4 · shadcn/ui · TanStack Query |
| Infra | Docker Compose · GitHub Actions · Render / Neon / Atlas / Vercel |

## Quickstart

```bash
pnpm install
docker compose up -d postgres mongo
cp api/.env.example api/.env
pnpm --filter api migration:run
pnpm --filter api seed:users
pnpm --filter api start:dev
curl http://localhost:3000/api/v1/health
```

- API: `http://localhost:3000/api/v1` · Health: `GET /api/v1/health` · Swagger: `http://localhost:3000/docs`
- Web (desde R11): `http://localhost:5173`
- PostgreSQL: `localhost:5432` (contenedor `terraplan-pg`)
- MongoDB: `localhost:27017` (contenedor `terraplan-mongo`)

## Estado de las rebanadas

| # | Rebanada | Estado |
|---|---|---|
| R1 | Scaffold del monorepo, Docker Compose, config validado, health y CI | ✅ |
| R2 | Catálogo compartido (lectura) | ✅ |
| R3 | Auth + roles (JWT, refresh rotativo) | ✅ |
| R4 | Sitios y recursos (técnicos, equipos, vehículos) | ⬜ |
| R5 | Reserva atómica + test de carrera | ⬜ |
| R6 | Ventanas factibles | ⬜ |
| R7 | Campañas y máquina de estados | ⬜ |
| R8 | Weather/flow gate + reprogramación | ⬜ |
| R9 | Log de eventos en MongoDB | ⬜ |
| R10 | Publicación a AquaMetric | ⬜ |
| R11 | Pantallas del MVP (frontend) | ⬜ |
| R12 | k6, deploy free tier y documentación final | ⬜ |

## Auth

JWT con access token de 15 min y refresh token rotativo de 7 días (se guarda solo el hash en
PostgreSQL y es revocable). **Deny-by-default:** todo endpoint exige
`Authorization: Bearer <access>` salvo los marcados con `@Public()` (health, catálogo, login y refresh).

| Acción | admin | coordinator | field_technician | viewer |
|---|---|---|---|---|
| Ver agenda/campañas | ✓ | ✓ | ✓ (las suyas) | ✓ |
| Crear/reservar/reprogramar campaña | ✓ | ✓ | — | — |
| Marcar en terreno / completar | ✓ | ✓ | ✓ (las suyas) | — |
| CRUD recursos y sitios | ✓ | ✓ | — | — |
| Gestión de usuarios | ✓ | — | — | — |

```bash
# Login: 200 + accessToken + refreshToken
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@terraplan.local","password":"Coord1234!"}'

# Perfil: 200 + role
curl http://localhost:3000/api/v1/auth/me -H 'Authorization: Bearer <accessToken>'

# Rotar el par: el refresh anterior queda revocado y su reutilización devuelve 401
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken>"}'
```

- `pnpm --filter api seed:users` crea un usuario por rol (`admin@`, `coordinator@`, `technician@` y
  `viewer@terraplan.local`; contraseñas demo en `api/src/database/seeds/initial-users.ts`). Es solo
  para desarrollo: en producción los usuarios se crean con un script manual y contraseñas propias.
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` deben ser distintos, aleatorios y de ≥ 32 caracteres.
  En producción se rotan y nunca se commitean.
- `/auth/login` y `/auth/refresh` aceptan 5 intentos por minuto por IP; el sexto responde 429.
- `pnpm --filter api test:e2e` requiere PostgreSQL arriba (`docker compose up -d postgres`) y la
  migración aplicada; si la BD no responde, el test falla con un mensaje explícito (no se salta).

## Documentación

- [`docs/adr/`](docs/adr/) — decisiones de arquitectura (ADR-001: reserva atómica).
- [`docs/design-system.md`](docs/design-system.md) — tokens y componentes de UI.
- [`catalog/`](catalog/) — fuente de verdad del catálogo compartido con AquaMetric.

## Notas de implementación

- `.gitattributes` raíz (`* text=auto eol=lf`) fuerza terminaciones LF en todos los entornos, para
  que el `sha256` del catálogo no cambie entre Windows, Linux y CI.
- `@scarf/scarf` está desactivado en `pnpm-workspace.yaml` (`allowBuilds`) porque pnpm 12 abortaba
  el install por un build ignorado que no aporta al proyecto.
- `pnpm catalog:checksum` verifica que el `sha256` de `catalog.meta.json` coincide con los cuatro
  JSON del catálogo; `pnpm catalog:checksum --write` lo actualiza (más `updatedAt`) tras editarlos.

