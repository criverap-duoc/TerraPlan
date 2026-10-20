# Performance (k6)

> **Nota sobre `THROTTLER_LIMIT`:** las mediciones de abajo se corrieron con `THROTTLER_LIMIT=100000`
> para medir la API y no el rate limiter. Con el default (100 req/min) el escenario `read-load` mide
> el throttler. Para reproducir estas mediciones, exportar `THROTTLER_LIMIT=100000` en `api/.env`
> antes de arrancar la API.

Resultados de los dos escenarios obligatorios, medidos en local (Windows 11, Docker Desktop) con la
API en `start:dev`, PostgreSQL 16 y MongoDB 7 en contenedores, y los seeds cargados (12 campañas,
4 técnicos, 3 equipos, 3 vehículos).

| Escenario | VUs | Requests | 2xx | 4xx | 5xx | p95 (ms) | RPS |
|---|---|---|---|---|---|---|---|
| `reservation-race` | 20 | 86 | 67 | 19 | 0 | 257,66 | 46,0 |
| `read-load` | 30 | 8 352 | 8 352 | 0 | 0 | 160,91 | 276,7 |

- **reservation-race**: 20 campañas distintas reservan el **mismo** técnico, equipo, vehículo y
  ventana. Resultado: **1 × 201** y **19 × 409**, sin 5xx. Los 66 requests restantes son el
  `setup()` (login, listados de sitios/recursos/catálogo y creación de las 20 campañas con ventana
  seleccionada). `http_req_failed` = 0,00 %.
- **read-load**: 30 VUs durante 30 s contra `GET /campaigns?page=1&pageSize=25`.
  p95 del endpoint = **160,91 ms** (umbral 500 ms). `http_req_failed` = 0,00 %.

Ambos escenarios pasaron sus thresholds:

```
reservation-race  race_created 'count==1'    ✓  race_conflicts 'count==19'  ✓  http_req_failed rate<0.01 ✓
read-load         http_req_duration{endpoint:campaigns-list} 'p(95)<500' p(95)=160,92ms ✓
                  http_req_failed 'rate<0.01' rate=0,00% ✓
```

## Cómo reproducirlo

k6 es un binario independiente: **no** es una dependencia de Node y el CI no lo ejecuta. En Windows:

```powershell
choco install k6        # o descargar desde https://k6.io/docs/get-started/installation/
k6 run k6/reservation-race.js
k6 run k6/read-load.js
```

Si no hay binario pero sí Docker, la imagen oficial funciona igual:

```powershell
docker run --rm -i -v "${PWD}/k6:/scripts" `
  -e BASE_URL=http://host.docker.internal:3000/api/v1 `
  grafana/k6 run /scripts/reservation-race.js
```

Variables soportadas por ambos scripts: `BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VUS` y
(`read-load`) `DURATION`.

### Throttler

El `ThrottlerModule` global permite **100 requests por minuto por IP**; `read-load` genera ~280 rps.
Para la corrida local se levantó la API con `THROTTLER_LIMIT=100000` (variable opcional, ausente en
producción). Contra Render, con el límite por defecto, el escenario mediría el throttler y no la
base de datos: si se corre allí, usar `THROTTLER_LIMIT` alto solo durante la medición o interpretar
los 429 como límite alcanzado, no como fallo.

### Notas

- El escenario de carrera crea campañas `K6-*`; se borran después de medir para no ensuciar los
  datos de demo.
- `p95` de `reservation-race` incluye el `setup()`, donde el costo dominante es argon2 en el login.
