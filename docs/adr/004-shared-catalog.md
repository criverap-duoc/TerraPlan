# ADR-004 · Catálogo compartido versionado en `/catalog`

- **Estado:** aceptada
- **Fecha:** 2026-10-20
- **Contexto del proyecto:** TerraPlan (NestJS) y AquaMetric (FastAPI)

## Contexto

Parámetros, unidades y límites normativos deben ser **idénticos** en ambos proyectos: si TerraPlan
ofrece `TURB` con una unidad canónica y AquaMetric espera otra, las observaciones publicadas quedan
inconsistentes. Duplicar el catálogo en dos bases de datos o en dos archivos distintos garantiza que
se desincronicen.

Tampoco sirve cargarlo "desde la base de datos de TerraPlan": AquaMetric debe poder leer el catálogo
sin depender de que TerraPlan esté arriba.

## Decisión

El catálogo vive en `/catalog` en este repositorio, como **JSON versionado y de solo lectura**:

- `catalog.meta.json` guarda `version`, `updatedAt` y el `sha256` de los cuatro archivos de datos.
- TerraPlan lo lee al arrancar (`CatalogService`, rutas candidatas relativas a `cwd` y a `dist`) y
  **falla al iniciar** si falta o no valida: es un contrato, no un dato opcional.
- AquaMetric lo copia con su script de sincronización y verifica el `sha256`.
- Cambiar el catálogo exige subir `version` y regenerar el checksum con
  `pnpm catalog:checksum --write`; un cambio incompatible requiere ADR.
- La API lo expone en `/api/v1/catalog` (público, solo lectura) y los DTOs validan `parameterCode` y
  `unitCode` contra el catálogo cargado. Los códigos nunca se escriben a mano en el código.

## Consecuencias

**Positivas**

- Una sola fuente de verdad, con checksum verificable y sin base de datos intermedia.
- Revisar un cambio de límite o de tiempo de conservación es un *diff* de JSON en un PR.
- `CatalogService` es puro en memoria: cero latencia y cero dependencias externas en el camino
  crítico de una reserva.

**Negativas**

- Un cambio de catálogo requiere redeploy de la API para tomar efecto (no hay recarga en caliente).
- El `sha256` debe regenerarse en el mismo commit o el arranque falla (por eso existe el script).
- El contenido normativo lo valida el químico: hasta entonces el límite queda en `draft` y la UI lo
  muestra como "Pendiente de validación".
