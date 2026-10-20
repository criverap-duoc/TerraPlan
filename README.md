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
pnpm --filter api seed:all
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
| R4 | Sitios y recursos (técnicos, equipos, vehículos) | ✅ |
| R5 | Reserva atómica + test de carrera | ✅ |
| R6 | Ventanas factibles | ✅ |
| R7 | Campañas y máquina de estados | ✅ |
| R8 | Weather/flow gate + reprogramación | ✅ |
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

## Sitios y recursos reservables

| Recurso | Campos principales | Notas |
|---|---|---|
| Sitio (`site`) | `code` (único), `name`, `waterBodyType`, `latitude`/`longitude`, `isActive` | Coordenadas WGS84 en `numeric(9,6)`; `waterBodyType`: `river`, `lake`, `estuary`, `groundwater`, `effluent`, `drinking` |
| Técnico (`technician`) | `code` (único), `fullName`, `phone`, `skills[]`, `userId?`, `isActive` | `userId` debe ser un usuario activo con rol `field_technician` |
| Equipo (`equipment`) | `code` (único), `name`, `category`, `serialNumber?`, `isActive` | `category` es texto libre por ahora (ej. `multiparametric_probe`) |
| Vehículo (`vehicle`) | `code` (único), `name`, `plate` (única), `capacityKg?`, `isActive` | `capacityKg` entero > 0 |

La lectura es pública; la escritura requiere `admin` o `coordinator` y la baja lógica solo `admin`.
Los listados devuelven `{ data, meta: { page, pageSize, total } }` (paginación 1–100, `sort`/`order`).

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/sites` | público | Lista con filtros `waterBodyType`, `isActive`, `q` y orden `code`/`name`/`createdAt` |
| GET | `/api/v1/sites/:id` | público | Detalle de un sitio |
| POST | `/api/v1/sites` | admin, coordinator | Crea un sitio (409 si el `code` ya existe) |
| PATCH | `/api/v1/sites/:id` | admin, coordinator | Actualiza un sitio |
| DELETE | `/api/v1/sites/:id` | admin | Baja lógica (`isActive=false`), responde 204 |
| GET | `/api/v1/technicians` | público | Lista con filtros `isActive`, `q` y orden `code`/`fullName`/`createdAt` |
| GET | `/api/v1/technicians/:id` | público | Detalle de un técnico |
| POST | `/api/v1/technicians` | admin, coordinator | Crea un técnico (409 por `code`; 400 si el `userId` no es `field_technician`) |
| PATCH | `/api/v1/technicians/:id` | admin, coordinator | Actualiza un técnico |
| DELETE | `/api/v1/technicians/:id` | admin | Baja lógica, responde 204 |
| GET | `/api/v1/equipment` | público | Lista con filtros `isActive`, `q` y orden `code`/`name`/`category`/`createdAt` |
| GET | `/api/v1/equipment/:id` | público | Detalle de un equipo |
| POST | `/api/v1/equipment` | admin, coordinator | Crea un equipo (409 por `code`) |
| PATCH | `/api/v1/equipment/:id` | admin, coordinator | Actualiza un equipo |
| DELETE | `/api/v1/equipment/:id` | admin | Baja lógica, responde 204 |
| GET | `/api/v1/vehicles` | público | Lista con filtros `isActive`, `q` y orden `code`/`name`/`plate`/`createdAt` |
| GET | `/api/v1/vehicles/:id` | público | Detalle de un vehículo |
| POST | `/api/v1/vehicles` | admin, coordinator | Crea un vehículo (409 por `code` o `plate`) |
| PATCH | `/api/v1/vehicles/:id` | admin, coordinator | Actualiza un vehículo |
| DELETE | `/api/v1/vehicles/:id` | admin | Baja lógica, responde 204 |
| GET | `/api/v1/users` | admin | Lista paginada de usuarios (sin `passwordHash`), filtro `role` y búsqueda `q` |

## Reserva atómica

El corazón del proyecto (ADR-001). Reservar técnico + equipo + vehículo son **tres `INSERT` en una
sola transacción** contra `resource_booking`, y la BD impide el doble booking con un
`EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (status = 'active')` sobre un
`tstzrange` semiabierto `[start, end)`. Si cualquiera de los tres choca, PostgreSQL responde
SQLSTATE `23P01`, el repository lanza `ResourceConflictError` y el filtro global devuelve **409**
`application/problem+json` con `code: RESOURCE_CONFLICT` y el nombre legible del recurso
(ej. `El vehículo VH-01 ya está reservado en ese horario.`). Los rangos consecutivos no chocan
(`[10:00,12:00)` + `[12:00,14:00)` es válido) y `DELETE` libera las reservas (`status='released'`)
sin borrar la fila, que queda como auditoría.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/v1/campaigns/:campaignId/reservations` | admin, coordinator | Reserva triple atómica; 409 si algún recurso se solapa |
| GET | `/api/v1/campaigns/:campaignId/reservations` | admin, coordinator, field_technician | Reservas activas de la campaña |
| DELETE | `/api/v1/campaigns/:campaignId/reservations` | admin, coordinator | Libera las reservas activas (204) |

Validaciones del servicio antes de tocar la BD: `startsAt < endsAt`, duración ≤ 24 h, ventana no
terminada, campaña existente y en estado `draft` o `planned` (desde R7), y los tres recursos activos.
La garantía anti-doble-booking **no** es "consultar y luego insertar": es el constraint.

```bash
pnpm --filter api test:int   # Testcontainers: postgres:16-alpine efímero, requiere Docker
pnpm --filter api test:e2e   # HTTP completo contra el Postgres de docker compose
```

`test:int` levanta un PostgreSQL efímero con Testcontainers porque el test de carrera necesita
**concurrencia real** (10 reservas simultáneas ⇒ 1 éxito y 9 conflictos) y no debe tocar los datos de
desarrollo. `test:e2e` usa el Postgres de `docker compose` (ya migrado) para probar endpoints, roles
y el body `problem+json`, igual que las rebanadas anteriores.

## Ventanas factibles

`POST /api/v1/campaigns/:campaignId/feasible-windows` divide el rango pedido en slots consecutivos y,
para cada uno, calcula si la muestra alcanza a analizarse antes de que venza el **tiempo de
conservación** más corto de los parámetros elegidos (`holdingTimeHours` del catálogo). Es
**informativo**: no persiste nada ni reserva recursos (la garantía real es el `EXCLUDE` descrito
arriba).

Para cada slot: `arrivalAtLab = samplingEnd + transportMinutes`; si el laboratorio está cerrado,
`analysisStart` se corre a la próxima apertura (en R6: 8:00–18:00, lunes a viernes,
`America/Santiago`). La ventana es factible solo si `analysisStart ≤ holdingDeadline`, donde
`holdingDeadline = samplingEnd + minHoldingTimeHours`. Si todos los parámetros son `in_situ`,
`minHoldingTimeHours` es `"Infinity"` y todas las ventanas son factibles. Se devuelven como máximo
100 ventanas (las primeras), ordenadas por `samplingStart`.

```bash
curl -X POST http://localhost:3000/api/v1/campaigns/<campaignId>/feasible-windows \
  -H 'Authorization: Bearer <access_token>' -H 'Content-Type: application/json' \
  -d '{"earliestStart":"2026-11-16T13:00:00Z","latestEnd":"2026-11-20T22:00:00Z",
       "slotMinutes":120,"transportMinutes":90,"parameterCodes":["TURB","N_NO3"]}'
```

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/v1/campaigns/:campaignId/feasible-windows` | admin, coordinator | Calcula ventanas factibles; 404 si la campaña no existe |

La regla vive en `computeFeasibleWindows()` (`scheduling/compute-feasible-windows.domain.ts`): función
pura, sin Nest, sin TypeORM y sin `new Date()`; usa `Intl` para la zona horaria y tiene tests de tabla
(factible simple, cierre del laboratorio, fin de semana, cruce de medianoche, `Infinity`, múltiples
slots y rango vacío). Ver `01 §4.2` y [`docs/architecture.md`](docs/architecture.md).

## Campañas

Una campaña nace en `draft` con un sitio, una lista de parámetros del catálogo y, opcionalmente, una
fecha de inicio temprana. Su ciclo de vida está en una función pura
(`campaigns/campaign-status.domain.ts`, tabla de 49 combinaciones) y cada transición valida sus
precondiciones antes de escribir en la BD.

| Desde | Hacia | Precondición |
|---|---|---|
| `draft` | `planned` | Al menos una ventana guardada |
| `draft` | `cancelled` | Motivo (la API `DELETE` usa un motivo por defecto) |
| `planned` | `confirmed` | Al menos una reserva activa |
| `planned` | `draft` | — (volver a editar) |
| `planned` | `cancelled` | Motivo |
| `confirmed` | `in_field` | Una ventana seleccionada |
| `confirmed` | `needs_reschedule` | Motivo; libera las reservas activas |
| `confirmed` | `cancelled` | Motivo; libera las reservas activas |
| `in_field` | `completed` | — |
| `in_field` | `cancelled` | Motivo; libera las reservas activas |
| `needs_reschedule` | `planned` | Al menos una ventana guardada |
| `needs_reschedule` | `cancelled` | Motivo; libera las reservas activas |
| `completed` | `cancelled` | Motivo; libera las reservas activas |

Cualquier otro par responde **409** `INVALID_STATE_TRANSITION`. Las precondiciones incumplidas
responden **400** con código estable: `NO_WINDOW_SELECTED`, `NO_ACTIVE_RESERVATION`,
`NO_SELECTED_WINDOW`, `REASON_REQUIRED` o `UNKNOWN_PARAMETER`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/campaigns` | todos | Lista paginada; filtros `status`, `siteId`, `from`, `to` |
| GET | `/api/v1/campaigns/:id` | todos | Detalle con sitio, parámetros, ventanas y `hasActiveReservations` |
| POST | `/api/v1/campaigns` | admin, coordinator | Crea en `draft`; 400 si un parámetro no existe en el catálogo |
| PATCH | `/api/v1/campaigns/:id` | admin, coordinator | Solo en `draft`: `notes`, `earliestStart`, `parameterCodes` |
| POST | `/api/v1/campaigns/:id/transition` | admin, coordinator | Aplica la máquina de estados |
| POST | `/api/v1/campaigns/:id/windows` | admin, coordinator | Reemplaza las ventanas (`draft` o `planned`) |
| POST | `/api/v1/campaigns/:id/select-window` | admin, coordinator | Marca una ventana como seleccionada |
| DELETE | `/api/v1/campaigns/:id` | admin | Cancela y libera reservas (204, idempotente) |

Flujo típico: crear → calcular ventanas factibles → guardar ventanas → seleccionar una → reservar
técnico + equipo + vehículo → `planned` → `confirmed` → `in_field` → `completed`. Si el clima o el
caudal obligan a reprogramar: `confirmed → needs_reschedule` (libera reservas) → `planned`.

## Weather / flow gate

`POST /api/v1/campaigns/:campaignId/check-weather` (admin, coordinator) evalúa la campaña contra el
pronóstico y el caudal:

1. Usa la ventana seleccionada; si no hay ninguna, evalúa todas las ventanas guardadas.
2. Pide el pronóstico horario a **Open-Meteo** (sin API key, timeout 5 s, 1 reintento con backoff
   500 ms) y el caudal al `FlowProvider` simulado (determinístico entre 0,5 y 50,5 m³/s).
3. `assessWeather` (función pura) compara la **precipitación máxima** de la ventana y el caudal
   contra los umbrales globales (`5 mm/h`, `0,1–100 m³/s`). Prioridad del motivo:
   `precipitation_exceeded` → `flow_too_low` → `flow_too_high`.
4. Si no es factible y la campaña está `confirmed`, se transiciona automáticamente a
   `needs_reschedule` con el motivo en `notes` y se liberan las reservas activas.
   En cualquier otro estado solo se reporta (`transitioned: false`).

Respuesta: `{ campaignId, allFeasible, transitioned, assessments[] }`, con la precipitación y el
caudal usados en cada ventana. Sin ventanas → **400** `NO_WINDOWS_TO_CHECK`; fallo del proveedor →
**502** `UPSTREAM_UNAVAILABLE`. Los umbrales son globales en R8 (parametrizables por sitio en R12).

## Seeds

`pnpm --filter api seed:all` ejecuta los cuatro seeds en orden; todos son idempotentes por `email`/`code`,
así que correrlo dos veces no duplica filas ni resetea contraseñas.

| Seed | Comando | Contenido |
|---|---|---|
| Usuarios | `pnpm --filter api seed:users` | `admin@`, `coordinator@`, `technician@` y `viewer@terraplan.local` (contraseñas demo en `initial-users.ts`; solo desarrollo) |
| Sitios | `pnpm --filter api seed:sites` | 6 sitios de la cuenca del Maipo: `RIO-MAIPO-01`, `RIO-MAIPO-02`, `RIO-MAPOCHO-01`, `EMB-ELYES-01`, `EST-LAMPA-01`, `RIO-MAIPO-EST-01` |
| Recursos | `pnpm --filter api seed:resources` | 4 técnicos (`TECH-01`…`TECH-04`; `TECH-01` vinculada a `technician@`), 3 equipos (`EQ-SONDA-01`, `EQ-TURB-01`, `EQ-NUTRI-01`) y 3 vehículos (`VH-01`…`VH-03`) |
| Campañas | `pnpm --filter api seed:campaigns` | 12 campañas (`CAMP-2026-0001`…`CAMP-2026-0012`) repartidas entre `draft`, `planned`, `confirmed`, `in_field`, `needs_reschedule` y `completed`, cada una con sitio (round-robin de los 6) y parámetros del catálogo, sin ventanas ni reservas |


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

