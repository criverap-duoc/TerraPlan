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
| R3 | Auth + roles (JWT, refresh rotativo) | ⬜ |
| R4 | Sitios y recursos (técnicos, equipos, vehículos) | ⬜ |
| R5 | Reserva atómica + test de carrera | ⬜ |
| R6 | Ventanas factibles | ⬜ |
| R7 | Campañas y máquina de estados | ⬜ |
| R8 | Weather/flow gate + reprogramación | ⬜ |
| R9 | Log de eventos en MongoDB | ⬜ |
| R10 | Publicación a AquaMetric | ⬜ |
| R11 | Pantallas del MVP (frontend) | ⬜ |
| R12 | k6, deploy free tier y documentación final | ⬜ |

## Documentación

- [`docs/adr/`](docs/adr/) — decisiones de arquitectura (ADR-001: reserva atómica).
- [`docs/design-system.md`](docs/design-system.md) — tokens y componentes de UI.
- [`catalog/`](catalog/) — fuente de verdad del catálogo compartido con AquaMetric.
