# ADR-006 · Evento a Mongo después del commit (best-effort)

- **Estado:** aceptada
- **Fecha:** 2026-10-20
- **Contexto del proyecto:** TerraPlan (Node.js 24 + NestJS 12 + PostgreSQL 16 + MongoDB)

## Contexto

Cada operación de negocio (crear campaña, reservar, transicionar, publicar a AquaMetric) debe quedar
en el log de auditoría de MongoDB ([ADR-002](002-mongo-events.md)). La fuente de verdad es
PostgreSQL y el log vive en otra base de datos, así que escribir ambos "a la vez" exigiría una
transacción distribuida (two-phase commit o sagas): infraestructura y complejidad que el MVP no
justifica.

Las dos alternativas obvias tienen un costo peor:

- **Escribir el evento dentro de la transacción de PostgreSQL**: si MongoDB falla o tarda, se
  aborta la reserva. Un log de auditoría no puede bloquear la operación que audita.
- **Escribir el evento antes del commit**: el log puede registrar un cambio que después se revierte
  (rollback por `23P01`), dejando auditoría falsa.

## Decisión

El evento se escribe **después** del commit de PostgreSQL, de forma **best-effort**:

1. El service confirma la operación de negocio (transacción cerrada y respuesta armada).
2. Recién entonces llama a `EventsService.record`.
3. `record` reintenta **una vez** (500 ms de backoff) y **nunca lanza**: si ambos intentos fallan,
   loguea el error con `requestId` y `campaignId` y la respuesta HTTP no cambia.
4. Un evento perdido se detecta por el `requestId` en los logs y se reconstruye desde PostgreSQL;
   el log nunca se usa para recalcular reglas de negocio.

En la publicación a AquaMetric el orden es el mismo: primero `POST` al servicio hermano, y solo si
AquaMetric acepta el lote se emite `observations_published`.

## Consecuencias

**Positivas**

- Cero transacciones distribuidas y cero acoplamiento de disponibilidad: Mongo puede estar caído y
  las reservas siguen funcionando.
- La auditoría nunca contiene eventos de operaciones que hicieron rollback.
- El código es trivial de razonar: `await this.eventsService.record(...)` en una sola línea.

**Negativas**

- Ventana de pérdida: si el proceso muere entre el commit y la escritura del evento, ese evento no
  existe. Se acepta para auditoría operativa (TTL 90 días), no para cumplimiento normativo.
- Si el log se necesita para reconstruir un incidente, hay que cruzar PostgreSQL + logs de la API.
- Un reintento exitoso puede duplicar un documento si el primer intento sí llegó a Mongo; el log es
  append-only y los consumidores lo tratan como "al menos una vez".
