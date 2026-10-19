# 04 · Directivas UI/UX — TerraPlan (frontend `web/`)

> **Fuente de verdad visual: `docs/design-system.md`.** Este archivo dice *cómo aplicarlo*. No duplicar tokens aquí.
> Leer el design system **solo al crear o modificar UI** y **solo la sección necesaria** (ahorro de tokens). Nunca pegarlo en las respuestas.
> Meta: que se vea como una herramienta profesional (lo que ve el reclutador) **sin** retrasar el MVP: el design system acelera, no frena.

## 1. Orden de arranque del frontend (una sola vez)

1. `pnpm create vite web --template react-ts` → limpiar demo. Alias `@/` en `tsconfig` y `vite.config.ts`.
2. `pnpm --filter web add tailwindcss @tailwindcss/vite tw-animate-css lucide-react` (Tailwind 4 vía plugin de Vite, sin `tailwind.config.js`).
3. `pnpm dlx shadcn@latest init` (estilo *new-york*, color base *neutral*; **luego sustituir** `globals.css` por el bloque de `docs/design-system.md` §3).
4. Fuentes: `pnpm --filter web add @fontsource-variable/inter @fontsource-variable/jetbrains-mono` e importarlas en `main.tsx`. Verificar que los nombres de `font-family` coinciden con `--font-sans`/`--font-mono`.
5. `<html lang="es-CL">` y clase `dark` aplicable al `<html>` (toggle después).
6. Componentes base: `pnpm dlx shadcn@latest add button card input label select textarea badge table skeleton dialog sheet dropdown-menu tabs tooltip sonner form`.
7. Crear `lib/format.ts` (es-CL, `America/Santiago`), `lib/api-client.ts`, `components/domain/`.

## 2. Reglas de oro (obligatorias en TODO cambio de UI)

1. **Solo tokens semánticos.** Prohibido: hex, `rgb()`, `oklch()` sueltos, clases de paleta (`bg-green-600`, `text-gray-500`), valores arbitrarios (`p-[13px]`, `w-[317px]`). Usar `bg-primary`, `text-muted-foreground`, `border-input`, etc.
2. **Estado = color + ícono + texto.** Nunca solo color.
3. **Todo dato remoto tiene 4 estados:** carga (Skeleton con la forma final), vacío (ícono + ayuda + CTA), error (banner `destructive-soft` + reintentar + `requestId`), éxito.
4. **Mobile-first.** Escribir el estilo base para 390 px y escalar con `md:`/`lg:`/`xl:`. Zonas táctiles ≥ 44 px (botones `md`/`lg`; `sm` solo en tablas de escritorio).
5. **Componentes de shadcn primero.** No reinventar botones, diálogos ni selects. Personalizar con variantes (`cva`) y tokens, no copiando estilos sueltos.
6. **Números, códigos, horas y unidades** en `font-mono tabular-nums`, formateados con `lib/format.ts`.
7. **Accesibilidad:** foco visible, `label` visible en cada campo, `aria-label` en botones-ícono, `aria-live`/`role="alert"` en errores, `aria-current` en navegación, estructura de encabezados h1→h2→h3 sin saltos.
8. **Textos de UI en español claro (es-CL).** Usar el glosario (§5). Sin jerga de programador en pantalla.
9. **Sin librerías de UI nuevas** (MUI, Ant, etc.) ni CSS aparte. Íconos solo `lucide-react`.
10. **Un h1 por página**, con el título y la acción principal (1 botón `primary` por vista).

## 3. Cheat-sheet de tokens (resumen; detalle en el design system)

| Necesito… | Usar |
|---|---|
| Fondo de página / texto | `bg-background text-foreground` |
| Card | `bg-card text-card-foreground border rounded-lg shadow-card p-4 sm:p-6` |
| Texto secundario | `text-muted-foreground` |
| Acción principal | `<Button>` (variant `default` = primary) |
| Acción alternativa / neutra / sutil / peligrosa | `secondary` · `outline` · `ghost` · `destructive` |
| Borde de campo | `border-input` · foco `ring-2 ring-ring ring-offset-2` |
| Badge OK / atención / error / info | `bg-success-soft text-success-soft-foreground` · `warning-soft` · `destructive-soft` · `info-soft` |
| Radio | `rounded-lg` (cards, inputs) · `rounded-md` (botones) · `rounded-full` (badges) |
| Sombra | `shadow-card` (reposo) · `shadow-pop` (menús/diálogos) |
| Gráfico/serie | `--chart-1…5` (+ etiqueta/patrón) |
| Tipografía | h1 `text-3xl font-semibold tracking-tight` · h2 `text-2xl` · h3 `text-xl` · body `text-base` · small `text-sm` · caption `text-xs text-muted-foreground` |
| Contenedor | `mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8` |
| Grid dashboard | `grid grid-cols-1 gap-4 md:grid-cols-6 lg:gap-6 xl:grid-cols-12` |

**Mapa de estados de campaña → badge:** ver `docs/design-system.md` §3.1 (draft, planned, confirmed, in_field, completed, needs_reschedule, cancelled). Implementar **una sola vez** en `components/domain/campaign-status-badge.tsx` y reutilizar.

## 4. Layout y responsive

- **App shell:** `< lg` top bar 56 px + **bottom nav** 64 px (Agenda · Campañas · Recursos · Perfil; con `safe-area-inset-bottom`). `≥ lg` sidebar 256 px colapsable.
- Tablas: `≥ md` tabla real (sticky header, orden, paginación server-side 10/25/50); `< md` **lista de cards** (sin scroll horizontal).
- Formularios largos (nueva campaña) = **wizard por pasos** en móvil: 1) Sitio y parámetros → 2) Ventanas factibles → 3) Recursos y confirmación.
- Diálogos → `Sheet` inferior en móvil.
- Probar mentalmente a **390 px** y **1280 px** antes de cerrar.

## 5. Pantallas del MVP y componentes de dominio

| Pantalla | Contenido clave | Componentes de dominio |
|---|---|---|
| Login | Email + contraseña, error claro | — |
| **Agenda** (inicio) | Timeline por recurso + lista de hoy + alertas | `ResourceTimeline`, `CampaignStatusBadge`, `ConflictBanner` |
| Campañas | Tabla filtrable por estado/sitio/fecha | `CampaignStatusBadge`, `ParameterChip` |
| **Detalle de campaña** | Estado, ventanas, reservas, clima/caudal, bitácora de eventos | `WindowPicker`, `HoldingTimeMeter`, `WeatherGate`, `ConflictBanner` |
| **Nueva campaña (wizard)** | Sitio → parámetros → ventana → reservar | `WindowPicker`, `ParameterChip` |
| Recursos | Técnicos / equipos / vehículos (lectura + disponibilidad) | `ResourceTimeline` |
| Catálogo (lectura) | Parámetros, unidades y límites con badge "Pendiente de validación" | `ParameterChip` |

Componentes de dominio en `web/src/components/domain/` con su especificación en `docs/design-system.md` §6.8. Cada uno: props tipadas, estados de carga/vacío/error, accesible por teclado.

**Glosario de copy (usar estos términos):** *Campaña de muestreo* · *Ventana factible* · *Tiempo de conservación* · *Reserva* · *Técnico* · *Equipo* · *Vehículo* · *Sitio* · *Parámetro* · *Límite normativo* · *Pendiente de validación* · *Reprogramar por clima*. Mensajes de conflicto: decir **qué recurso, quién lo tiene y cuándo** (nunca "Error 409").

## 6. Formato (es-CL)

`lib/format.ts` es el único lugar que formatea:
- Fechas/horas: `Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago" })`.
- Números: `Intl.NumberFormat("es-CL")` (coma decimal), decimales por parámetro según catálogo.
- Duraciones: `3 h 42 min` (no `3.7h`).
- Valores censurados: `< 0,5 mg/L`.

## 7. Modo oscuro

Los tokens `.dark` ya existen. **No** implementar el toggle hasta que el MVP esté desplegado; pero **sí** verificar que ningún componente nuevo use colores fijos (así el modo oscuro "funciona solo" después).

## 8. Datos de demo para que la UI luzca

La UI se evalúa con datos: mantener `seed` con ≥ 6 sitios, ≥ 4 técnicos, ≥ 3 equipos, ≥ 3 vehículos y ≥ 12 campañas en distintos estados (incluyendo 1 conflicto y 1 `needs_reschedule`). Sin "Lorem ipsum" ni "Test 1".

## 9. Definición de terminado (UI)

Antes de dar por cerrada una pantalla (ver también `docs/design-system.md` §13):

- [ ] Cero colores/valores fuera de los tokens.
- [ ] Carga, vacío y error implementados.
- [ ] Correcta a 390 px y 1280 px.
- [ ] Foco visible y teclado completo.
- [ ] Estados con color + ícono + texto.
- [ ] Números/unidades en mono y es-CL.
- [ ] `pnpm --filter web typecheck` y `lint` en verde (**N1**).
- [ ] Recordar a Cristóbal: **tomar captura/GIF** para el README.

## 10. Colaboración con el químico (no programador)

- Cuando una pantalla cambie, describir el cambio en **1–2 frases en lenguaje simple** (qué ve el usuario), para que él pueda opinar.
- Los textos de dominio (parámetros, unidades, límites, tiempos de conservación) los **valida él**: marcarlos con "Pendiente de validación" y no inventarlos.
- Mantener `docs/glossary.md` al día con cada término nuevo que aparezca en pantalla.
