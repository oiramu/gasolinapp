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

### [ ] 1.3c Contraer
**Migración `..._cerrar_escrituras_precios_reportes.sql`** (después de que la 1.3b esté en producción):
- Elimina las políticas de INSERT y UPDATE públicas de `fuel_prices` y `reports`.
- `REVOKE INSERT, UPDATE, DELETE` sobre `fuel_prices`, `reports`, `stations`, `votes` y `service_suggestions` a `anon` y `authenticated`.
- Hallazgo del 2026-11-14: en producción `anon` y `authenticated` también tienen `TRUNCATE`, `REFERENCES` y `TRIGGER` sobre `fuel_prices`, `reports` y `stations` (TRUNCATE se salta RLS; PostgREST no lo expone, pero no debe quedar). Usar `REVOKE ALL` + `GRANT SELECT` en lugar del REVOKE parcial.
- **pgTAP:** cada escritura directa con rol anon o authenticated falla.

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

---

## Definición de "sprint terminado"

- [ ] Producción = `main` = el repo (sin cambios hechos solo en el dashboard).
- [ ] `npm run check` y pgTAP en verde.
- [ ] `security:check` todo PASS contra producción.
- [ ] Ninguna política de INSERT, UPDATE o DELETE pública queda en el schema (agrega a pgTAP un test que lo verifique sobre `pg_policies`).
- [ ] ROADMAP.md actualizado y lo siguiente definido: Fase 2 (2.1 frescura, 2.2 precios oficiales, 2.3 pg_cron, 2.4 bugs del mapa).
