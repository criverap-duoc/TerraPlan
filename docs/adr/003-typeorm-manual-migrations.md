# ADR-003 · TypeORM con migraciones SQL a mano

- **Estado:** aceptada
- **Fecha:** 2026-10-20
- **Contexto del proyecto:** TerraPlan (Node.js 24 + NestJS 12 + PostgreSQL 16)

## Contexto

El esquema de TerraPlan tiene dos requisitos que no encajan en un ORM declarativo:

1. `resource_booking.during` es un `tstzrange` y la garantía anti doble-booking es una
   `EXCLUDE USING gist` (ver [ADR-001](001-atomic-booking.md)).
2. Los índices parciales, los `CHECK` de estados y los tipos `numeric` necesitan control fino.

Opciones evaluadas:

- **Prisma**: excelente DX, pero sin soporte para exclusion constraints ni rangos; obligaría a SQL
  crudo igualmente y a un cliente distinto al de Nest.
- **TypeORM con `synchronize: true`**: cómodo en desarrollo, peligroso en producción; puede borrar
  columnas y no expresa constraints de exclusión.
- **TypeORM con migraciones generadas automáticamente**: el generador no entiende `tstzrange` y
  produce diffs erráticos con índices parciales.
- **SQL manual en migraciones de TypeORM**: verboso, pero explícito y versionado.

## Decisión

TypeORM 0.3 + `@nestjs/typeorm` con **`synchronize: false` siempre**. Cada cambio de esquema es una
migración escrita a mano en `api/src/database/migrations/` y aplicada con
`pnpm --filter api migration:run`; nunca se edita una migración ya aplicada.

Reglas asociadas:

- Las entidades mapean lo que TypeORM sí entiende; `during` y los `INSERT` con `tstzrange` se
  ejecutan con `queryRunner.query()` y parámetros (`$1`), nunca con SQL interpolado.
- Los errores de PostgreSQL se traducen en el *repository* (`23P01` → `ResourceConflictError`).
- `numeric` vuelve como `string`: se convierte explícitamente en los DTOs.
- El CLI usa `api/src/database/data-source.ts` (con `dotenv`) para correr fuera de Nest.

## Consecuencias

**Positivas**

- El esquema real (rangos, constraints, índices parciales) está en el repositorio y es auditable.
- Sin sorpresas de sincronización: la base de datos solo cambia cuando una migración lo dice.
- Portabilidad a Neon directa: se aplican las mismas migraciones contra el `DATABASE_URL` remoto.

**Negativas**

- Más trabajo manual: cada cambio requiere escribir SQL y probarlo (Testcontainers corre las
  migraciones reales en los tests de integración).
- La entidad y la tabla pueden divergir si alguien olvida migrar; lo cubren `test:int` y la revisión.
