# ADR-001 · Reserva atómica con `EXCLUDE USING gist`

- **Estado:** aceptada
- **Fecha:** 2026-10-19
- **Contexto del proyecto:** TerraPlan (Node.js 24 + NestJS 12 + PostgreSQL 16)

## Contexto

Una campaña de muestreo requiere reservar, para una misma ventana de tiempo, un **técnico**, un
**equipo** y un **vehículo**. El doble booking es inaceptable: dos campañas no pueden usar el mismo
recurso en horarios que se solapan, y la comprobación debe seguir siendo válida aunque dos
coordinadores reserven exactamente al mismo tiempo.

Las alternativas habituales no cumplen ese requisito:

- **Consultar disponibilidad y luego insertar** desde la aplicación: sufre condición de carrera
  (time-of-check to time-of-use). Dos transacciones pueden ver el recurso libre e insertar ambas.
- **Bloquear filas con `SELECT ... FOR UPDATE`**: funciona, pero requiere un modelo de filas de
  disponibilidad por recurso y hace la lógica de rangos más frágil y difícil de auditar.
- **Validar solo en la capa de servicio**: la garantía depende de que todo el código (y todo el
  futuro código) respete la regla; un script, una migración manual o un bug la rompen.

Necesitamos que la garantía viva en la base de datos, que es el único punto común a todos los
clientes del sistema.

## Decisión

Garantizar la exclusión mutua con una **exclusion constraint** de PostgreSQL sobre un rango
`tstzrange`, habilitando la extensión `btree_gist` (necesaria para combinar igualdad de `uuid` con
solapamiento de rangos en un índice GiST):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE resource_booking (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaign(id),
  resource_type text NOT NULL CHECK (resource_type IN ('technician', 'equipment', 'vehicle')),
  resource_id   uuid NOT NULL,
  during        tstzrange NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_double_booking
    EXCLUDE USING gist (resource_id WITH =, during WITH &&)
    WHERE (status = 'active')
);
```

Reglas de implementación asociadas:

1. Reservar técnico + equipo + vehículo son **tres `INSERT` en una única transacción**: si
   cualquiera viola el constraint, se revierte todo (no quedan reservas parciales).
2. El *repository* captura el SQLSTATE **`23P01`** (`exclusion_violation`) y lo traduce a
   `ResourceConflictError`; el filtro global responde **409 `RESOURCE_CONFLICT`**.
3. Queda **prohibido** usar "consultar disponibilidad y luego insertar" como mecanismo de
   seguridad. Consultar disponibilidad sirve solo para *sugerir* ventanas factibles.
4. El rango es semiabierto `[start, end)`: reservas consecutivas no se consideran solapadas.
5. `tstzrange` no está soportado por TypeORM: estos `INSERT` se ejecutan con
   `queryRunner.query()` y parámetros (`$1`, `$2`, ...) en `reservations.repository.ts`.
6. Test obligatorio de carrera: N solicitudes concurrentes al mismo recurso y ventana ⇒
   exactamente 1 éxito y N−1 conflictos (Testcontainers + `Promise.all`).

## Consecuencias

**Positivas**

- El doble booking es **imposible** a nivel de base de datos, sin importar el cliente ni el
  camino de código que ejecute la reserva.
- La regla queda documentada en el esquema y se audita con la propia migración.
- Las reservas liberadas (`status = 'released'`) no bloquean el índice parcial, por lo que
  reprogramar no requiere `DELETE`.

**Negativas / costos**

- Requiere PostgreSQL (no portable a otros motores) y la extensión `btree_gist`; hay que verificar
  que esté disponible en el proveedor (Neon) durante la semana 1.
- TypeORM no modela `tstzrange` ni exclusion constraints: el esquema se mantiene con **SQL
  explícito en migraciones** y el acceso a esas columnas con SQL parametrizado.
- La transacción que falla debe manejarse como error de negocio (409) y no como error 500; el
  mapeo de `23P01` es parte crítica del repository.
- El índice GiST añade un costo de escritura pequeño, irrelevante para el volumen del MVP.
