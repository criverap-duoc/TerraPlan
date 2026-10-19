# 05 · Reglas de limpieza — TerraPlan

> Objetivo: repo **siempre presentable** (lo revisa un reclutador) con **cero desperdicio de tokens**.
> Principio: **reportar, no arreglar sin aprobación** todo lo que quede fuera del alcance de la tarea actual.

## 1. Anti-basura (prohibido commitear / dejar en el repo)

| Categoría | Ejemplos |
|---|---|
| Depuración | `console.log`/`console.debug`, `debugger`, `print` olvidados (usar el `Logger` de Nest) |
| Código muerto | Código comentado, funciones/imports/variables sin uso, archivos huérfanos, exports sin consumidores |
| Pendientes sin dueño | `TODO` sin formato. Permitido solo: `// TODO(#<issue>): <acción>` |
| Tests deshabilitados | `.only`, `.skip`, `xit`, `fdescribe` |
| Artefactos | `dist/`, `coverage/`, `.turbo/`, `*.log`, `.DS_Store`, `node_modules/`, volcados de BD |
| Secretos | `.env`, claves, tokens, URLs con credenciales (⇒ **detener y avisar**) |
| Lockfiles ajenos | `package-lock.json`, `yarn.lock` (solo `pnpm-lock.yaml`) |
| Archivos de trabajo | `notes.md`, `temp.*`, `test2.ts`, `copy of …`, `*.bak`, `*.orig` |
| Tipos flojos | `any`, `// @ts-ignore` (usar `// @ts-expect-error` **con motivo** y solo si es inevitable) |
| Estilos | Colores hex/oklch sueltos, clases de paleta Tailwind, `style={{…}}` con valores fijos, CSS fuera de `globals.css` |
| Dependencias | Paquetes agregados sin necesidad, duplicados, o no usados |
| Texto de relleno | "Lorem ipsum", "foo/bar", datos demo sin sentido |

`.gitignore` mínimo: `node_modules`, `dist`, `coverage`, `.env`, `.env.*` (excepto `.env.example`), `*.log`, `.DS_Store`, `.idea`, `.vscode/*` (excepto `extensions.json` y `settings.json`), `pgdata`, `mongodata`.

## 2. Reportar, no arreglar (protocolo)

Si durante una tarea se detecta algo **fuera del alcance** (bug preexistente, deuda, inconsistencia, basura de la sección 1):

1. **No tocarlo.**
2. Reportarlo al final, en **≤ 3 líneas** por hallazgo, con este formato:
   `⚠ <archivo>:<línea> — <qué es> — Propuesta: <arreglo en 1 frase> (esfuerzo S/M/L)`
3. Agrupar todos los hallazgos en un único bloque "Hallazgos" (máx. 5; si hay más, resumir por categoría).
4. Esperar aprobación para arreglar. Excepciones (se arregla sin preguntar): errores introducidos **por la propia edición**.

## 3. Indentación y formato (estricto)

| Tipo de archivo | Regla |
|---|---|
| `.ts` `.tsx` `.js` `.json` `.yml` `.yaml` `.css` `.md` | **2 espacios**. Nunca tabs |
| `.sql` (migraciones) | 2 espacios; palabras clave en MAYÚSCULAS; un statement por bloque |
| `Dockerfile`, `.sh` | 2 espacios (heredocs y `\` alineados) |
| Fin de línea | **LF** (no CRLF). UTF-8. Línea en blanco final |
| Prettier | `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 100` |

- Mantener `.editorconfig` en la raíz (`indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`).
- Antes de editar un archivo, **respetar su indentación existente**. No reformatear archivos enteros salvo que se pida (genera diffs enormes y gasta tokens).
- Un `Edit` que deje el archivo con sintaxis rota ⇒ **revertir y reescribir el bloque completo** (ver `03` §1.11). Jamás encadenar parches sobre un error.
- JSON/YAML: no dejar comas colgantes ni claves duplicadas; validar tras editar.

## 4. Tamaño y claridad

- Archivo > 300 líneas o función > 50 líneas ⇒ **reportar** (no refactorizar sin aprobación).
- Un archivo = una responsabilidad. Nada de `utils.ts`/`helpers.ts` cajón de sastre: nombrar por función (`format-duration.ts`).
- Nombres que se expliquen solos; comentarios solo para el *porqué*.
- Sin dependencias circulares entre módulos. Sin imports relativos profundos (`../../../`): usar alias `@/`.

## 5. Verificación mínima ANTES de cada commit

| Si el cambio toca… | Mínimo exigido |
|---|---|
| Solo docs/markdown | Revisión visual del diff (N0) |
| UI / DTO / constantes | `typecheck` + `lint` del paquete (N1) |
| Lógica (service/domain/repository/hook) | N1 + tests del módulo (N2) |
| Migraciones, reservas, auth, config, Docker, catálogo | N3 completo (`lint`, `typecheck`, `test`, `test:int` relevante, `build`) |

Además, **siempre**: `git diff --stat` revisado · sin secretos · sin archivos de la sección 1 · mensaje Conventional Commit en inglés propuesto y **aprobado** por Cristóbal.

## 6. Higiene de dependencias y config

- Antes de agregar un paquete: ¿ya existe algo equivalente en el stack? Si no, justificar en 1 línea y fijar versión.
- Eliminar dependencias sin uso solo con aprobación (reportar con `pnpm exec depcheck` si se pide).
- `api/.env.example` siempre sincronizado con las variables reales (sin valores secretos).
- Migraciones: nunca editar una ya aplicada; nombres descriptivos (`1710000000000-add-resource-booking.ts`).

## 7. Higiene de documentación (portafolio)

Al cerrar cada feature o semana, verificar y **recordar a Cristóbal**:

- [ ] README actualizado (badges vigentes, tabla de endpoints, instrucciones de arranque funcionan en limpio).
- [ ] ADR creado/actualizado para cada decisión relevante.
- [ ] Diagrama de arquitectura (Mermaid) al día.
- [ ] GIF/capturas de la UI nuevas (para el README).
- [ ] `docs/glossary.md` con términos nuevos (lenguaje simple, para el químico).
- [ ] Enlace cruzado a AquaMetric y a la demo viva.

## 8. Anti-desperdicio (recordatorio final)

- No releer archivos recién editados; no listar directorios completos; no pegar archivos en el chat.
- No correr suites completas fuera de N3; no repetir una verificación que ya pasó y no cambió.
- Un hallazgo = una línea. Un cierre de tarea = ≤ 8 líneas.
- Si algo es ambiguo y **no bloquea**, tomar la opción recomendada, decirlo en una línea y seguir.
