# Sprint 01 — Producción sincronizada + Fase 1 (Seguridad)

**Ventana:** semana del 14 al 22 de noviembre de 2026 (fechas en hora de Bogotá).
**Objetivo:** que nadie con la anon key pueda alterar precios, votos ni estaciones, y que lo desplegado coincida con el repo.
**Fuera de alcance:** 0.5 y 0.6a–e como tareas aparte. Un componente se pasa a TSX solo si una tarea de este sprint lo toca.
**Rama:** todo el sprint vive en `docs/roadmap-criterios`; el MR a `main` se abre al cerrarlo. Producción se despliega desde la rama con la CLI de Vercel (preview primero, `--prod` con OK de Mario).

> ⚠️ Desde la 1.3c, desplegar `main` rompe producción (todavía escribe directo en las tablas). No despliegues `main` hasta el MR.

## Decisiones (2026-11-14)

- Sin rama de hotfix a `main`: la S0.1 despliega la rama completa tras validar un preview contra la base de producción.
- Cobertura: 100% en `src/shared/domain/**`; piso global en `vite.config.ts`, que solo sube.
- Votos: los `votes_up`/`votes_down` actuales se congelan como base legacy y se suma el `COUNT` de `votes`.
- `report_price` guarda siempre `reported_by = 'Anónimo'` (no hay perfiles hasta la Fase 5).
- Rangos de precio: una sola fuente en `shared/domain`, de la que sale el seed de `fuel_price_ranges`, con un test que compara ambos.

## Reglas del sprint (además de CLAUDE.md)

1. **Expandir y luego contraer.** Ninguna migración puede romper el frontend que está desplegado. El orden es siempre: (a) migración aditiva con la RPC nueva, (b) desplegar el frontend que la usa, (c) migración que cierra la escritura directa. Los pasos (a) y (c) nunca van en el mismo despliegue.
2. **A producción solo con OK explícito de Mario.** Antes de aplicar cualquier cosa con el MCP de Supabase: `supabase db reset` en local sin errores, pgTAP en verde y `npm run check` en verde. Muestra el SQL exacto y espera el OK.
3. Cada RPC lleva `SECURITY DEFINER`, `SET search_path = public`, validación de entradas y `auth.uid()` obligatorio. Al final, `REVOKE ALL ... FROM public` y `GRANT EXECUTE` solo a `anon` y `authenticated`.
4. Cada tabla o RPC nueva tiene pgTAP para el caso feliz **y** para el abuso, y el abuso tiene que fallar.
5. Al cerrar cada tarea: actualizar `docs/ROADMAP.md`, regenerar `database.types.ts` si cambió el schema y hacer un commit convencional.

---

## S0 — Sincronizar producción

### [ ] S0.1 Subir y desplegar
- [x] `git push -u origin docs/roadmap-criterios` (2026-11-14).
- [ ] Preview de la rama contra la base de producción, validado por Mario.
- [ ] `vercel deploy --prod` desde la rama.
- **Listo cuando:** el frontend de producción no hace ninguna escritura a `stations`. Verifícalo en la pestaña de red al reportar un precio.

### [x] S0.2 Ajustar el gate de cobertura
- Umbral del 100 % solo para `src/shared/domain/**`. El umbral global baja a lo que haya hoy (redondeado hacia abajo: líneas 55, ramas 70, funciones 57, sentencias 55) y sube a medida que se migra.
- **Listo cuando:** `npm run check` está en verde en la rama.

### [x] S0.3 Fechas del roadmap
- La 0.4 queda en 2026-11-13 y CLAUDE.md dice: "Las fechas del roadmap van en America/Bogota, no en UTC".

---

## [ ] 1.1 — Identidad anónima

**Estado (2026-11-14):** código, tests y `config.toml` hechos; probado el alta anónima contra el stack local. Pendiente: Mario activa Anonymous sign-ins en el dashboard → preview → `--prod`. **No desplegar antes del toggle:** sin alta anónima, reportar y votar quedan deshabilitados.

- `features/auth/`: `AuthRepository` (Supabase y Mock), `useSession`, `useHasSession` y `useWithSession`, que envuelve el `mutationFn` de reportar y votar para que espere la sesión (o la reintente si el alta falló).
- Verificado en producción (solo lectura): las políticas de escritura actuales son `TO public`, así que el rol `authenticated` (el de la sesión anónima) sigue pudiendo reportar y votar hasta la 1.3c.

**Mario:** activa Authentication → Anonymous sign-ins en el dashboard. En local: `config.toml` → `enable_anonymous_sign_ins = true`.

- Crea `features/auth/` con un repositorio (Supabase y Mock) inyectado por `app/repositories.ts` y un hook `useSession()` que llame `signInAnonymously()` si no hay sesión.
- Las mutaciones (reportar, votar, confirmar) se deshabilitan hasta que exista sesión. El mock devuelve un uid fijo.
- En Configuración, muestra un "ID de dispositivo" con los primeros 6 caracteres del uid.
- Tests: hook con MSW (sesión nueva, sesión existente y error de red).
- **Listo cuando:** recargar mantiene el mismo uid y ninguna mutación sale sin sesión.

## [ ] 1.2 — Votos seguros (expandir)

**Estado (2026-11-14):** hecho en local. `db reset` limpio, la migración corre dos veces sin error, pgTAP 42/42 (30 nuevos en `002_votes_rpc.test.sql`) y `npm run check` en verde.

- Migración `20261115044726_votos_rpc.sql` (el nombre se ajusta a la versión que asigne `apply_migration`): columnas `legacy_votes_up/down` rellenadas una sola vez, tabla `votes` (solo SELECT para el cliente), helpers internos sin EXECUTE público, `cast_vote` y `get_my_votes` (máx. 500 ids). Errores: `NOT_AUTHENTICATED`, `INVALID_VOTE`, `INVALID_TARGET`, `TARGET_NOT_FOUND`, `TOO_MANY_TARGETS`.
- Frontend: `features/votes` (Repository Supabase/Mock, `useMyVotes`, `useCastVote` como Command con rollback, `ReportVotes` + `VoteButtons` en TSX). La regla del toggle vive en `shared/domain/votes.ts` (predicción) y la respuesta del servidor la reemplaza. El realtime parchea los contadores (`votes-updated`) en lugar de invalidar todo.
- Tipos: `npm run db:types` los genera desde la base local (las migraciones). Es más preciso que el generador del MCP (sabe que `latest_prices.price` es NOT NULL).
- **Ventana de transición:** mientras el frontend viejo siga en producción, sus votos por UPDATE directo se pierden con el siguiente voto por RPC sobre ese reporte (el recálculo usa legacy + COUNT). Por eso el deploy va justo después de la migración.
- **Orden de despliegue:** migración (con OK de Mario) → regenerar tipos → preview → `--prod`. La 1.2 necesita la 1.1 en producción (sin sesión no se vota), así que primero va el toggle de Anonymous sign-ins.

**Migración `..._votos_rpc.sql`:**
- Tabla `votes(id uuid pk, target_type text check in ('report','price'), target_id uuid, voter_id uuid not null default auth.uid(), value smallint check in (-1,1), created_at, updated_at)` con `UNIQUE(target_type, target_id, voter_id)`.
- RLS: `SELECT` público y ninguna política de escritura.
- RPC `cast_vote(p_target_type, p_target_id, p_value)`:
  - Verifica que el objetivo exista y esté activo.
  - Hace upsert del voto. Si el valor es igual al voto actual, lo elimina (toggle).
  - Recalcula `votes_up` y `votes_down` del objetivo con `COUNT` desde `votes` (más la base legacy congelada). No usa `+1`.
  - Devuelve `{votes_up, votes_down, my_vote}`.
- RPC `get_my_votes(p_target_ids uuid[])` para pintar el estado del usuario.
- **pgTAP:** votar dos veces no duplica, cambiar de +1 a -1 ajusta los contadores, el toggle elimina, votar sin sesión falla y votar sobre un objetivo inexistente falla.

**Frontend:** el repositorio de votos usa la RPC. La actualización optimista se reconcilia con la respuesta y el estado "mi voto" se ve en la UI.

- **Listo cuando:** está desplegado y en producción se vota por RPC. Las políticas viejas de UPDATE siguen vivas hasta la 1.3c.

## 1.3 — Cerrar escrituras directas

### [ ] 1.3a Expandir: RPCs de escritura

**Estado (2026-11-14):** hecho en local. `db reset` limpio, la migración `20261115044942_rpc_escritura.sql` corre tres veces sin error ni constraints duplicados, pgTAP 82/82 (39 en `004_rpc_escritura`, 1 en `003_reglas_compartidas`) y `npm run check` en verde.

- Rangos con una sola fuente: `fuel.ts`. `sharedRules.db.test.ts` genera `003_reglas_compartidas.test.sql` (`toMatchFileSnapshot`) y ese pgTAP compara la tabla con `fuel.ts`. Probado: cambiar un rango en TS hace fallar vitest; regenerar sin migración hace fallar pgTAP.
- Servicios: las claves válidas salen del catálogo (columnas booleanas `svc_*` de `stations`); los tipos de reporte, del CHECK `reports_type_check`. Ninguna lista se copia en el SQL.
- Cada escritura toma un advisory lock por uid: los límites de tasa no tienen carreras. `RATE_LIMIT` usa SQLSTATE `PT429` (PostgREST responde HTTP 429).
- Errores para el Toast de la 1.3b: `NOT_AUTHENTICATED`, `STATION_NOT_FOUND`, `INVALID_FUEL`, `OUT_OF_RANGE`, `INVALID_COMMENT`, `INVALID_TYPE`, `INVALID_CONTENT`, `INVALID_SERVICES`, `RATE_LIMIT`.
- `service_suggestions` tiene PK (station_id, voter_id): una sugerencia vigente por usuario y estación (repetir la reemplaza). La RPC devuelve las claves que cambiaron en la estación.
- **Para la 1.3b:** la corrección dentro de 30 min es un UPDATE de `fuel_prices`, y el realtime de la 1.2 lee hoy cualquier UPDATE de precio como un cambio de votos. Hay que convertirlo en `price-updated` (reemplaza la fila completa).
**Migración `..._rpc_escritura.sql`:**
- `report_price(p_station_id, p_fuel_type, p_price, p_comment)`:
  - Valida el `fuel_type` contra la lista permitida y el precio contra rangos por tipo, tomados de una tabla `fuel_price_ranges` (seed con los valores de `shared/domain/fuel.ts`, que debe leer la misma fuente o tener un test que las compare).
  - Fuerza `currency = 'COP'` y la unidad según el tipo (m3 para gnv).
  - `reported_by = 'Anónimo'`. No acepta texto libre del cliente para la identidad.
  - Límites: 10 reportes por uid por hora, y 1 por estación y combustible cada 30 min (el segundo actualiza en lugar de duplicar).
  - Errores con código propio (`RATE_LIMIT`, `OUT_OF_RANGE`, `INVALID_FUEL`) que la UI traduce en el Toast.
- `add_report(p_station_id, p_type, p_content)`: `content` de 1 a 280 caracteres, `type` dentro del enum y 5 por uid por hora.
- `suggest_station_services(p_station_id, p_services jsonb)`: solo acepta claves `svc_*` conocidas y guarda en `service_suggestions(station_id, voter_id, services, created_at)`. Cuando 2 uid distintos coinciden en una clave durante 30 días, se aplica a `stations`. Esto reactiva el flag `serviceSuggestions`.
- Columna `reporter_id uuid` en `fuel_prices` y `reports`, que llena la RPC.
- **pgTAP:** caso feliz de cada RPC, precio fuera de rango, combustible inválido, límite de tasa excedido, sin sesión, claves `svc_*` inventadas, y una sola sugerencia que no debe aplicarse.

### [ ] 1.3b Desplegar el frontend
- `ReportPriceModal` y el flujo de comentarios usan las RPC. El modal de servicios vuelve detrás del flag, usando `suggest_station_services`.
- Migra a TSX solo los componentes que toques.

**Estado (2026-11-14):** hecho en local. `npm run check` en verde (190 tests, TS nuevo al 100%), pgTAP 85/85 y contrato cliente ↔ RPC probado con supabase-js contra el Supabase local (alta anónima real; errores con su código; 429 en el límite; 403 al escribir `stations`).

- `features/reports`: el repositorio usa `report_price`, `add_report` y `suggest_station_services`. El envío es un comando (`submitReport`): precios, luego comentario y al final servicios; si una RPC falla, lo anterior queda guardado y el error llega al Toast.
- `ReportPriceModal` en TSX (`features/reports/ui`): contenedor de 85 líneas y presentacionales (`ReportDialog`, `FuelPriceField`, `FuelPriceInput`, `ServicesPicker`, `CommentField`, `SubmitButton`). El borrador se deriva del formulario (`reportForm.ts`, funciones puras). `components/modals/ReportPriceModal.jsx` queda como adaptador del store hasta la 0.5.
- `shared/api/rpcErrors.ts` traduce los códigos de las RPC (tabla de búsqueda); también lo usa el voto.
- Cambios visibles: se quita "Tu nombre" (el servidor guarda "Anónimo"); un precio fuera de rango bloquea el envío; se puede enviar solo un comentario o solo servicios; el contador de caracteres del comentario; `serviceSuggestions` vuelve a `true`.
- Realtime: INSERT y UPDATE de `fuel_prices` son `price-saved` (la fila reemplaza a la de la caché), así se ven las correcciones de 30 min y los votos de precios.
- El pgTAP generado `003_reglas_compartidas` ahora también verifica el largo máximo del comentario (`REPORT_CONTENT_MAX_LENGTH`).
- Los "no encontrado" de las RPC usan `PT404` (HTTP 404) en lugar de `P0002` (salía HTTP 500). Se cambió en las migraciones de la 1.2 y la 1.3a, que todavía no están en producción.
- El catálogo de servicios pasó a `features/stations/ui/serviceCatalog.ts`, tipado con las columnas `svc_*`; `lib/services.js` lo reexporta.
- **Deploy:** requiere la 1.1, la 1.2 y la 1.3a en producción. Después de este deploy, la 1.3c ya puede cerrar las escrituras directas.

### [ ] 1.3c Contraer
**Migración `..._cerrar_escrituras_precios_reportes.sql`** (después de que la 1.3b esté en producción):
- Elimina las políticas de INSERT y UPDATE públicas de `fuel_prices` y `reports`.
- `REVOKE INSERT, UPDATE, DELETE` sobre `fuel_prices`, `reports`, `stations`, `votes` y `service_suggestions` a `anon` y `authenticated`.
- Hallazgo del 2026-11-14: en producción `anon` y `authenticated` también tienen `TRUNCATE`, `REFERENCES` y `TRIGGER` sobre `fuel_prices`, `reports` y `stations` (TRUNCATE se salta RLS; PostgREST no lo expone, pero no debe quedar). Usar `REVOKE ALL` + `GRANT SELECT` en lugar del REVOKE parcial.
- **pgTAP:** cada escritura directa con rol anon o authenticated falla.

**Estado (2026-11-14):** hecho en local (`20261115060000_cerrar_escrituras_precios_reportes.sql`, pgTAP `005_escrituras_cerradas`). Además de las políticas, borra cualquier otra de escritura en `public` y deja solo SELECT también en las vistas (`latest_prices`, `daily_avg_prices`, `v_station_summary` tenían INSERT/UPDATE/DELETE para el cliente).

## [ ] 1.4 — Prueba de ataque contra producción

- `scripts/security-check.ts`, que corre con `npm run security:check` y usa solo `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Intenta:
  1. UPDATE de `fuel_prices.price` y de `votes_up`
  2. INSERT directo en `fuel_prices` y `reports`
  3. UPDATE de nombre, coordenadas o `is_active` de una estación
  4. Votar dos veces con la misma sesión
  5. Pasarse del límite de `report_price`
  6. Precio fuera de rango por RPC
  7. Escribir en `votes` y `service_suggestions` directamente
- Imprime PASS/FAIL por caso y termina con código 1 si algo pasa. Los intentos que sí deben crear datos usan una estación de prueba marcada (`is_test = true`, oculta en la UI) y se limpian al final con una RPC administrativa, o se documenta que el uid de prueba tiene un límite de tasa propio.
- Documéntalo en el README.
- **Listo cuando:** Mario lo corre contra producción y todo sale PASS.

**Estado (2026-11-14):** hecho en local. `scripts/security-check/` (casos como tabla + runner, TS nativo de Node 22), migración `20261115060100_estaciones_de_prueba.sql` (tres estaciones `is_test`, ocultas en la app; `clear_my_test_data` solo borra lo de la propia sesión en estaciones de prueba) y pgTAP `006_datos_de_prueba`. Contra el local: todo PASS; con un hueco reabierto a propósito: 2 FAIL y exit 1.

---

## Paso a producción (pendiente de autorización)

Claude Code no tiene permiso para escribir en producción (lo bloqueó el modo automático), así que esto queda para Mario o para cuando se autorice `mcp__supabase__apply_migration` y `vercel deploy --prod`. Orden obligatorio (expandir → desplegar → contraer):

1. **Dashboard de Supabase:** Authentication → Sign In / Providers → activar *Anonymous sign-ins*.
2. **Migraciones aditivas** (el frontend actual sigue funcionando con ellas): `20261115044726_votos_rpc.sql` y `20261115044942_rpc_escritura.sql`, en ese orden (SQL Editor o `apply_migration`). Después, renombrar los archivos con la versión que quede en `supabase_migrations.schema_migrations`.
3. **Deploy:** `npx vercel deploy --prod` desde la rama (o promover el preview del último commit). Sale todo junto: S0.1, 1.1, 1.2 y 1.3b. Probar en producción: reportar un precio, votar y ver el ID de dispositivo en Configuración.
4. **Contraer:** `20261115060000_cerrar_escrituras_precios_reportes.sql` y `20261115060100_estaciones_de_prueba.sql`.
5. **Verificar:** `npm run security:check` (usa `.env`) → todo PASS. Revisar los advisors de seguridad.
6. **MR** de `docs/roadmap-criterios` a `main` (Vercel despliega `main` a producción: ya es el mismo código).

Entre 2 y 3, los votos que entren por el frontend viejo se pierden con el siguiente voto por RPC en ese reporte; por eso el deploy va enseguida.

---

## Definición de "sprint terminado"

- [ ] Producción = `main` = el repo (sin cambios hechos solo en el dashboard).
- [x] `npm run check` y pgTAP en verde (rama, 2026-11-14: 190 tests y 130 pgTAP).
- [ ] `security:check` todo PASS contra producción.
- [ ] Ninguna política de INSERT, UPDATE o DELETE pública queda en el schema (agrega a pgTAP un test que lo verifique sobre `pg_policies`). El test ya existe (`005`); falta aplicar la 1.3c en producción.
- [x] ROADMAP.md actualizado y lo siguiente definido: Fase 2 (2.1 frescura, 2.2 precios oficiales, 2.3 pg_cron, 2.4 bugs del mapa).

## Siguiente: Sprint 02 — Fase 2 (datos vivos)

Arranca cuando este sprint esté en producción y mergeado. Orden propuesto, una tarea por sesión:

1. **2.4 Bugs del mapa** primero: es verificación y deja el mapa estable para lo demás.
2. **2.1 Frescura en lugar de vencimiento a 24 h**: `report_price` ya renueva `created_at`; falta el modelo de frescura en `shared/domain` y en la UI.
3. **2.3 Refrescos programados con pg_cron** (`cron.unschedule` antes de `cron.schedule`): refresco de `latest_prices` y `daily_avg_prices`.
4. **2.2 Precios oficiales de referencia**.

Deuda que queda anotada: la 0.5 (slices del store; el adaptador `components/modals/ReportPriceModal.jsx` se va con ella), la 0.6a–e, y el ajuste de los privilegios por defecto de `public` para que las tablas nuevas no nazcan con escritura para el cliente.
