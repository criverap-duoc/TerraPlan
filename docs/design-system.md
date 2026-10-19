# TerraPlan — Design System

> **Nombre de trabajo:** TerraPlan (renombrable). Agenda de campañas de muestreo ambiental.
> **Stack visual:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react. Gestor de paquetes: **pnpm**.
> **Fuente de verdad:** este archivo. Los tokens viven en `web/src/styles/globals.css` y deben coincidir con el bloque CSS de la sección 3.
> **Proyecto hermano:** AquaMetric (FastAPI). Misma filosofía, identidad distinta (ver sección 12).

---

## 0. Guía rápida para no programadores (léelo primero)

Un *design system* es el "manual de estilo" de la aplicación: define qué colores, letras, tamaños y formas se usan, y **qué significa cada uno**, para que toda la pantalla se vea coherente y la gente aprenda a leerla sin pensar.

**Cómo opinar sobre la UI sin ser técnico.** No hace falta hablar de código. Basta responder estas preguntas viendo la pantalla:

1. ¿Entiendo en 5 segundos qué campañas están en riesgo hoy?
2. ¿Los nombres de los parámetros, unidades y estados son los que usaría en el laboratorio?
3. ¿Hay algún dato que un técnico en terreno necesitaría y no está a la vista?
4. ¿Algún color me engaña? (ej.: algo verde que debería preocuparme).
5. ¿Se leería bien al aire libre, con el sol de frente, desde un teléfono?

**Qué significa cada color (en simple):**

| Color | Significa | Ejemplo en la app |
|---|---|---|
| Verde profundo | "Acción principal / todo en curso normal" | Botón *Reservar*, campaña *En terreno* |
| Verde claro | "Terminado / dentro de lo esperado" | Campaña *Completada*, tiempo de conservación *OK* |
| Azul | "Informativo / planificado" | Campaña *Planificada*, avisos |
| Ámbar (amarillo-naranja) | "Atención, hay que decidir algo" | *Reprogramar por clima*, conservación *por vencer* |
| Rojo ladrillo | "Problema / no se puede" | Conflicto de reserva, muestra *vencida*, errores |
| Gris | "Neutro / secundario / desactivado" | Borradores, textos de apoyo |

**Regla de oro:** el color **nunca** va solo. Siempre acompaña a un texto y/o un ícono (para personas con daltonismo y para el sol directo).

---

## 1. Principios de diseño

| # | Principio | Qué significa en práctica |
|---|---|---|
| 1 | **Control operativo** | Lo urgente (conflictos, ventanas por vencer) siempre visible sin scroll. |
| 2 | **Precisión legible** | Números, horas, códigos y unidades en tipografía monoespaciada con cifras tabulares. |
| 3 | **Terreno primero** | Mobile-first, zonas táctiles ≥ 44 px, alto contraste, funciona con una mano. |
| 4 | **Confianza sobria** | Pocos colores, mucho espacio en blanco, sin decoración gratuita. Parece herramienta, no demo. |
| 5 | **El estado se explica solo** | Cada estado = color + ícono + texto. Nunca solo color. |

---

## 2. Identidad

- **Sensación:** logística confiable, naturaleza cuidada, instrumento de precisión.
- **Paleta base:** verde profundo (operación, sostenibilidad) + azul (información, agua) + ámbar cálido (alertas) + ladrillo (error).
- **Forma:** esquinas medianamente redondeadas (`0.5rem`), bordes finos, sombras muy suaves.
- **Tono de voz (textos de UI, es-CL):** claro, directo, sin jerga innecesaria. "Reservar equipo", no "Efectuar asignación de recurso".

---

## 3. Tokens de color (CSS variables · Tailwind 4 + shadcn/ui)

Valores en **OKLCH**, ajustados al gamut sRGB. Contraste **verificado por script**: texto normal ≥ 5,69:1 (mínimo AA = 4,5:1), elementos de UI (bordes de campo, anillo de foco, series de gráfico) ≥ 3,18:1 (mínimo AA = 3:1). Ver sección 10.

```css
/* web/src/styles/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.5rem;

  /* Neutrales */
  --background: oklch(0.985 0.004 150);
  --foreground: oklch(0.22 0.03 160);
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: var(--card);
  --popover-foreground: var(--foreground);
  --muted: oklch(0.96 0.008 160);
  --muted-foreground: oklch(0.48 0.025 160);
  --border: oklch(0.90 0.012 160);          /* decorativo: separadores, cards */
  --input: oklch(0.62 0.02 160);            /* borde de campos: cumple 3:1 (WCAG 1.4.11) */
  --ring: oklch(0.55 0.10 158);

  /* Marca */
  --primary: oklch(0.42 0.09 158);          /* verde profundo */
  --primary-foreground: oklch(0.985 0.005 150);
  --secondary: oklch(0.94 0.02 215);        /* azul hielo */
  --secondary-foreground: oklch(0.30 0.06 235);
  --accent: oklch(0.93 0.035 160);          /* verde menta (hover, selección) */
  --accent-foreground: oklch(0.30 0.07 158);

  /* Semánticos (sólidos) */
  --destructive: oklch(0.50 0.19 27);       /* ladrillo */
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.46 0.11 148);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.80 0.15 80);           /* ámbar */
  --warning-foreground: oklch(0.28 0.06 70);
  --info: oklch(0.50 0.128 245);
  --info-foreground: oklch(0.985 0 0);

  /* Semánticos (suaves, para badges y banners) */
  --success-soft: oklch(0.95 0.05 148);
  --success-soft-foreground: oklch(0.34 0.09 148);
  --warning-soft: oklch(0.96 0.042 85);
  --warning-soft-foreground: oklch(0.38 0.08 70);
  --destructive-soft: oklch(0.95 0.024 25);
  --destructive-soft-foreground: oklch(0.42 0.16 27);
  --info-soft: oklch(0.95 0.024 245);
  --info-soft-foreground: oklch(0.38 0.098 245);

  /* Gráficos / timeline (usar siempre junto a etiqueta o patrón) */
  --chart-1: oklch(0.50 0.10 158);
  --chart-2: oklch(0.55 0.12 245);
  --chart-3: oklch(0.66 0.14 75);
  --chart-4: oklch(0.58 0.14 40);
  --chart-5: oklch(0.58 0.02 160);

  /* Sidebar (alias de tokens ya verificados) */
  --sidebar: var(--card);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
}

.dark {
  --background: oklch(0.17 0.02 165);
  --foreground: oklch(0.96 0.006 150);
  --card: oklch(0.21 0.025 165);
  --muted: oklch(0.25 0.02 165);
  --muted-foreground: oklch(0.72 0.02 160);
  --border: oklch(0.30 0.02 165);
  --input: oklch(0.58 0.025 165);
  --ring: oklch(0.65 0.12 158);

  --primary: oklch(0.74 0.14 158);
  --primary-foreground: oklch(0.17 0.03 165);
  --secondary: oklch(0.28 0.04 230);
  --secondary-foreground: oklch(0.92 0.02 220);
  --accent: oklch(0.30 0.05 160);
  --accent-foreground: oklch(0.92 0.04 158);

  --destructive: oklch(0.68 0.19 25);
  --destructive-foreground: oklch(0.17 0.03 25);
  --success: oklch(0.72 0.15 148);
  --success-foreground: oklch(0.17 0.03 150);
  --warning: oklch(0.82 0.15 85);
  --warning-foreground: oklch(0.22 0.04 80);
  --info: oklch(0.72 0.12 240);
  --info-foreground: oklch(0.17 0.03 245);

  --success-soft: oklch(0.30 0.06 150);
  --success-soft-foreground: oklch(0.88 0.10 150);
  --warning-soft: oklch(0.32 0.06 85);
  --warning-soft-foreground: oklch(0.90 0.10 85);
  --destructive-soft: oklch(0.30 0.07 25);
  --destructive-soft-foreground: oklch(0.88 0.062 25);
  --info-soft: oklch(0.30 0.06 245);
  --info-soft-foreground: oklch(0.88 0.06 245);

  --chart-1: oklch(0.74 0.14 158);
  --chart-2: oklch(0.72 0.12 240);
  --chart-3: oklch(0.82 0.15 85);
  --chart-4: oklch(0.72 0.14 40);
  --chart-5: oklch(0.70 0.02 160);
}

@theme inline {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, "SF Mono", monospace;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-success-soft: var(--success-soft);
  --color-success-soft-foreground: var(--success-soft-foreground);
  --color-warning-soft: var(--warning-soft);
  --color-warning-soft-foreground: var(--warning-soft-foreground);
  --color-destructive-soft: var(--destructive-soft);
  --color-destructive-soft-foreground: var(--destructive-soft-foreground);
  --color-info-soft: var(--info-soft);
  --color-info-soft-foreground: var(--info-soft-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@theme {
  --shadow-card: 0 1px 2px oklch(0.22 0.03 160 / 0.06), 0 1px 3px oklch(0.22 0.03 160 / 0.08);
  --shadow-pop: 0 4px 12px oklch(0.22 0.03 160 / 0.12), 0 2px 4px oklch(0.22 0.03 160 / 0.08);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-feature-settings: "cv11", "ss01";
  }
  /* Números y datos técnicos: cifras de ancho fijo */
  .tabular, [data-numeric] { font-variant-numeric: tabular-nums; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
}
```

### 3.1 Mapa de estados de dominio → tokens (no inventar colores nuevos)

**Estado de campaña** (badge = ícono + texto + color suave):

| Estado (`status`) | Etiqueta UI | Tokens | Ícono lucide |
|---|---|---|---|
| `draft` | Borrador | `bg-muted text-muted-foreground` | `FileEdit` |
| `planned` | Planificada | `bg-info-soft text-info-soft-foreground` | `CalendarClock` |
| `confirmed` | Confirmada | `bg-accent text-accent-foreground` | `CalendarCheck` |
| `in_field` | En terreno | `bg-primary text-primary-foreground` | `Truck` |
| `completed` | Completada | `bg-success-soft text-success-soft-foreground` | `CheckCircle2` |
| `needs_reschedule` | Reprogramar | `bg-warning-soft text-warning-soft-foreground` | `CloudRain` |
| `cancelled` | Cancelada | `bg-muted text-muted-foreground line-through` | `XCircle` |

**Tiempo de conservación de muestra** (`HoldingTimeMeter`):

| Estado | Regla | Tokens | Ícono |
|---|---|---|---|
| OK | > 50 % del plazo restante | `success-soft` | `CheckCircle2` |
| Por vencer | ≤ 50 % del plazo restante | `warning-soft` | `Timer` |
| Vencido | plazo agotado | `destructive-soft` | `AlertOctagon` |

> El umbral de 50 % es un valor de partida; el químico validador puede ajustarlo por parámetro.

**Conflicto de reserva (409):** `ConflictBanner` con `destructive-soft`, ícono `AlertTriangle`, texto: *qué recurso*, *quién lo tiene*, *en qué horario* y botón "Ver alternativas".

---

## 4. Tipografía

**Familias** (autoalojadas vía Fontsource, sin depender de Google Fonts en runtime):

- UI: **Inter Variable** → `pnpm add @fontsource-variable/inter`
- Datos: **JetBrains Mono Variable** → `pnpm add @fontsource-variable/jetbrains-mono`
- Importar en `web/src/main.tsx`: `import "@fontsource-variable/inter"; import "@fontsource-variable/jetbrains-mono";`
- (Verificar los nombres exactos de `font-family` tras instalar: deben coincidir con `--font-sans` / `--font-mono`.)

**Escala** (base 16 px, pensada para lectura en terreno):

| Rol | Clase Tailwind | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|---|
| h1 | `text-3xl font-semibold tracking-tight` | 30 / 36 | 600 | Título de página |
| h2 | `text-2xl font-semibold tracking-tight` | 24 / 32 | 600 | Sección |
| h3 | `text-xl font-semibold` | 20 / 28 | 600 | Título de card |
| h4 | `text-lg font-medium` | 18 / 28 | 500 | Subsección |
| body | `text-base` | 16 / 24 | 400 | Texto general |
| small | `text-sm` | 14 / 20 | 400–500 | Metadatos, tablas |
| caption | `text-xs text-muted-foreground` | 12 / 16 | 400–500 | Ayudas, etiquetas |
| data | `font-mono tabular-nums` | hereda | 400–500 | IDs, códigos, valores, horas, unidades |

**Pesos permitidos:** 400, 500, 600 (y 700 solo en cifras KPI). Mínimo 14 px para texto interactivo en móvil.

---

## 5. Espaciado, layout y responsive

- **Base 4 px.** Solo usar la escala de Tailwind (`1`=4 px, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48). Prohibido valores arbitrarios (`p-[13px]`).
- **Contenedor:** `mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8` (máx. 1280 px).
- **Breakpoints (mobile-first, estándar Tailwind):** `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. Escribir primero el estilo móvil, luego `md:`/`lg:`.
- **App shell:**
  - `< lg`: top bar (56 px) + **bottom nav** (64 px, 4 destinos máx., respeta `env(safe-area-inset-bottom)`).
  - `≥ lg`: **sidebar** de 256 px (colapsable a 64 px) + contenido.
- **Grid de dashboards:** `grid grid-cols-1 gap-4 md:grid-cols-6 lg:gap-6 xl:grid-cols-12`. Cards KPI ocupan `xl:col-span-3`; agenda/timeline `xl:col-span-8`; panel lateral `xl:col-span-4`.
- **Zonas táctiles:** ≥ 44 × 44 px en vistas de terreno.
- **Sombras/radio/movimiento:** `shadow-card` (reposo), `shadow-pop` (menús/diálogos), radio `rounded-lg` (cards/inputs), `rounded-md` (botones/badges `rounded-full`). Transiciones 150 ms `ease-out`; respetan `prefers-reduced-motion`.

---

## 6. Componentes base

Todos salen de **shadcn/ui** (`pnpm dlx shadcn@latest add ...`), usando únicamente tokens.

### 6.1 Botones

| Variante | Clases clave | Cuándo |
|---|---|---|
| `primary` | `bg-primary text-primary-foreground hover:bg-primary/90` | Acción principal (1 por vista) |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Acción alternativa |
| `outline` | `border border-input bg-background hover:bg-accent` | Acciones neutras, filtros |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Acciones en barras/tablas |
| `danger` (`destructive`) | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Cancelar campaña, borrar |

| Tamaño | Alto | Uso |
|---|---|---|
| `sm` | 36 px | Solo tablas densas en escritorio |
| `md` | 44 px | **Por defecto** (cumple zona táctil) |
| `lg` | 48 px | CTA en móvil / terreno |

Estados: `focus-visible:ring-2 ring-ring ring-offset-2`, `disabled:opacity-50 disabled:pointer-events-none`, `aria-busy` + spinner (`Loader2` girando) durante carga. Los botones solo-ícono **requieren** `aria-label`.

### 6.2 Cards

`rounded-lg border bg-card text-card-foreground shadow-card p-4 sm:p-6`. Hover (`hover:shadow-pop transition-shadow`) **solo** si la card es clicable (entonces es un `<a>`/`<button>` con foco visible). Cabecera: título h3 + acción opcional a la derecha.

### 6.3 Inputs, Selects, Textareas

| Estado | Estilo |
|---|---|
| default | `h-11 rounded-md border border-input bg-background px-3 text-base` |
| focus | `ring-2 ring-ring ring-offset-2` (nunca quitar outline sin reemplazo) |
| error | `border-destructive` + `aria-invalid` + mensaje bajo el campo con ícono `AlertCircle`, vinculado con `aria-describedby` |
| disabled | `bg-muted text-muted-foreground cursor-not-allowed` |

Siempre `<Label>` visible (no solo placeholder). Campos numéricos con unidad: sufijo en `text-muted-foreground font-mono`. Fechas/horas: formato `es-CL`, zona `America/Santiago`; se guardan en UTC.

### 6.4 Badges

`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium` + par `*-soft` / `*-soft-foreground` + ícono 14 px + texto. Ver mapa de estados en 3.1.

### 6.5 Tablas (TanStack Table + shadcn `table`)

- Cabecera sticky, `text-xs uppercase tracking-wide text-muted-foreground`; ordenamiento con `aria-sort` y flecha.
- Filas: `h-12`, `hover:bg-muted/50`, separador `border-b`.
- Números y códigos: alineados a la derecha, `font-mono tabular-nums`.
- Paginación **server-side** (10 / 25 / 50), con "Mostrando 1–25 de 134".
- `< md`: cada fila se convierte en una **card apilada** (no scroll horizontal).

### 6.6 Navegación

- Escritorio: sidebar con ícono + etiqueta; ítem activo `bg-sidebar-accent text-sidebar-accent-foreground` + `aria-current="page"`.
- Móvil: bottom nav con 4 destinos: **Agenda · Campañas · Recursos · Perfil**.
- Breadcrumb en detalle de campaña. Skip-link "Saltar al contenido" al inicio.

### 6.7 Estados de carga, vacío y error (obligatorios en toda vista con datos)

| Estado | Patrón |
|---|---|
| Carga | `Skeleton` (`bg-muted animate-pulse`) con la **misma forma** que el contenido final; `aria-busy="true"` |
| Vacío | Ícono 40 px `text-muted-foreground` + título + 1 línea de ayuda + CTA ("Crear primera campaña") |
| Error | Banner `destructive-soft` + mensaje humano + botón "Reintentar" + `requestId` en `font-mono text-xs` |
| Sin permiso (403) | Vacío con candado y "Pide acceso a un coordinador" |

### 6.8 Componentes de dominio

| Componente | Descripción |
|---|---|
| `ResourceTimeline` | Línea de tiempo horizontal (técnicos / equipos / vehículos × horas). Bloques `bg-primary/15 border-l-4 border-primary` con texto. Conflictos con rayado `repeating-linear-gradient` de `--destructive`. Navegable por teclado (flechas). En móvil: lista agrupada por día. |
| `HoldingTimeMeter` | Barra de progreso + tiempo restante en `font-mono` ("Quedan 03:42 h") + estado (ver 3.1). |
| `WindowPicker` | Lista de ventanas factibles ordenadas; cada una muestra hora de muestreo, hora límite de llegada a laboratorio y holgura. |
| `ConflictBanner` | Ver 3.1. |
| `WeatherGate` | Tarjeta con precipitación / caudal vs umbral; estado OK o "Reprogramar" con CTA. |
| `ParameterChip` | Código del parámetro (`font-mono`) + nombre + unidad. |

---

## 7. Gráficos

TerraPlan casi no usa gráficos: su pieza visual central es la **línea de tiempo de recursos**. Para los KPI usar tarjetas con cifra grande (`text-3xl font-mono font-semibold tabular-nums`) y, si acaso, un `sparkline` con `--chart-1`. Series múltiples: `--chart-1…5` **más** etiqueta directa o patrón (nunca solo color).

---

## 8. Accesibilidad (WCAG 2.2 AA)

- Contraste: texto ≥ 4,5:1; elementos de UI ≥ 3:1 (validado, sección 10).
- **Foco visible** en todo elemento interactivo (`ring-2 ring-ring`). Orden de tabulación lógico.
- Íconos informativos con `aria-label`; decorativos con `aria-hidden="true"`.
- Estados con **color + ícono + texto**.
- Formularios: `<label>` asociado, errores anunciados (`role="alert"` / `aria-live="polite"`).
- Teclado completo (diálogos con trampa de foco, `Esc` cierra) — viene de Radix; no reemplazar por `div`s.
- Zonas táctiles ≥ 44 px en terreno; objetivo mínimo absoluto 24 px (WCAG 2.5.8).
- Respeta `prefers-reduced-motion` y `prefers-color-scheme`.
- Idioma: `<html lang="es-CL">`.

---

## 9. Modo oscuro

Tokens `.dark` definidos desde el inicio (sección 3). El toggle se implementa después: basta añadir/quitar la clase `dark` en `<html>`, guardando la preferencia en `localStorage` (con `try/catch`) y por defecto respetando `prefers-color-scheme`. Las sombras casi no se ven en oscuro: la jerarquía se logra con `--card` más claro que `--background` + `border`.

---

## 10. Validación de contraste

Script reproducible (`scripts/contrast-check.py`, convierte OKLCH → sRGB y calcula la razón WCAG):

| Tema | Mínimo texto (req. 4,5) | Mínimo UI (req. 3,0) |
|---|---|---|
| Light | 5,69 | 3,18 |
| Dark | 6,12 | 4,16 |

Pares verificados: `foreground/background|card`, `*-foreground` sobre su fondo, `muted-foreground` sobre `background|card|muted`, todos los pares `*-soft`, `input` y `ring` sobre `background|card`, `chart-1…5` sobre `card`.
**Regla:** si se cambia un token, repetir la verificación antes de commitear.

---

## 11. Referencias visuales (qué tomamos y qué no)

Verificadas durante el diseño:

- **Lough Neagh Water Quality Dashboard** (DAERA, Irlanda del Norte): visor público con telemetría de sondas cada 30 min (temperatura, oxígeno disuelto, turbidez, conductividad, ficocianina) y nueve sitios de monitoreo. *Tomamos:* claridad de qué sitio/parámetro se mira, y transparencia sobre la fuente. (Más relevante para AquaMetric.)
- **HawkesburyWatch** (Hornsby Shire Council, Australia): siete estaciones en tiempo real, mapa de sitios, notas metodológicas embebidas y un sistema de alertas por umbral (p. ej. salinidad para cosecha de ostras). *Tomamos:* alertas ligadas a decisiones operativas — la misma idea de nuestro `WeatherGate`.
- **Agendas de recursos tipo timeline / Gantt** (herramientas de scheduling profesional): *Tomamos:* filas por recurso, bloques con texto, conflictos visibles.
- **Red Dot Award de monitoreo de agua:** mencionado en el brief, **no se pudo verificar** una referencia concreta; no se usa como fuente.

> Las referencias son de *patrones*, no se copian layouts ni marcas.

Fuentes: [DAERA – Lough Neagh Water Quality Dashboard FAQ](https://www.daera-ni.gov.uk/articles/lough-neagh-water-quality-dashboard-faq) · [DAERA – Lough Neagh data viewer](https://www.daera-ni.gov.uk/news/daera-launches-lough-neagh-blue-green-data-viewer) · [HawkesburyWatch – data.nsw.gov.au](https://data.nsw.gov.au/data/dataset/5c2d7648-93b8-4f37-b1b0-2b420f5b9b75) · [Hornsby Shire Council – Latest catchment health results](https://www.hornsby.nsw.gov.au/Environment/Waterways/Using-water-quality-information/Latest-catchment-health-results)

---

## 12. Relación con AquaMetric (FastAPI)

| Aspecto | TerraPlan (este) | AquaMetric |
|---|---|---|
| Color primario | Verde profundo (hue ≈ 158) | Azul océano (hue ≈ 250) |
| Acento | Ámbar cálido (alertas) | Turquesa |
| Radio | 0.5 rem (amigable) | 0.375 rem (preciso) |
| Densidad | Cómoda, táctil | Densa, analítica |
| Fuente UI / datos | Inter / JetBrains Mono | Geist / Geist Mono |
| Navegación | Bottom nav + sidebar | Sidebar + barra de filtros |
| Ancla visual | Línea de tiempo de recursos | Gráficos de control |

**Misma filosofía:** tokens semánticos con los mismos nombres, mismos estados (éxito/advertencia/peligro/info), mismas reglas de accesibilidad, cifras en monoespaciada, estado = color + ícono + texto.

---

## 13. Checklist de revisión de UI (antes de cerrar una pantalla)

- [ ] Solo tokens (ni hex, ni `bg-green-600`, ni valores arbitrarios).
- [ ] Carga, vacío y error implementados.
- [ ] Se ve bien a 390 px y a 1280 px.
- [ ] Foco visible y navegable con teclado.
- [ ] Estados con color + ícono + texto.
- [ ] Números/unidades en `font-mono tabular-nums`, formato es-CL.
- [ ] Zonas táctiles ≥ 44 px (vistas de terreno).
- [ ] Textos de UI en español claro.
