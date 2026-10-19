# ADR-002 · MongoDB solo para log de eventos append-only

- **Estado:** aceptada
- **Fecha:** 2026-10-19
- **Contexto del proyecto:** TerraPlan (Node.js 24 + NestJS 12 + PostgreSQL 16 + MongoDB)

## Contexto

TerraPlan registra cada cambio de estado de campaña, cada movimiento de reservas y cada evento de
integración con servicios externos. Esos eventos **no comparten estructura**: un
`booking.created` describe recursos y rangos de tiempo, un `status.changed` describe estados
anterior y nuevo, un `weather.blocked` describe umbrales y lecturas del proveedor climático, y un
`observations.published` describe un lote enviado a AquaMetric.

Almacenarlos en PostgreSQL exigiría columnas nullable para cada variante o un `JSONB` genérico.
En ambos casos se pierde la flexibilidad que la auditoría necesita: agregar un tipo de evento
obligaría a una migración (o a un campo opaco imposible de validar por tipo).

Además, el log **no participa en las reglas de negocio**. Es auditoría, no fuente de verdad: ninguna
decisión de reserva, de ventana factible ni de cambio de estado se calcula leyendo el log.

## Decisión

Usar **MongoDB** (Atlas M0 free) únicamente para la colección `campaign_events`. Cada evento es un
documento con:

| Campo | Contenido |
|---|---|
| `campaignId` | UUID de la campaña afectada (índice) |
| `type` | `booking.created`, `status.changed`, `weather.blocked`, `observations.published`, … |
| `payload` | Objeto libre con los datos propios de ese tipo de evento |
| `actorId` | UUID del usuario que disparó el evento |
| `requestId` | Correlation id de la petición HTTP |
| `at` | Instante UTC del evento |

Reglas asociadas:

1. La colección es **append-only**: no se actualizan ni se borran documentos.
2. El evento se escribe **después** del `COMMIT` a PostgreSQL (best-effort con reintento, ver
   ADR-006), nunca antes ni dentro de la transacción de reservas.
3. Las consultas del log se limitan a `campaignId` + rango temporal (`at`); no se hacen joins con
   datos relacionales.
4. Un fallo de MongoDB **nunca** revierte una operación ya confirmada en PostgreSQL.

## Consecuencias

**Positivas**

- Esquema flexible por tipo de evento: agregar un `type` nuevo no requiere migración.
- El log queda aislado del camino transaccional de reservas: su latencia y sus fallos no afectan la
  agenda.
- Un corte de MongoDB no invalida reservas confirmadas: la fuente de verdad sigue en PostgreSQL.
- La colección append-only es barata de consultar por campaña y de auditar.

**Negativas / costos**

- No hay joins con datos relacionales: el log se lee solo por `campaignId` y rango temporal, y la UI
  debe resolver los nombres con los datos de PostgreSQL.
- Hay que operar dos motores (dos conexiones, dos estrategias de respaldo y dos historias de
  migración conceptual distintas).
- El log no es transaccional con la reserva: si fallan los reintentos, puede faltar un evento. Se
  acepta para el MVP y se cubre con un job de reconciliación fuera del alcance inicial.
