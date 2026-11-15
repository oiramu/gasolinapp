# Sprint 02 — Mapa útil

**Ventana:** semana del 16 al 22 de noviembre de 2026 (hora de Bogotá).
**Rama:** `sprint/02-mapa-util` (desde `main` e98094c).
**Objetivo:** que cualquiera que abra la app en Barranquilla vea un precio creíble en cada estación, sepa qué tan reciente es y pueda confirmarlo con un toque.
**Por qué:** la auditoría del Sprint 01 encontró 0 precios reportados por usuarios reales. Lo que falta ya no es seguridad sino datos y uso.
**Fuera de alcance:** 0.5, 0.6a–e y el endurecimiento extra. Un componente solo se pasa a TSX si una tarea de este sprint lo toca.

Siguen vigentes las reglas de CLAUDE.md y del Sprint 01: expandir y luego contraer, OK explícito de Mario **después** de mostrarle el SQL, GRANT explícitos más pgTAP de privilegios, y pgTAP para el caso feliz y para el abuso.

## Decisiones (2026-11-15)

- **Orden:** S0.2 → 2.4 → 2.1 → 2.2 → 3.1 → 3.4. La 2.1 va antes que la 2.2 porque `resolveDisplayPrice` necesita la frescura.
- **Ciudad:** no existe `stations.city`. Todas las estaciones activas tienen `zone_id` y la ciudad sale de `zones.city` (25 ciudades; 162 estaciones en Barranquilla).
- **Sin precio oficial:** los combustibles que la resolución no regula (en principio extra, GNV y urea; confirmar con la fuente) muestran "Sin precio" (`source: 'none'`) si no hay reporte comunitario. La meta "todas las estaciones muestran precio" se mide sobre los combustibles con referencia oficial.
- **Datos de la 2.2:** Claude busca la resolución vigente y arma el CSV con `source_url`; Mario lo valida contra la fuente antes de aplicarlo.
- **S0.2:** pg_cron no está instalado en producción (2026-11-15); la migración lo crea.
- **Hallazgos del código para la 2.4:** `App.jsx` pasa `stations` (no `filteredStations`) a `MapView` y monta el mapa con `key={defaultFuelType}`.
- La rama `docs/roadmap-criterios` se borró del origen (ya estaba en `main`).

---

## S0 — Cierre del Sprint 01

### [x] S0.1 MR a `main`
- PR #2 mergeado (`main` = e98094c, sin diferencias con f30aa57). Vercel desplegó desde `main` y producción sirve el mismo bundle (`index-BgrRWFCO.js`, hash de contenido idéntico). Rama `docs/roadmap-criterios` borrada.

### [x] S0.2 `spatial_ref_sys`: ticket y vigilancia (sin mover PostGIS)
**Estado (2026-11-15):** hecha. Mario abrió el ticket a soporte de Supabase. Migración `20261115052835_vigilar_srid_4326` aplicada vía MCP con su OK: pg_cron 1.6.4, un job `check_srid_4326` activo (`0 11 * * *`, 06:00 en Bogotá), `ops_alerts` con RLS y sin acceso del cliente, fila 4326 intacta y 0 alertas. Restauración en `supabase/rollbacks/restaurar_srid_4326.sql` (usa `restore_srid_4326()`, probada en local). `security:check` contra producción: 8 PASS (incluida la fila 4326), 1 KNOWN y ningún FAIL. pgTAP `008` (15 casos).

- **Mario:** abre un ticket a soporte de Supabase con la salida del advisor y la línea KNOWN de `security:check`.
- Job de pg_cron diario (`cron.unschedule` antes de `cron.schedule`) que verifique que la fila `srid = 4326` existe y que su `srtext` coincide con el valor esperado. Si no, registra el problema en una tabla `ops_alerts`.
- `supabase/rollbacks/restaurar_srid_4326.sql`: el INSERT o UPDATE estándar de 4326, listo para correr.
- `security:check` agrega un caso de solo lectura: la fila 4326 está intacta.
- **Listo cuando:** el ticket está abierto, el job está activo en producción y el script de restauración existe.

---

## [x] 2.4 — Bugs del mapa
**Estado (2026-11-15):** hecha en la rama (sin migraciones; llega a producción con el merge del sprint). `App.jsx` pasa `filteredStations` al mapa y ya no lo monta con `key`. La fábrica de íconos pasó a `features/map` en TS y es pura: recibe combustible y favorito por parámetro y cachea el HTML por objeto (WeakMap), así una corrección de precio vuelve a pintar el pin (antes el caché usaba la cantidad de precios y se quedaba con el viejo). Se quitó `clearIconCache` del store (se rompe el ciclo store ↔ markers). `MapView` usa `useShallow`. Tests: `App.map.test.tsx` (comportamiento, fallan con el código anterior) y `features/map/map.test.tsx`; piso de cobertura 68/81/73/68.
- El filtro "cerca" tiene que aplicarse a los marcadores del mapa, no solo a la tarjeta y a la búsqueda.
- Cambiar de combustible no vuelve a montar el mapa: se conservan el centro y el zoom.
- Tests de comportamiento (Testing Library) para los dos casos.

## [ ] 2.1 — Frescura en lugar de vencer a 24 h
**Estado (2026-11-15):** código hecho en la rama. Expansión aplicada en producción (`20261115054737`, verificada: 247 precios con `confirmed_at` = `created_at`, 0 nulos; `security:check` sin FAIL). La contracción espera al deploy del sprint.
- Expandir: `20261115054737_frescura_confirmed_at.sql` (columna `confirmed_at` NOT NULL con backfill desde `created_at`, índice, y `report_price` que la llena al reportar y al corregir y ya no toca `expires_at`). pgTAP `009` (9 casos); backfill simulado sobre datos viejos.
- Contraer: `20261116000200_quitar_expires_at.sql` (DROP COLUMN). Nada en la app ni en las vistas la lee; se aplica después del deploy de la 2.1.
- Dominio: `shared/domain/freshness.ts` (`getFreshness`, `formatConfirmed`, al 100%). Estilo único en `shared/ui/freshness.ts`. Reloj de UI: `shared/lib/useNow` (cada 10 min).
- UI: el pin toma la opacidad de la frescura del precio que muestra; el panel muestra "confirmado hace X · Fresco/Reciente/Viejo/Dudoso" (`features/prices/ui/FreshnessTag`); la leyenda suma "Frescura del precio" (`features/map/ui/FreshnessLegend`). Piso de cobertura 69/82/75/69.
- `confirmed_at` en `fuel_prices` (expandir: columna nueva con backfill desde `created_at`). `report_price` la llena.
- `getFreshness(confirmedAt, now)` en el dominio: fresco (< 3 días), reciente (< 10), viejo (< 30), dudoso.
- UI: "confirmado hace X días", opacidad del pin según la frescura y leyenda actualizada.
- Quita cualquier lógica que dependa de `expires_at`. La columna se elimina en una migración de contracción aparte, después del deploy.

## [ ] 2.2 — Precios oficiales de referencia (la tarea más importante del sprint)
**Estado (2026-11-15):** datos, dominio y UI hechos en la rama; falta aplicar la migración y cargar noviembre en producción.
- UI: el pin usa `resolveDisplayPrice` para el combustible elegido (el oficial va con borde punteado, insignia REF y opacidad 0.9); el panel muestra cada combustible con `StationFuelPrices`/`FuelPriceCard` (comunitario con frescura, "Precio de referencia oficial (nov 2026)" + "Cada estación puede variar", o "Sin precio"); se quitó el promedio de zona como precio de la estación (`StationPanel` bajó de 409 a 283 líneas); la leyenda suma "Precio oficial". La ciudad de cada estación sale de su zona. Piso de cobertura 71/84/77/71.
- Fuente: CREG, "Precios vigentes a partir del 1 de noviembre del 2026 (13 ciudades principales)", solo gasolina corriente y ACPM (diésel). Extra, GNV y urea no tienen precio oficial.
- Migración `20261116000300_precios_referencia.sql` (sin aplicar): tabla `reference_prices` (FK a `fuel_price_ranges`, trigger con `INVALID_FUEL`/`OUT_OF_RANGE`, fuente https), vista `current_reference_prices` (vigente según la fecha de Bogotá), lectura pública y job mensual `check_reference_prices` (día 2, 06:00) que **no carga datos**: solo alerta en `ops_alerts` si el mes empezó sin precios. pgTAP `010` (17 casos).
- Carga manual mensual: `npm run reference-prices:import` (vite-node) valida el CSV y genera el SQL; README "Precios oficiales de referencia (cada mes)". Noviembre: `data/reference-prices/2026-11.csv` → `2026-11.sql` (26 filas), **pendiente de validación de Mario contra la fuente**.
- Ciudades: 13 de nuestras 25 tienen precio oficial (Barranquilla incluida). Sin precio oficial: Armenia, Sincelejo, Santa Marta, Popayán, Tunja, Riohacha, Neiva, Yopal, Valledupar, Buenaventura, Caldas y Bello (test en `displayPrice.test.ts`).
- Dominio: `resolveDisplayPrice` (comunitario fresco/reciente → oficial → comunitario viejo → none) y `formatReferenceMonth`, al 100%; `cityKey` para comparar ciudades.
- Tabla `reference_prices(city, fuel_type, valid_from date, price, source_url)` con PK (city, fuel_type, valid_from), lectura pública y sin escritura para el cliente.
- `scripts/import-reference-prices.ts`: recibe un CSV `city,fuel_type,price` más `--valid-from` y `--source`, valida contra los rangos de `shared/domain/fuel.ts` y genera el SQL. **Mario** lo aplica cada mes.
- Mapeo de la ciudad de la estación (`zones.city`) a las ciudades de la resolución, con test. Confirma que Barranquilla está en la lista y deja anotadas las ciudades sin precio oficial.
- Dominio (`shared/domain`): `resolveDisplayPrice(stationPrices, referencePrice, now)` devuelve `{ source: 'community' | 'reference' | 'none', price, freshness }`. Si hay precio comunitario fresco o reciente, ese manda. Si no, se usa el oficial. Si no hay ninguno, 'none'. 100 % cubierto.
- UI: el pin y el panel muestran "Precio de referencia oficial (nov 2026)" con un estilo distinto al comunitario, más una nota de que cada estación puede variar. El promedio de zona deja de presentarse como precio de la estación.
- **Listo cuando:** en producción, todas las estaciones de Barranquilla muestran un precio, sea comunitario o de referencia, y la etiqueta de fuente es correcta.

## [ ] 3.1 — "¿Sigue en $X?"
**Estado (2026-11-15):** base de datos y frontend hechos en la rama; falta aplicar `20261116000400` en producción (sin ella, "Sí" sobre un precio comunitario da error y la UI lo avisa).
- Frontend: `ReportsRepository.confirmPrice` (Supabase y mock), `useConfirmPrice` (Command con rollback: renueva `confirmed_at` en caché al instante con `patchConfirmed` y lo revierte si la RPC falla), `usePriceCheck` (Sí comunitario → `confirm_price`; Sí oficial → `report_price` con el valor de referencia; Toast "¡Gracias!" o el error traducido) y `PriceCheckPrompt` en cada tarjeta de `StationFuelPrices`. "No" → `openReportFor(fuel)` en el store y el modal arranca con ese combustible (`initialForm`). Los mensajes de `PRICE_NOT_FOUND` y `ALREADY_CONFIRMED` van en `rpcErrors`. Otros dispositivos ven la confirmación por realtime (el UPDATE llega como `price-saved`). Tests: `features/prices/priceCheck.test.tsx`; piso de cobertura 72/85/78/72.
- Migración `20261116000400_confirmar_precio.sql`: tabla `price_confirmations` (PK precio + usuario + día de Bogotá, sin acceso del cliente) y RPC `confirm_price` (sesión obligatoria, precio activo en estación activa → si no `PRICE_NOT_FOUND`/404; doble confirmación el mismo día → `ALREADY_CONFIRMED`/409; reportes + confirmaciones comparten el límite de 10 por hora → `RATE_LIMIT`/429; renueva `confirmed_at`). pgTAP `011` (13 casos).
- RPC `confirm_price(p_price_id)`: sesión obligatoria, una confirmación por uid por precio por día, actualiza `confirmed_at` y se cuenta para el límite de tasa general. Tabla `price_confirmations` sin escritura directa. Lleva GRANT explícito y pgTAP (caso feliz, confirmación doble, sin sesión, precio inactivo).
- Panel: "¿Sigue en $15.900? **Sí** / **No**". "Sí" actualiza en forma optimista y muestra el Toast "¡Gracias!". "No" abre el modal con el combustible preseleccionado.
- Sobre un precio de referencia oficial, el botón dice "¿Es este el precio? Sí / No". "Sí" crea un reporte comunitario con ese valor por `report_price`.

## [ ] 3.4 — Medir desde el día uno
- Tabla `events(name, props jsonb, user_id, created_at)` con escritura solo por la RPC `track(p_name, p_props)`: `name` dentro de una lista cerrada, `props` de máximo 1 KB y límite de tasa. Sin datos personales, solo el uid anónimo.
- Eventos: `app_open`, `station_open`, `price_reported`, `price_confirmed`, `vote`, `share`.
- `supabase/queries/metricas.sql`:
  - **Métrica norte:** % de estaciones de Barranquilla con precio comunitario confirmado en ≤ 7 días.
  - Usuarios activos por semana, reportes y confirmaciones por día, y conversión de `station_open` a confirmación o reporte.

---

## Backlog con disparador (no entra a este sprint)
- **2.3 pg_cron para las vistas materializadas:** se hace cuando haya más de 200 escrituras al día en `fuel_prices` o el refresh pase de 200 ms. Con el volumen de hoy, el trigger no es un problema.
- 0.5 y 0.6a–e: se migra al tocar cada componente.

## Sprint 03 (borrador): Lanzamiento en Barranquilla
3.2 enlaces directos, 3.3 compartir por WhatsApp con Open Graph, 4.1 limpieza de estaciones de Barranquilla, 4.2 PWA y Lighthouse, y lanzamiento en grupos de moteros, domiciliarios y taxistas.

## Definición de "sprint terminado"
- [ ] Producción = `main` = repo.
- [ ] Todas las estaciones de Barranquilla muestran precio con su fuente y su frescura.
- [ ] Se puede confirmar un precio con un toque y queda registrado.
- [ ] `metricas.sql` corre contra producción y entrega la métrica norte.
- [ ] `npm run check`, pgTAP y `security:check` en verde (incluido el chequeo de 4326).
- [ ] Mario hizo QA en el celular.
