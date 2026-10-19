# 02 · Estándares de código — TerraPlan (NestJS + React)

## 1. Idioma

| Qué | Idioma |
|---|---|
| Respuestas a Cristóbal (chat) | **Español** |
| Identificadores (variables, funciones, clases, archivos, rutas API, columnas) | **Inglés** |
| Comentarios de código | Inglés, solo para el *porqué* (nunca para el *qué*) |
| Mensajes de commit | **Inglés**, Conventional Commits |
| Textos visibles al usuario (UI, mensajes de error de API para humanos) | **Español claro (es-CL)** |
| README y ADRs | Español (mercado chileno); términos técnicos en inglés |
| Swagger (`summary`/`description`) | Inglés |

## 2. Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clases, interfaces, tipos, enums, DTOs | `PascalCase` | `CreateCampaignDto`, `ReservationsService` |
| Variables, funciones, métodos, propiedades | `camelCase` | `computeFeasibleWindows` |
| Constantes de módulo / valores de enum string | `UPPER_SNAKE_CASE` / `snake_case` | `MAX_RETRIES` · `needs_reschedule` |
| Archivos y carpetas | `kebab-case` + sufijo de rol | `create-campaign.dto.ts` |
| Tablas y columnas SQL | `snake_case` (tabla en singular) | `resource_booking.campaign_id` |
| Propiedades JSON de la API | `camelCase` | `collectedAt` |
| Rutas HTTP | `kebab-case`, plural, prefijo `/api/v1` | `/api/v1/campaigns/:id/feasible-windows` |
| Booleanos | prefijo `is/has/can` | `isActive` |
| Componentes React (símbolo) | `PascalCase` | `ResourceTimeline` |
| Archivos de componentes React | `kebab-case.tsx` | `resource-timeline.tsx` |
| Hooks | `useXxx` en `use-xxx.ts` | `use-campaigns.ts` |

**Sufijos de archivo (api):** `.module.ts` · `.controller.ts` · `.service.ts` · `.repository.ts` · `.entity.ts` · `.dto.ts` · `.guard.ts` · `.filter.ts` · `.interceptor.ts` · `.decorator.ts` · `.domain.ts` (funciones puras) · `.provider.ts` (adaptadores externos) · `.spec.ts` (unit, junto al archivo) · `.int-spec.ts` (integración, Testcontainers) · `.e2e-spec.ts`.

## 3. Estructura de un módulo

```
modules/campaigns/
├─ campaigns.module.ts
├─ campaigns.controller.ts
├─ campaigns.service.ts
├─ campaigns.repository.ts
├─ campaign-status.domain.ts       # máquina de estados (pura)
├─ entities/campaign.entity.ts
├─ dto/
│  ├─ create-campaign.dto.ts
│  ├─ campaign-response.dto.ts
│  └─ list-campaigns-query.dto.ts
└─ campaigns.service.spec.ts
```

- Un módulo = un agregado/contexto. `exports: [CampaignsService]` solamente.
- Inyección por constructor, `private readonly`. Sin `@Global()` salvo `ConfigModule`.
- Dependencia circular entre módulos = señal de mal diseño: **reportar**, no usar `forwardRef` sin aprobación.

## 4. Reglas por capa

- **Controller:** valida (DTO) → llama a un service → devuelve DTO de respuesta. ≤ 15 líneas por handler. Nunca devuelve entidades de TypeORM crudas.
- **Service:** reglas de negocio y transacciones. Lanza **errores de dominio** (ver §6). Recibe reloj inyectable (`Clock`) para testear tiempo.
- **Repository:** único lugar con consultas. Envuelve `Repository<T>`/`QueryRunner`. SQL siempre **parametrizado** (`$1`), jamás interpolado. Traduce errores de BD (ej. `23P01`) a errores de dominio.
- **Domain:** funciones puras, sin I/O ni Nest; lo más testeado del proyecto.

## 5. DTOs y validación

- Un DTO por contrato de entrada **y** otro de respuesta. Clases con `class-validator` + `class-transformer`.
- `ValidationPipe` global: `{ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }`.
- Cada propiedad: decoradores de validación **y** `@ApiProperty()` / `@ApiPropertyOptional()`.
- Validar contra el catálogo: `parameterCode` con validador `@IsCatalogParameter()`, `unitCode` con `@IsCatalogUnit()` (nada de strings libres).
- Paginación estándar: `page` (≥1), `pageSize` (1–100, defecto 25), `sort`, `order`. Respuesta: `{ data, meta: { page, pageSize, total } }`.
- Fechas en DTO: `@IsISO8601({ strict: true })`, se parsean a `Date` UTC. Rechazar fechas sin zona.

```ts
export class CreateCampaignDto {
  @ApiProperty({ example: 'RIO-MAIPO-01' })
  @IsString() @Length(3, 40)
  siteCode!: string;

  @ApiProperty({ type: [String], example: ['PH', 'TURB'] })
  @IsArray() @ArrayMinSize(1) @IsCatalogParameter({ each: true })
  parameterCodes!: string[];

  @ApiProperty({ example: '2026-03-14T13:00:00Z' })
  @IsISO8601({ strict: true })
  earliestStart!: string;
}
```

## 6. Manejo de errores

- Errores de **dominio** propios (`class ResourceConflictError extends DomainError`) con `code` estable. Los lanza service/repository.
- **Un único `GlobalExceptionFilter`** los traduce a **RFC 9457 `application/problem+json`**:

```json
{ "type": "about:blank", "title": "Resource already booked", "status": 409,
  "code": "RESOURCE_CONFLICT", "detail": "El vehículo VH-02 ya está reservado en ese horario.",
  "requestId": "…", "errors": [] }
```

- Códigos estables (mantener esta tabla al día): `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `RESOURCE_CONFLICT` 409 · `INVALID_STATE_TRANSITION` 409 · `NO_FEASIBLE_WINDOW` 422 · `WEATHER_BLOCKED` 422 · `UPSTREAM_UNAVAILABLE` 502 · `INTERNAL` 500.
- `detail` en español claro, sin jerga ni detalles internos. **Nunca** filtrar stack traces, SQL ni secretos. 500 → log completo + `requestId`, respuesta genérica.
- Prohibido `catch {}` vacío y `throw new Error('...')` genérico en lógica de dominio.
- Fallos de integración externa (clima, AquaMetric): timeout 5 s, reintento con backoff (máx. 3), error `UPSTREAM_UNAVAILABLE`; **nunca** romper la reserva por un fallo del log de Mongo.

## 7. Base de datos

- Toda alteración de esquema = **migración** (`pnpm --filter api migration:generate` o SQL manual). `synchronize: false` siempre. Nunca editar una migración ya aplicada: crear otra.
- PK `uuid DEFAULT gen_random_uuid()`. Fechas `timestamptz` (siempre UTC). Cantidades `numeric` (no `float`); TypeORM las devuelve como `string`: mapear explícitamente.
- Índices en FK y columnas de filtro frecuente. Constraints (`CHECK`, `UNIQUE`, `EXCLUDE`) en la BD, no solo en código.
- Transacciones: `dataSource.transaction()` o `QueryRunner` dentro del repository/service coordinador; commit/rollback explícitos; liberar el runner en `finally`.
- Seeds (datos demo) idempotentes en `database/seeds/`, ejecutables con un script.

## 8. Autenticación y autorización

- `JwtAuthGuard` global + `RolesGuard` global; `@Public()` y `@Roles(Role.Coordinator, …)` explícitos. Endpoint nuevo sin decorador de rol ⇒ solo autenticado, **revisar si es correcto**.
- Hash con **argon2**. Refresh tokens: guardar solo hash, rotar en cada uso, revocar en logout.
- Datos del usuario en `request.user` vía `@CurrentUser()`; nunca confiar en IDs del body para identidad.
- Rate limit (`@nestjs/throttler`) más estricto en `/auth/*`.

## 9. Tiempo, unidades y números

- Todo instante se guarda y transporta en **UTC**. Convertir a `America/Santiago` (con `luxon`) solo para horario de laboratorio y para mostrar.
- Nunca `new Date()` en lógica de dominio: inyectar `Clock`.
- Unidades y parámetros siempre desde el catálogo (`CatalogService`). Prohibido hardcodear códigos, unidades, tiempos de conservación o límites.
- Valores `< LOQ` según contrato (ver `01-project-context.md` §5).

## 10. Logging, config y seguridad

- `nestjs-pino`, un `requestId` por request propagado a logs y a la respuesta de error. No loguear tokens, contraseñas ni PII.
- Config con `@nestjs/config` y una función `validate` basada en `class-validator`; la app **falla al arrancar** si falta una variable.
- Secretos solo por env. `helmet`, CORS por allowlist (`CORS_ORIGINS`), sin `*`.
- Dependencias: no agregar ninguna sin justificarla en una línea; preferir lo que ya está en el stack.

## 11. Tests (priorizar MVP sobre cobertura)

Prioridad (hacer en este orden, parar cuando se cumpla el tiempo):

1. **Carrera de reservas** (`reservations.int-spec.ts`, Testcontainers): N concurrentes ⇒ 1 éxito.
2. **`computeFeasibleWindows`** y **máquina de estados** (tests de tabla, sin I/O).
3. **Auth + roles** (e2e: 401/403/200 por rol).
4. Reprogramación por clima (con providers falsos).
5. Frontend: solo flujos críticos si sobra tiempo.

Reglas: nombres `it('returns 409 when the vehicle is already booked')`; un `describe` por unidad; Arrange-Act-Assert; sin `sleep`; sin `.only`/`.skip` commiteados; providers externos **siempre** falsos en tests. Meta orientativa: dominio ≥ 90 %, global ≥ 60 %.

## 12. Frontend (TypeScript/React) — reglas de código

- `strict: true`; **prohibido `any`** (usar `unknown` + narrowing). Alias de imports `@/`.
- Estructura por *feature*: `web/src/features/<feature>/{components,hooks,api,types}`; compartido en `web/src/components/ui` (shadcn), `web/src/components/domain`, `web/src/lib`.
- Datos remotos con **TanStack Query** (nunca `useEffect`+`fetch` suelto). Formularios con react-hook-form + zod; los esquemas zod reflejan los DTOs del API.
- Un cliente HTTP único (`lib/api-client.ts`) que maneja `problem+json` y refresh de token.
- Componentes funcionales, props tipadas, sin lógica de negocio dentro de JSX complejo; extraer hooks.
- Estilos: **solo clases Tailwind con tokens** (ver `04-ui-ux-directives.md`).
- Formato de fechas/números únicamente vía `lib/format.ts` (es-CL, `America/Santiago`).
