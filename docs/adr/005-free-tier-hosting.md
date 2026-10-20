# ADR-005 · Hosting 100 % free tier

- **Estado:** aceptada
- **Fecha:** 2026-10-20
- **Contexto del proyecto:** TerraPlan (MVP de portafolio, 2–3 semanas)

## Contexto

El objetivo del MVP es una **demo viva** que un reclutador pueda abrir sin costo mensual. El
presupuesto de infraestructura es cero, pero las piezas son heterogéneas: API Node en contenedor,
PostgreSQL con `btree_gist`, MongoDB para la bitácora y una SPA.

Alternativas consideradas: un VPS único (más barato de operar, pero con costo mensual y parcheo
manual), Railway/Fly (créditos limitados), o serverless puro (la exclusión de rangos necesita
PostgreSQL clásico).

## Decisión

Distribuir el sistema en cuatro free tiers administrados:

| Pieza | Proveedor | Motivo |
|---|---|---|
| API NestJS | **Render** (Docker, free) | Corre el `Dockerfile` sin cambios; deploy automático desde `main`. |
| PostgreSQL 16 | **Neon** (free) | Tiene `btree_gist`, que sostiene la exclusion constraint. |
| MongoDB | **Atlas M0** | Único free tier estable para Mongoose. |
| SPA React | **Vercel** (Hobby) | Build de Vite y CDN sin configuración extra. |
| Disponibilidad | **UptimeRobot** | Mitiga el cold start de Render con un ping cada 5 min. |

Configuración declarada en `render.yaml`; los pasos manuales en [`../deploy.md`](../deploy.md).

## Consecuencias

**Positivas**

- Costo mensual cero y sin servidores que administrar.
- Cada pieza escala o se migra por separado; el `Dockerfile` sirve igual en cualquier host.
- El deploy queda reproducible: `render.yaml` versionado + migraciones + seeds idempotentes.

**Negativas**

- **Cold start**: Render duerme el servicio tras ~15 min de inactividad; el primer request tarda
  30–50 s. Se acepta y se mitiga con UptimeRobot.
- Límites de cuota (almacenamiento de Neon, 512 MB de Atlas, horas de Render) que un uso intenso
  puede agotar; no apto para producción real sin plan pagado.
- Vercel Hobby es solo para uso personal/no comercial.
- Latencia variable entre regiones: la base Neon y el servicio Render deben quedar en la misma
  región para evitar viajes transatlánticos.
