# 03 · Flujos de automatización — TerraPlan

> Objetivo: **máximo avance con mínimo gasto de tokens y mínima verificación proporcional al riesgo.**
> Proyecto greenfield de 2–3 semanas: priorizar *MVP desplegado* sobre perfección.

## 1. Economía de tokens (REGLAS DURAS)

1. **Reportar diff stat, no archivos.** Tras editar: nombre de archivo + `+N/−M` + 1 línea del porqué. Jamás pegar archivos completos en el chat.
2. **Máximo 2 edits por archivo por turno.** Si hace falta más, reescribir el bloque/función completo en un solo edit.
3. **Leer con rango.** Usar `offset/limit` o `grep` para ubicar; no leer archivos enteros salvo que se vaya a reescribir. No releer un archivo recién editado.
4. **No listar el repo** (`ls -R`, `tree`) ni abrir `node_modules`, `dist`, `coverage`, lockfiles. Usar rutas conocidas (ver `01`).
5. **Un solo plan corto** (≤ 5 viñetas) antes de empezar una tarea de > 3 archivos; no re-planificar a cada paso.
6. **Respuesta final ≤ 8 líneas**: qué se hizo · qué se verificó (nivel) · qué queda. Sin recapitular pasos.
7. **No ejecutar tests completos tras cada edit** (ver niveles). No correr nada "por si acaso".
8. **No repetir** contexto de `.clinerules` en las respuestas. No explicar código obvio.
9. **Preguntar solo si bloquea** y agrupar todas las dudas en un mensaje (máx. 3 preguntas, con opción recomendada).
10. Salida de comandos: usar `--silent`/`-q`, `| tail -20`, o filtrar errores. Reportar solo fallas.
11. **Si un edit rompe la sintaxis:** `git checkout -- <archivo>` (o revertir el bloque) y **rehacer el bloque completo**. Nunca apilar edits sobre un error.

## 2. Niveles de verificación (proporcionales al riesgo)

| Nivel | Cuándo | Qué correr | Costo |
|---|---|---|---|
| **N0** | Texto/markdown/comentarios/CSS puro/`.md`/docs | Nada (revisión visual del diff) | ≈ 0 |
| **N1** | Cambios locales sin lógica nueva: DTO, constantes, estilos, copy, componente presentacional | `pnpm --filter <api\|web> typecheck` (+ `lint` solo sobre archivos tocados) | bajo |
| **N2** | Lógica de negocio, service, repository, domain, hook con efectos | N1 + **tests del módulo tocado** (`pnpm --filter api test -- <patrón>`) | medio |
| **N3** | Migraciones, reservas, auth, config, antes de commit de feature o PR | `lint` + `typecheck` + `test` completo + `test:int` relevante + `build` | alto |

Reglas de selección:
- **Duda entre dos niveles → el menor**, salvo que toque: migraciones, `reservations/`, `auth/`, `common/filters`, `docker-compose`, `catalog/`. Esos son **N3**.
- Integración (Testcontainers) **solo** si cambió BD, reservas o repositories. Requiere Docker: si no está disponible, **avisar** y no fingir verificación.
- Frontend: N1 por defecto; N2 si hay lógica; `build` solo en N3.

## 3. Comandos (palabras clave de Cristóbal)

### `verificación post-edit` (automática, tras cada tarea)
1. Determinar nivel (N0–N3) con la tabla.
2. Ejecutar solo lo de ese nivel.
3. Reportar: `Nivel Nx · OK` o `Nivel Nx · FALLA: <1–3 líneas>`. Si falla, arreglar **solo si el fallo es de la propia edición**; si es preexistente → reportar (ver `05`).

### `health check`
Diagnóstico rápido del entorno (sin modificar nada):
1. `git status -sb` (rama, cambios sin commitear).
2. `docker compose ps` (¿postgres y mongo arriba?).
3. `pnpm --filter api typecheck` y `pnpm --filter web typecheck`.
4. `pnpm --filter api test` (solo unit).
5. Revisar: ¿`api/.env.example` coincide con las variables usadas? ¿hay `package-lock.json`/`yarn.lock`? ¿`.env` ignorado?
**Salida:** tabla de ≤ 8 filas `Chequeo · Estado · Nota`. No arreglar; proponer.

### `clean commit`
1. `git status -sb` + `git diff --stat`.
2. **Verificación mínima** (`05-cleanup-rules.md` §5) según nivel del cambio.
3. Revisar basura (console.log, TODO sin dueño, archivos fuera de lugar, secretos, lockfiles ajenos). **Reportar, no arreglar sin aprobación.**
4. Proponer **mensaje Conventional Commit en inglés** (`feat(reservations): add atomic triple booking`), 1 línea ≤ 72 caracteres + cuerpo opcional de ≤ 3 líneas.
5. Esperar aprobación antes de `git commit`. Un commit = un cambio lógico. Nunca `git add .` a ciegas: añadir archivos por nombre.
6. Tras `git commit` y con N2/N3 en verde, ejecutar `git push origin main` y verificar el workflow `CI` en GitHub Actions. Si CI falla, el fallo se arrastra como deuda a la siguiente rebanada (no se abre tarea separada). Reportar URL del run.

**Tipos:** `feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `perf` · `ci` · `build`.
**Scopes:** `auth` · `sites` · `catalog` · `resources` · `campaigns` · `reservations` · `scheduling` · `weather` · `events` · `integration` · `web` · `db` · `docker` · `k6` · `docs`.

### `cerrar feature`
Checklist (marcar cada ítem; reportar solo los pendientes):
1. [ ] Criterio de aceptación de la feature cumplido (probado a mano o por test).
2. [ ] Verificación **N3** del área afectada en verde.
3. [ ] Migraciones aplicadas y revertibles; `catalog/` versionado si cambió.
4. [ ] Swagger actualizado (DTOs con `@ApiProperty`).
5. [ ] `api/.env.example` actualizado si hay variables nuevas.
6. [ ] **README:** sección de la feature, tabla de endpoints o badge si aplica.
7. [ ] **ADR** si hubo decisión de arquitectura (`docs/adr/NNN-*.md`).
8. [ ] **Diagrama** (`docs/architecture.md`, Mermaid) actualizado si cambió un flujo/módulo.
9. [ ] **Glosario** (`docs/glossary.md`) con los términos nuevos, en lenguaje simple para el químico.
10. [ ] UI: checklist de `docs/design-system.md` §13 + estados carga/vacío/error.
11. [ ] Recordar a Cristóbal: **capturar GIF/pantallazo** de la feature para el README.
12. [ ] `clean commit` propuesto.
13. [ ] `git push` ejecutado y workflow `CI` en verde (reportar URL del run).

### `cerrar semana`
Resumen (≤ 10 líneas) contra el plan de 3 semanas (`01` §1): hecho · pendiente · riesgo de plazo · **qué recortar** si hay atraso. Actualizar tabla de progreso en el README.

### `preparar deploy`
1. Variables de producción listadas (sin valores). 2. `docker build` de `api` OK. 3. Migraciones corren contra Neon. 4. `GET /health` OK. 5. CORS apunta al dominio de Vercel. 6. UptimeRobot configurado. 7. Seed demo cargado. 8. README con enlace a la demo viva. Verificar condiciones vigentes de los free tiers antes de desplegar.

## 4. Orden de construcción (greenfield) — rebanadas verticales

Construir **una rebanada completa a la vez** y cerrarla (`cerrar feature`) antes de la siguiente:

`migración → entity → repository → service/domain → controller+DTO → test (nivel justo) → UI mínima`

Orden sugerido: (1) scaffold + Docker + config → (2) auth/roles → (3) catálogo → (4) sitios y recursos → (5) **reserva atómica + test de carrera** → (6) ventanas factibles → (7) campañas (estados) → (8) weather/flow gate + reprogramación → (9) eventos Mongo → (10) integración AquaMetric → (11) pantallas → (12) k6 + deploy + docs.

## 5. Guardarraíles de plazo (MVP)

- **Regla de las 8 h:** si una tarea supera ~1 jornada, detenerse y proponer un recorte de alcance (con opciones) antes de continuar.
- Prioridad ante atraso: reserva atómica > ventanas factibles > reprogramación > integración > UI extra > k6 > extras.
- No añadir librerías, módulos ni pantallas fuera de `01` §1 sin aprobación.
- "Suficientemente bueno y desplegado" > "perfecto y local".

## 6. k6 (carga) — mínimo viable

- `k6/reservation-race.js`: VUs concurrentes reservando el mismo recurso/ventana ⇒ verificar **exactamente 1** 201 y el resto 409; umbral `http_req_failed` solo para 5xx = 0.
- `k6/read-load.js`: lectura de agenda; umbral p95 < 500 ms (free tier, ajustar a la realidad).
- Guardar resumen en `docs/performance.md` (tabla con p95, RPS, errores) y enlazarlo desde el README.
