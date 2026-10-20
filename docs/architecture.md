# Arquitectura de TerraPlan

Diagramas de referencia rápida. Las decisiones están justificadas en [`adr/`](adr/) y el glosario de
dominio en [`glossary.md`](glossary.md).

## 1. Módulos del backend

Dependencia unidireccional `Controller → Service → Repository → Entity/DB`. Un módulo exporta solo su
service; el dominio puro (`scheduling`, `weather`, `campaign-status`) no conoce Nest.

```mermaid
flowchart LR
  subgraph API[NestJS API · /api/v1]
    auth[auth]
    users[users]
    sites[sites]
    catalog[catalog]
    tech[technicians]
    equip[equipment]
    veh[vehicles]
    camp[campaigns]
    res[reservations]
    sched[scheduling]
    weather[weather]
    events[events]
    integ[integration]
  end

  auth --> users
  camp --> catalog
  camp --> sites
  camp --> events
  res --> camp
  res --> tech
  res --> equip
  res --> veh
  res --> events
  sched --> camp
  sched --> catalog
  weather --> camp
  weather --> events
  integ --> camp
  integ --> catalog
  integ --> events

  users --> pg[(PostgreSQL)]
  sites --> pg
  tech --> pg
  equip --> pg
  veh --> pg
  camp --> pg
  res --> pg
  events --> mongo[(MongoDB)]
  weather -.->|Open-Meteo / caudal simulado| openmeteo[[Open-Meteo]]
  integ -.->|POST /ingest/observations| aqua[[AquaMetric]]
```

`scheduling` y `weather` llaman a `CampaignsService` para leer la campaña y sus parámetros; nunca
acceden a su repositorio. `reservations` es el único módulo que escribe `resource_booking`.

## 2. Flujo de reserva atómica

Los tres `INSERT` comparten una transacción: si uno viola la exclusion constraint, no queda ninguna
reserva parcial ([ADR-001](adr/001-atomic-booking.md)).

```mermaid
sequenceDiagram
  autonumber
  participant C as Controller<br/>POST /campaigns/:id/reservations
  participant S as ReservationsService
  participant R as ReservationsRepository
  participant DB as PostgreSQL (EXCLUDE USING gist)
  participant E as EventsService (Mongo)

  C->>S: bookTriple(campaignId, dto, actorId)
  S->>S: valida ventana (≤ 24 h, futura) y estado de campaña
  S->>DB: BEGIN
  loop técnico · equipo · vehículo
    S->>R: INSERT ... tstzrange($4, $5, '[)')
    R->>DB: INSERT
    alt rango libre
      DB-->>R: fila creada
    else solapamiento
      DB-->>R: SQLSTATE 23P01
      R-->>S: ResourceConflictError(resourceCode)
      S->>DB: ROLLBACK
      S-->>C: 409 RESOURCE_CONFLICT
    end
  end
  S->>DB: COMMIT
  S->>E: record(booking.created) · best-effort
  S-->>C: 201 con las 3 reservas
```

## 3. Ciclo de vida de la campaña

Las transiciones válidas viven en `campaign-status.domain.ts`; cualquier otra devuelve
`INVALID_STATE_TRANSITION` (409).

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> planned
  draft --> cancelled
  planned --> confirmed
  planned --> draft
  planned --> cancelled
  confirmed --> in_field
  confirmed --> needs_reschedule
  confirmed --> cancelled
  in_field --> completed
  in_field --> cancelled
  needs_reschedule --> planned
  needs_reschedule --> cancelled
  completed --> cancelled
  completed --> [*]
  cancelled --> [*]
```

## 4. Despliegue (free tier)

```mermaid
flowchart LR
  browser[Tablet / notebook del coordinador] -->|HTTPS| vercel[Vercel<br/>React 19 + Vite]
  vercel -->|REST /api/v1| render[Render<br/>API NestJS en Docker]
  render -->|tipo 5432| neon[(Neon PostgreSQL 16<br/>btree_gist)]
  render -->|27017| atlas[(Atlas M0<br/>log de eventos)]
  render -->|idempotencia + API key| aqua[AquaMetric FastAPI]
  uptime[UptimeRobot] -->|GET /api/v1/health cada 5 min| render
```

Render free duerme el servicio tras ~15 min sin tráfico; el primer request puede tardar 30–50 s.
UptimeRobot mantiene el contenedor caliente. Pasos manuales en [`deploy.md`](deploy.md).
