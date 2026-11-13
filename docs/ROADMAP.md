# GasolinApp — Roadmap en paralelo a Evolv

**Supuesto de tiempo:** 6–8 h por semana, en sesiones de 1–2 h (dos noches y un bloque el fin de semana). Cada tarea cabe en una sesión.
**Meta a ~8 semanas:** GasolinApp segura, con datos vivos, en TypeScript con 100% de cobertura y lanzada en Barranquilla. Eran 6 semanas; la Fase 0 creció para subir el criterio de aceptación (ver `CLAUDE.md`).
**Métrica norte:** % de estaciones de Barranquilla con un precio confirmado en los últimos 7 días.

> Trabaja esto en tu tiempo y en tu equipo y cuentas personales, separado de lo de Evolv.

**Cómo usar este archivo:** abre Claude Code en la raíz del repo, crea la rama de la tarea y pega el prompt. Claude Code ya lee `CLAUDE.md` con las reglas y el criterio de aceptación. Tú revisas el plan, apruebas, revisas el diff y aplicas a mano el SQL en Supabase.

---

## Fase 0 — Base (semanas 1–3)

### [x] 0.0 Hotfix: cerrar el UPDATE público de `stations`
**Estado:** código listo. Falta que Mario aplique `database/hotfixes/0.0_cerrar_escrituras_stations.sql` en producción y corra los bloques de verificación.

**Por qué primero:** `database/add_stations_update_policy.sql` crea `FOR UPDATE USING (TRUE)` sobre `stations`. Hoy cualquiera con la anon key puede renombrar, mover o desactivar todas las estaciones.
**Prompt:**
> Lee CLAUDE.md. Genera un SQL idempotente (`DROP POLICY IF EXISTS "Public update stations" ON stations;`) para aplicar a mano en producción, más el bloque de verificación contra `pg_policies`. En el frontend, oculta temporalmente la edición de servicios en ReportPriceModal y deja de enviar `modifiedServices` en `submitPriceReport`. La tarea 1.3 lo vuelve a habilitar con una RPC. Cuando exista `supabase/migrations/` (0.1), este cambio queda como migración.

**Listo cuando:** un UPDATE con la anon key sobre `stations` falla y la app no intenta escribir en esa tabla.

### [ ] 0.1 Migraciones reales y schema alineado con producción
**Tú primero:** instala la Supabase CLI y corre `supabase login`, `supabase init` y `supabase link --project-ref <ref>`, y luego `supabase db pull`. Eso crea una migración base con el schema real de producción.
**Prompt:**
> Lee CLAUDE.md. Acabo de correr `supabase db pull` y generó una migración base en `supabase/migrations/`. Compárala con los archivos de `database/` y hazme un informe de diferencias (columnas, constraints, políticas RLS, funciones, triggers, vistas). Pon especial atención al CHECK de `fuel_prices.price` (en schema.sql es `< 100`) y al `currency` por defecto 'USD'. Luego mueve `database/` a `database/_legacy/` con un README que explique que la verdad está en `supabase/migrations/`, y actualiza el README principal con el flujo nuevo. Borra `package copy.json`, la carpeta `{src` y el shim `src/hooks/useStations.js`. Verifica que exista `.env.example`. Genera `src/shared/api/database.types.ts` con `supabase gen types typescript --linked`.

**Listo cuando:** el repo refleja producción, hay un informe de diferencias, los tipos de la DB están generados y el README explica cómo crear y aplicar migraciones.

### [ ] 0.2 Tooling: TypeScript, tests y calidad
**Prompt:**
> Lee CLAUDE.md. Configura:
> - TypeScript strict (`noUncheckedIndexedAccess`, `allowJs` solo durante la transición).
> - vitest con Testing Library, MSW y `@vitest/coverage-v8`, con umbral del 100% global en líneas, ramas, funciones y sentencias de `src/`.
> - ESLint con `@typescript-eslint`, `complexity`, `max-depth` y `sonarjs/cognitive-complexity`.
> - pgTAP con `supabase test db` para el SQL.
> - Scripts: `npm test`, `npm run typecheck`, `npm run lint` y `npm run check` (lint + typecheck + test + build). `build` pasa a ser `tsc --noEmit && vite build`.
>
> Agrega los alias de `@/` en tsconfig y en vitest. Todavía no migres código.

**Listo cuando:** `npm run check` corre. Va a fallar por cobertura hasta terminar la 0.6; documenta eso en el PR.

### [ ] 0.3 Dominio compartido en TypeScript
**Prompt:**
> Lee CLAUDE.md. Migra `src/lib/fuel.js` a `src/shared/domain/fuel.ts`, con tipos derivados (`FuelType = keyof typeof FUEL_TYPES`). Extrae `distanceMeters` y `getBestStation` de `App.jsx` a `src/shared/domain/geo.ts`; en `getBestStation`, resuelve los precios una sola vez por estación. Tests al 100% para `getLatestPrices`, `formatPrice` (incluye GNV en m³ y null → "Sin reporte"), `isPriceOutlier`, `getFuelUnit`, `distanceMeters` y `getBestStation`. Cero cambios de comportamiento.

**Listo cuando:** `App.jsx` importa desde `shared/domain` y esos módulos tienen 100%.

### [ ] 0.4 Capa de datos: Repository, Strategy y TanStack Query
**Prompt:**
> Lee CLAUDE.md.
> - Crea las interfaces `StationsRepository`, `ZonesRepository` y `PricesRepository`, con implementaciones Supabase y Mock inyectadas por un provider según `env`. Elimina los `if (env.useMockData)` de los hooks.
> - Agrega un Adapter fila → modelo de dominio.
> - Arregla `config/env` para que el modo mock no exija las variables de Supabase.
> - Mueve a repositorios las consultas directas de `TankCalculatorModal` y `PriceHistoryChart`.
> - Pasa los hooks de datos a TanStack Query. El realtime parchea o invalida la caché con debounce; no más refetch total por evento.
> - Tests al 100%: MSW para Supabase y repositorios mock para los hooks.

**Listo cuando:** ningún componente importa `supabase` y un cambio en una estación no refetchea todas.

### [ ] 0.5 Estado de UI: slices, persist y selectores
**Prompt:**
> Lee CLAUDE.md. Divide `appStore` en slices (`ui`, `map`, `filters`, `prefs` con el middleware `persist`, y el toast en su propia cola). Quita el `loadPrefs`/`savePrefs` manual, sin perder las preferencias que ya están guardadas en `gasolinapp_prefs` (migración de versión en `persist`). Todos los consumidores usan selectores con `useShallow`. Rompe el ciclo store ↔ `markers`: una factory pura `createStationIcon` con caché por clave compuesta, sin `getState()` ni `clearIconCache` desde el store. `bestStation` pasa a ser derivado, no estado. Tests al 100%.

**Listo cuando:** no hay imports circulares (verificado con `madge --circular`) y ningún componente usa `useAppStore()` sin selector.

### [ ] 0.6 Componentes chicos en TypeScript (una sesión por sub-tarea)
**Prompt base:**
> Lee CLAUDE.md. Migra `<componente>` a `features/<feature>/ui/` en TSX, partiéndolo en contenedor y presentacionales de menos de unas 150 líneas, sin cambiar el comportamiento visible. Tests al 100% con Testing Library.

- [ ] 0.6a Mapa: `MapView`, `markers`, `MapLegend`, `FilterChips` y `BrandFilterChips`. Quita `key={defaultFuelType}` y pasa las estaciones filtradas (resuelve la mayor parte de la 2.4).
- [ ] 0.6b `StationPanel` y `BestPriceCard`
- [ ] 0.6c `ReportPriceModal`
- [ ] 0.6d `TankCalculatorModal`
- [ ] 0.6e `SpotlightModal`, `SettingsModal`, `PriceHistoryChart`, `TopBar`, `Toast` y `App.tsx`. Al final se quita `allowJs`.

**Listo cuando:** no queda `.js`/`.jsx` en `src/` y `npm run check` está en verde con 100% global.

---

## Fase 1 — Seguridad (semana 4)

### [ ] 1.1 Identidad anónima
**Tú primero:** en el dashboard de Supabase activa Authentication → Anonymous sign-ins.
**Prompt:**
> Lee CLAUDE.md. Implementa sesión anónima con `supabase.auth.signInAnonymously()` al cargar la app si no hay sesión, en `features/auth` (repositorio + hook `useAuth`). Toda mutación debe esperar a que exista sesión. Con datos mock no debe romper nada (AuthRepository mock). Muestra en Configuración un "ID de dispositivo" corto (los primeros 6 caracteres del uid) para depurar.

**Listo cuando:** cada visitante tiene un `auth.uid()` estable en ese navegador.

### [ ] 1.2 Votos seguros
**Prompt:**
> Lee CLAUDE.md. El voto actual (`voteOnReport`) lee y escribe +1 desde el cliente, y la RLS permite UPDATE público. Crea una migración con:
> - Tabla `votes(id, target_type ('report'|'price'), target_id uuid, voter_id uuid default auth.uid(), value smallint check in (-1,1), created_at)` con UNIQUE(target_type, target_id, voter_id).
> - RPC `cast_vote(target_type, target_id, value)` SECURITY DEFINER: hace upsert del voto (`ON CONFLICT`) y recalcula `votes_up`/`votes_down` por conteo en la misma transacción.
> - RLS de `votes` con lectura pública y sin escritura directa.
>
> En el frontend, usa una mutación optimista con rollback y refleja el voto del usuario (activo y cambiable). Tests pgTAP: caso feliz, doble voto, valor inválido, sin sesión.

**Listo cuando:** votar dos veces no suma dos y el contador es correcto con clics concurrentes.

### [ ] 1.3 Cerrar escrituras directas
**Prompt:**
> Lee CLAUDE.md. Crea una migración que elimine las políticas de UPDATE públicas de `fuel_prices` y `reports` (la de `stations` ya salió en la 0.0), y la de INSERT público de `fuel_prices` y `reports`. Crea una tabla `fuel_price_ranges(fuel_type, min, max)` como fuente única de los rangos: la lee la RPC y la expone al frontend, que deja de duplicar `FUEL_PRICE_RANGES`. Reemplaza las escrituras con RPCs SECURITY DEFINER:
> - `report_prices(station_id, prices jsonb, comment)`: atómica para varios combustibles; valida rangos contra la tabla, exige auth.uid() y limita a 10 reportes por usuario por hora y 1 por estación y combustible cada 30 min.
> - `add_report(station_id, type, content)`: con límite de largo y de tasa.
> - `suggest_station_services(station_id, services jsonb)`: guarda en `service_suggestions` y aplica el cambio a `stations` solo cuando 2 usuarios distintos coinciden.
>
> Vuelve a habilitar la edición de servicios en la UI. Mapea los errores de las RPC a mensajes del Toast en `shared/api/errors.ts`. Tests pgTAP para cada RPC.

**Listo cuando:** todas las escrituras pasan por RPC y los límites devuelven errores claros que la UI muestra en el Toast.

### [ ] 1.4 Prueba de ataque
**Prompt:**
> Lee CLAUDE.md. Escribe `scripts/security-check.ts`, que use solo la anon key (variables de entorno) e intente:
> - actualizar el precio de un reporte ajeno,
> - poner votes_up = 9999,
> - renombrar, mover o desactivar una estación,
> - insertar en fuel_prices sin RPC,
> - votar dos veces,
> - pasarse del límite de reportes.
>
> Cada intento debe fallar y el script imprime PASS/FAIL por caso. Debe ser idempotente: los casos que logran escribir algo legítimo lo identifican con un marcador para poder limpiarlo. Documenta cómo correrlo en el README.

**Listo cuando:** todos los casos dan PASS contra producción. Esto lo corres tú.

---

## Fase 2 — Datos vivos (semana 5)

### [ ] 2.1 Frescura en lugar de vencimiento a 24 h
**Prompt:**
> Lee CLAUDE.md. Hoy `fuel_prices.expires_at` vence a las 24 h y eso deja el mapa vacío. Cambia el modelo: un precio sigue vigente hasta que llega uno más nuevo para esa estación y combustible. Agrega `confirmed_at` (último momento en que alguien lo confirmó) y en `shared/domain/freshness.ts` una función `getFreshness(confirmed_at)` basada en una tabla de umbrales (sin cadena de if) que devuelva 'fresco' (<3 días), 'reciente' (<10), 'viejo' (<30) o 'dudoso'. La UI muestra "confirmado hace X días" y baja la opacidad del pin según la frescura. Actualiza la leyenda. Migración + tests al 100%.

### [ ] 2.2 Precios oficiales de referencia
**Prompt:**
> Lee CLAUDE.md. El Gobierno publica cada mes precios de referencia por ciudad (resolución de MinEnergía/Hacienda que rige desde el día 1). Crea la tabla `reference_prices(city, fuel_type, valid_from date, price, source_url)` con UNIQUE(city, fuel_type, valid_from) y lectura pública. Crea `scripts/import-reference-prices.ts`, que lee un CSV (`city,fuel_type,price`) más la fecha y la URL de la fuente y genera un SQL idempotente (`ON CONFLICT ... DO UPDATE`). En la UI, si una estación no tiene precio fresco, muestra el oficial de su ciudad con la etiqueta "Precio de referencia oficial" en lugar del promedio de zona. Mapea `stations.city` a las ciudades de la resolución, empezando por Barranquilla.

**Tú, cada mes:** llenas el CSV con la resolución nueva y corres el script (unos 10 minutos).

### [ ] 2.3 Refrescos programados
**Prompt:**
> Lee CLAUDE.md. Las vistas materializadas `latest_prices` y `daily_avg_prices` se refrescan con un trigger por cada INSERT. Migración: quita esos triggers (`DROP TRIGGER IF EXISTS`) y programa con pg_cron un refresh CONCURRENTLY cada 5 minutos, de forma idempotente (`cron.unschedule` si ya existe y luego `cron.schedule`). Documenta que hay que activar pg_cron en el dashboard.

### [ ] 2.4 Bugs del mapa (verificación)
**Prompt:**
> Lee CLAUDE.md. Verifica que en la 0.6a quedaron resueltos: (1) el filtro "cerca" se aplica al mapa, y (2) cambiar de combustible no vuelve a montar el mapa ni pierde centro y zoom. Agrega tests de regresión si faltan.

---

## Fase 3 — Que reportar sea fácil (semanas 6–7)

### [ ] 3.1 Botón "¿Sigue en $X?"
**Prompt:**
> Lee CLAUDE.md. En StationPanel, junto a cada precio, agrega "¿Sigue en $15.900? Sí / No". "Sí" llama una RPC `confirm_price(price_id)` que actualiza `confirmed_at` y registra la confirmación (una por usuario por precio por día, con UNIQUE). "No" abre ReportPriceModal con el combustible preseleccionado. Usa una mutación optimista con rollback y un Toast "¡Gracias! Confirmaste el precio". Test pgTAP de la RPC.

### [ ] 3.2 Enlaces directos por estación
**Prompt:**
> Lee CLAUDE.md. Soporta `?estacion=<id>` (y `?combustible=`) en la URL: al cargar, centra el mapa y abre el panel de esa estación. Al abrir o cerrar el panel, actualiza la URL con history.replaceState. Hazlo en un módulo único de sincronización URL ↔ store en `src/app/`.

### [ ] 3.3 Compartir por WhatsApp
**Prompt:**
> Lee CLAUDE.md. Agrega "Compartir" en StationPanel y en BestPriceCard usando la Web Share API, con respaldo a `https://wa.me/?text=` (Strategy). El texto sale de una función pura testeada: "⛽ Corriente a $15.900 en Terpel El Recreo (confirmado hoy). Míralo en GasolinApp: <link con ?estacion=>". Agrega meta tags Open Graph y una imagen OG estática en `public/` para que el link se vea bien en WhatsApp.

### [ ] 3.4 Medir
**Prompt:**
> Lee CLAUDE.md. Crea una tabla `events(name, props jsonb, user_id, created_at)` con INSERT solo vía RPC `track(name, props)`, con límite de tasa. Registra: app_open, station_open, price_reported, price_confirmed, vote, share, a través de un puerto `Analytics` (con implementación no-op en mock). Crea `supabase/queries/metricas.sql` con la métrica norte (% de estaciones de Barranquilla con precio confirmado en 7 días), los reportantes activos de la semana y los reportes por día.

---

## Fase 4 — Lanzamiento Barranquilla (semana 8)

### [ ] 4.1 Limpieza de datos de Barranquilla
**Prompt:**
> Lee CLAUDE.md. Escribe `supabase/queries/barranquilla-calidad.sql` para encontrar estaciones de Barranquilla duplicadas (menos de 60 m entre sí con la misma marca), sin marca, sin dirección o con `zone_id` nulo. Genera una migración idempotente de corrección para los casos obvios y una lista CSV de los dudosos para revisar a mano.

### [ ] 4.2 Pulido de PWA
**Prompt:**
> Lee CLAUDE.md. Revisa el manifest y el service worker para que la app se pueda instalar en Android, con un prompt de instalación discreto después del segundo uso. Haz una auditoría de Lighthouse en móvil y corrige lo que esté por debajo de 90 en Performance y PWA.

**Tú (sin Claude Code):** reporta tú mismo unas 30 estaciones de Barranquilla, compártela en grupos de moteros, domiciliarios y taxistas a gas, y mira la métrica norte cada semana.

---

## Fase 5 — Mi garaje (semanas 9–11, solo si la fase 4 muestra uso)

- [ ] 5.1 Pasar de usuario anónimo a cuenta con email, conservando el historial (`linkIdentity` / `updateUser`)
- [ ] 5.2 Tablas `vehicles` y `refuels` con RLS por dueño, y registro de tanqueadas desde el panel de la estación
- [ ] 5.3 Consumo en km/gal y gasto mensual por vehículo (Recharts)
- [ ] 5.4 Recordatorios de mantenimiento (aceite y llantas por km o por fecha), enlazados con los servicios de las estaciones

---

## Backlog (no tocar antes de la fase 5)

- Reporte con foto del aviso de precios o del recibo, con OCR
- Alerta del día 1 de cada mes con la variación oficial de la ciudad (push)
- Estaciones en la ruta (Barranquilla–Santa Marta, Cordialidad)
- Reportes rápidos: "sin combustible" / "fila larga"
- Perfil reclamable para dueños de estación
- API pública de precios
