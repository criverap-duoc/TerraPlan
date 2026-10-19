# 01 · Contexto del proyecto — TerraPlan (NestJS)

> Proyecto **greenfield**. Regla madre: *construir consistente desde cero y entregar un MVP desplegado en 2–3 semanas*. No sobre-ingeniería.
> Idioma: ver `02-coding-standards.md` (respuestas en español · código en inglés · commits en inglés).

## 1. Qué es

**TerraPlan**: agenda de campañas de muestreo ambiental. Un coordinador planifica una campaña (sitio + parámetros + fecha) y el sistema:

1. calcula **ventanas factibles** según los **tiempos de conservación** de los parámetros elegidos (la muestra debe llegar al laboratorio a tiempo);
2. **reserva de forma atómica** técnico + equipo + vehículo en PostgreSQL (imposible el doble-booking);
3. **reprograma** si el clima o el caudal no permiten muestrear (reglas por umbral);
4. registra cada cambio en un **log de eventos** (MongoDB);
5. publica resultados (Site, Sample, Observation) al proyecto hermano **AquaMetric (FastAPI)**.

Público de la UI: técnicos de terreno (móvil), coordinadores de laboratorio, gestores ambientales. Sensación: confianza, precisión, control operativo.

### Alcance MVP (2–3 semanas)

| Dentro | Fuera (no hacer sin aprobación) |
|---|---|
| Auth JWT + roles, CRUD mínimo de sitios y recursos | Multi-tenant, facturación, notificaciones push/email |
| Catálogo compartido (lectura) | Editor de catálogo en UI |
| Reserva atómica de 3 recursos | Optimización automática global de rutas |
| Ventanas factibles + reprogramación por clima/caudal | Mapas interactivos, GPS en vivo |
| Log de eventos en MongoDB | Event sourcing completo / CQRS |
| Publicación a AquaMetric | Colas (RabbitMQ/Kafka) |
| Frontend mínimo profesional (6 pantallas) | App móvil nativa |

### Plan de 3 semanas

| Semana | Entregable |
|---|---|
| 1 | Scaffold, Docker Compose, auth + roles, carga del catálogo, sitios/recursos, **reserva atómica + test de carrera** |
| 2 | Ventanas factibles, ciclo de vida de campaña, weather/flow gate, eventos en Mongo, publicación a AquaMetric, frontend (login, agenda, detalle/wizard) |
| 3 | k6, deploy free tier, datos demo (seed), README con badges + GIF + diagrama, ADRs, pulido UI |

## 2. Stack

| Capa | Tecnología | Nota |
|---|---|---|
| Runtime | **Node.js 24 LTS**, TypeScript `strict` | Verificar con `node -v` al iniciar |
| Framework | **NestJS 12.x** (fallback 11.x si un peer-dep lo bloquea) | Confirmar con `nest --version`. NestJS 12 es ESM-ready: **no asumir patrones de v10**; ante duda, consultar docs.nestjs.com |
| BD relacional | **PostgreSQL 16+** (Neon free) | Extensión `btree_gist` obligatoria (verificar en Neon en la semana 1) |
| ORM | **TypeORM 0.3.x** + `@nestjs/typeorm` | Migraciones SQL a mano para constraints; `synchronize: false` SIEMPRE |
| BD documental | **MongoDB** (Atlas M0 free) + `@nestjs/mongoose` | Solo log de eventos |
| Auth | `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, **argon2** | Access 15 min + refresh rotativo 7 d |
| Validación | `class-validator` + `class-transformer` | `ValidationPipe` global |
| Docs API | `@nestjs/swagger` en `/docs` | Cada DTO anotado |
| Logging | `nestjs-pino` | Con correlation id |
| Seguridad | `helmet`, `@nestjs/throttler`, CORS por allowlist | |
| Fechas | `luxon` | Zona `America/Santiago` solo en bordes (UI / reglas de horario) |
| Clima | Open-Meteo (gratis, sin API key) tras interfaz `WeatherProvider` | Caudal: `FlowProvider` con implementación simulada |
| Tests | Jest + Supertest + **Testcontainers** (`@testcontainers/postgresql`, `@testcontainers/mongodb`) | |
| Carga | **k6** | Escenarios en `k6/` |
| Contenedores | Docker (multi-stage) + Docker Compose | |
| CI | GitHub Actions | lint + typecheck + unit + integration |
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 + shadcn/ui + TanStack Query + React Router + react-hook-form + zod | Ver `04-ui-ux-directives.md` |
| Hosting | API: **Render** (Docker, free) · Postgres: **Neon** · Mongo: **Atlas M0** · Web: **Vercel** | Free tiers pueden cambiar: verificar condiciones vigentes antes de desplegar. Mitigar cold start con UptimeRobot a `/health` |

### Package manager — REGLA ESTRICTA

- **Solo `pnpm`** en todo el repo (api y web). **Nunca** `npm`, `yarn` ni `npx`.
- Ejecutar binarios: `pnpm exec <bin>` · herramientas puntuales: `pnpm dlx <pkg>` · scripts: `pnpm --filter <api|web> <script>`.
- `package.json` raíz: `"packageManager": "pnpm@<versión>"` y `"preinstall": "npx only-allow pnpm"` (única excepción tolerada: esa línea).
- No crear `package-lock.json` ni `yarn.lock`. Si aparecen, **reportar y borrar** (es basura).

## 3. Arquitectura

Monorepo pnpm:

```
terraplan/
├─ api/                    # NestJS
│  └─ src/
│     ├─ main.ts · app.module.ts
│     ├─ config/           # env validado (class-validator)
│     ├─ common/           # filters · interceptors · guards · decorators · pipes · errors
│     ├─ database/         # data-source.ts · migrations/ (SQL explícito)
│     └─ modules/
│        ├─ auth/ · users/
│        ├─ sites/
│        ├─ catalog/        # parameters · units · limits (carga desde /catalog, solo lectura)
│        ├─ resources/      # technicians · equipment · vehicles
│        ├─ campaigns/
│        ├─ reservations/   # reserva atómica (corazón del proyecto)
│        ├─ scheduling/     # ventanas factibles (funciones puras, sin Nest)
│        ├─ weather/        # WeatherProvider · FlowProvider · evaluación de umbrales
│        ├─ events/         # log en Mongo
│        ├─ integration/    # publicación a AquaMetric
│        └─ health/
├─ web/                    # React (ver 04)
├─ catalog/                # ★ FUENTE DE VERDAD del catálogo compartido (ver §5)
├─ k6/                     # reservation-race.js · read-load.js
├─ docs/                   # design-system.md · architecture.md · glossary.md · adr/
├─ scripts/                # contrast-check.py · utilidades
├─ docker-compose.yml · pnpm-workspace.yaml · .editorconfig
└─ .clinerules/
```

### Capas (dependencia unidireccional)

`Controller → Service → Repository → Entity/DB`

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| Controller | HTTP, DTOs de entrada/salida, guards/roles, Swagger | Lógica de negocio, queries, transacciones |
| Service | Reglas de negocio, orquestación, transacciones | Acceder a `Request`, escribir SQL suelto |
| Repository | Acceso a datos (TypeORM / SQL parametrizado), `QueryRunner` | Reglas de negocio, lanzar `HttpException` |
| Domain (funciones puras) | Cálculo de ventanas, evaluación de umbrales, máquina de estados | Importar Nest, TypeORM, `Date.now()` directo (inyectar reloj) |

Un módulo **exporta solo su Service**; nunca repositorios ni entidades hacia otros módulos.

### Máquina de estados de campaña

`draft → planned → confirmed → in_field → completed` · `confirmed → needs_reschedule → planned` · `* (no completed) → cancelled`.
Transiciones válidas en una única función de dominio; cualquier otra → `INVALID_STATE_TRANSITION` (409).

## 4. Decisiones clave (resumen; detalle en `docs/adr/`)

| ADR | Decisión | Por qué |
|---|---|---|
| 001 | **Reserva atómica con `EXCLUDE USING gist` en PostgreSQL** | El doble-booking debe ser imposible a nivel de BD, no "improbable" por código. Ver §4.1 |
| 002 | MongoDB solo para log de eventos append-only | Esquema flexible por tipo de evento; no participa en reglas de negocio |
| 003 | TypeORM + migraciones SQL a mano | Soporte nativo en Nest; los rangos (`tstzrange`) y exclusion constraints van en SQL explícito |
| 004 | Catálogo compartido versionado en `/catalog` (JSON) | Misma verdad de parámetros/unidades/límites en Node y FastAPI |
| 005 | Hosting 100 % free tier (Render + Neon + Atlas + Vercel) | Costo cero; cold start mitigado |
| 006 | Evento a Mongo **después** del commit (best-effort + reintento) | Evita transacciones distribuidas; el log es auditoría, no fuente de verdad |

### 4.1 Reserva atómica (ADR-001) — el patrón

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE resource_booking (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES campaign(id),
  resource_type text NOT NULL CHECK (resource_type IN ('technician','equipment','vehicle')),
  resource_id  uuid NOT NULL,
  during       tstzrange NOT NULL,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_double_booking
    EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (status = 'active')
);
```

Reglas:
1. Reservar técnico + equipo + vehículo = **3 `INSERT` en UNA transacción**. Si cualquiera viola el constraint → rollback total.
2. Capturar SQLSTATE **`23P01`** (`exclusion_violation`) en el *repository* → lanzar `ResourceConflictError` → el filtro global responde **409**.
3. **Prohibido** el patrón "consultar disponibilidad y luego insertar" como mecanismo de seguridad (condición de carrera). Consultar disponibilidad es solo para sugerir ventanas.
4. Rango semiabierto `[start, end)`. Reservas consecutivas no chocan.
5. Test obligatorio de carrera: N solicitudes concurrentes al mismo recurso/ventana ⇒ exactamente 1 éxito, N−1 conflictos (Testcontainers + `Promise.all`).
6. `tstzrange` no está soportado por TypeORM: usar `queryRunner.query()` con parámetros (`$1`) en `reservations.repository.ts`.

### 4.2 Ventanas factibles

Entrada: parámetros de la campaña (con `holdingTimeHours` del catálogo), tiempo de traslado al laboratorio, horario del laboratorio, disponibilidad de recursos.
Regla: para cada fin de muestreo candidato `te`: `arrival = te + transportTime`; `analysisStart = max(arrival, próxima apertura del laboratorio)`; la ventana es **factible** solo si `analysisStart ≤ te + min(holdingTimeHours de los parámetros)`. La recepción debe caer en horario operativo del laboratorio (`America/Santiago`) y los 3 recursos deben estar libres (consulta informativa; la garantía real es el constraint de §4.1). Función pura `computeFeasibleWindows()` en `scheduling/`, con tests de tabla. Los valores de conservación **vienen del catálogo**, nunca hardcodeados.

### 4.3 Reprogramación por clima / caudal

`WeatherProvider.getForecast(site, range)` y `FlowProvider.getFlow(site, at)`. Umbrales por parámetro/sitio/campaña (config en catálogo o en la campaña). Si se exceden ⇒ campaña pasa a `needs_reschedule`, se liberan reservas (`status='released'`), se registra el evento y se proponen nuevas ventanas.

### 4.4 Auth y roles

JWT access 15 min + refresh rotativo (hash en PG, revocable). Roles: `admin`, `coordinator`, `field_technician`, `viewer`. **Deny-by-default**: `JwtAuthGuard` global + `@Public()` explícito + `@Roles(...)`.

| Acción | admin | coordinator | field_technician | viewer |
|---|---|---|---|---|
| Ver agenda/campañas | ✓ | ✓ | ✓ (las suyas) | ✓ |
| Crear/reservar/reprogramar campaña | ✓ | ✓ | — | — |
| Marcar en terreno / completar | ✓ | ✓ | ✓ (las suyas) | — |
| CRUD recursos y sitios | ✓ | ✓ | — | — |
| Gestión de usuarios | ✓ | — | — | — |

## 5. Catálogo y esquemas compartidos con AquaMetric (CONTRATO)

**Fuente de verdad:** `/catalog` en este repo. AquaMetric lo sincroniza con su script `scripts/sync_catalog` (copia + verificación de `sha256`). Cambiar el catálogo = **versionar** (`catalog.meta.json`) + ADR si es breaking.

```
catalog/
├─ catalog.meta.json     # { version: "1.0.0", updatedAt, sha256 }
├─ parameters.v1.json
├─ units.v1.json
├─ limits.v1.json
└─ schemas/              # JSON Schema de Site, Sample, Observation, Parameter, Unit, Limit
```

**Convenciones de contrato (idénticas en ambos proyectos):**

- JSON en la API: **camelCase**. Columnas de BD: **snake_case**.
- IDs: `uuid` (string). Fechas: ISO-8601 **UTC** (`2026-03-14T13:05:00Z`). Zona de usuario: `America/Santiago` solo al mostrar.
- Unidad canónica por parámetro; **nunca convertir en silencio**: guardar valor + `unitCode` originales y convertir explícitamente.
- Códigos de parámetro y de unidad: del catálogo, nunca escritos a mano.

| Entidad | Campos |
|---|---|
| `Site` | `id`, `code` (único, ej. `RIO-MAIPO-01`), `name`, `waterBodyType` (`river\|lake\|estuary\|groundwater\|effluent\|drinking`), `latitude`, `longitude` (WGS84), `isActive` |
| `Sample` | `id`, `siteId`, `campaignId?`, `matrix`, `collectedAt` (UTC), `labReceivedAt?`, `status` (`collected\|in_transit\|received\|analyzed\|rejected`) |
| `Observation` | `id`, `siteId`, `sampleId?` (null si viene de sensor), `parameterCode`, `value` (number\|null), `unitCode`, `qualifier` (`"<"\|">"\|null`), `loq?`, `method?`, `analyzedAt` (UTC), `qcFlag` (`ok\|suspect\|failed`), `source` (`lab\|field\|sensor`) |
| `Parameter` | `code`, `nameEs`, `category`, `canonicalUnitCode`, `decimals`, `holdingTimeHours?`, `preservation?`, `container?` |
| `Unit` | `code`, `nameEs`, `dimension` (+ factor de conversión a la canónica de su dimensión) |
| `Limit` | `id`, `parameterCode`, `regulationCode` (ej. norma chilena), `context`, `min?`, `max?`, `unitCode`, `status` (`draft\|validated`), `sourceNote` |

- **Datos censurados** (`< LOQ`): `value = null` + `qualifier = "<"` + `loq`. Jamás sustituir por 0 ni por LOQ/2 en el dato almacenado.
- **Límites normativos** (`Limit`): el contenido normativo lo **valida el químico colaborador**. Hasta que `status = "validated"`, la UI muestra "Pendiente de validación". **No presentar como oficial un límite en `draft`.** No inventar valores: si no se conoce, dejar el campo vacío y reportar.
- **Publicación a AquaMetric:** `POST {AQUAMETRIC_URL}/api/v1/ingest/observations` con `X-API-Key` e `Idempotency-Key` (hash determinista del lote). Lote: `{ catalogVersion, site, samples[], observations[] }`. Reintentos con backoff; el evento `observations.published` se registra en Mongo.

## 6. Rutas locales, puertos y variables

| Elemento | Valor |
|---|---|
| Ruta del repo | `{{RUTA_LOCAL_TERRAPLAN}}` ← **completar** |
| Ruta del proyecto hermano | `{{RUTA_LOCAL_AQUAMETRIC}}` ← **completar** |
| API | `http://localhost:3000` (Swagger `/docs`, prefijo `/api/v1`) |
| Web | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` (contenedor `terraplan-pg`) |
| MongoDB | `localhost:27017` (contenedor `terraplan-mongo`) |

(AquaMetric usa 8000 / 5174 / 5433 para correr ambos a la vez.)

Variables (`api/.env`, **nunca** commitear; mantener `api/.env.example` al día): `NODE_ENV`, `PORT`, `DATABASE_URL`, `MONGO_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `CORS_ORIGINS`, `AQUAMETRIC_URL`, `AQUAMETRIC_API_KEY`, `WEATHER_PROVIDER`, `OPEN_METEO_BASE_URL`.

## 7. Comandos

```bash
# Instalación y desarrollo
pnpm install
docker compose up -d postgres mongo
pnpm --filter api start:dev             # nest start --watch
pnpm --filter web dev

# Calidad
pnpm --filter api lint
pnpm --filter api typecheck             # tsc --noEmit
pnpm --filter api test                  # unit (rápido, sin Docker)
pnpm --filter api test:int              # integración con Testcontainers (requiere Docker)
pnpm --filter api test:e2e
pnpm --filter api build
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build

# Migraciones (SIEMPRE por migración, nunca synchronize)
pnpm --filter api migration:generate -- src/database/migrations/<name>
pnpm --filter api migration:run
pnpm --filter api migration:revert

# Carga
k6 run k6/reservation-race.js
k6 run k6/read-load.js

# Docker
docker compose up -d --build
docker compose logs -f api
```

Si la shell falla con `&&`, ejecutar los comandos por separado.

## 8. Documentación obligatoria (portafolio)

- `README.md` profesional: badges (CI, licencia, deploy), GIF/capturas, demo en vivo, **diagrama de arquitectura (Mermaid)**, quickstart, decisiones, estado de tests, enlace a AquaMetric.
- `docs/adr/NNN-titulo.md` para cada decisión de §4 (formato: Contexto · Decisión · Consecuencias).
- `docs/architecture.md` (diagrama de módulos y flujo de reserva) y `docs/glossary.md` (**glosario en lenguaje simple para el químico colaborador**).
- Recordatorios concretos de cuándo actualizarlos: ver `03-automation-workflows.md`.

## 9. Diseño visual

El design system está en **`docs/design-system.md`** (tokens, tipografía, componentes, a11y). Reglas de aplicación en `04-ui-ux-directives.md`. **Leer el documento solo al crear o modificar UI**, y solo la sección necesaria.
