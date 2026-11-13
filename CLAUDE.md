# GasolinApp — contexto para Claude Code

Mapa colaborativo de precios de combustible en Colombia. Los usuarios reportan y verifican precios de Corriente, Extra, Diésel, GNV y AdBlue/Urea por estación. Producción: https://gasolinapp.oiramu.com

## Stack

- Frontend: React 18 + Vite, TypeScript strict (migración en curso, tareas 0.2–0.6), Tailwind + shadcn/ui, Lucide, React-Leaflet (+ markercluster), TanStack Query (estado del servidor), Zustand (estado de UI y preferencias), Recharts, date-fns
- Backend: Supabase (Postgres + PostGIS, Realtime, RLS, RPC)
- Datos de estaciones: OpenStreetMap vía `scripts/seed-colombia.js`

## Comandos

```bash
npm run dev      # http://localhost:5173
npm run build    # debe pasar antes de dar una tarea por terminada
npm test         # vitest (se agrega en la tarea 0.2)
npm run check    # lint + typecheck + test con cobertura + build (se agrega en la tarea 0.2)
```

Sin Supabase configurado la app corre con datos mock (`VITE_USE_MOCK_DATA=true`).

## Mapa del código

Estado actual (JS, se migra en la Fase 0):

- `src/lib/fuel.js`: fuente única de verdad para tipos de combustible, unidades, formato de precios, rangos de validación y colores de marca. No dupliques esta lógica en componentes.
- `src/services/*.service.js`: única capa que habla con Supabase. Los componentes no llaman a `supabase` directamente.
- `src/hooks/`: fetch + realtime + geolocalización.
- `src/store/appStore.js`: estado global (Zustand).
- `src/components/`: map/, panels/, modals/ y componentes sueltos.
- `supabase/migrations/`: migraciones SQL numeradas (se crea en la tarea 0.1; `database/` queda como histórico).

Arquitectura destino (todo archivo nuevo o migrado va aquí, en `.ts`/`.tsx`):

```
src/
  app/            providers (QueryClient, repositorios), shell de la app, sincronización con la URL
  shared/
    domain/       lógica pura: fuel, geo, freshness
    api/          cliente de Supabase, database.types.ts (generado), mapeo de errores de RPC
    ui/           primitivas de shadcn, Toast
    config/       env (valida según el modo: el modo mock no exige Supabase)
  features/<feature>/
    api/          interfaz Repository + implementaciones Supabase y Mock
    model/        queries y mutaciones (TanStack Query), slices y selectores (Zustand)
    ui/           componentes chicos: contenedor (datos) y presentacional (props)
```

## Criterio de aceptación (obligatorio)

Ningún cambio se da por terminado si no cumple todo esto:

1. **SOLID y DRY.** Una responsabilidad por módulo y por función. Si una regla vive en SQL y en TS (por ejemplo, los rangos de precio), una sola fuente la genera o la expone.
2. **Sin antipatrones ni acoplamiento.** Nada de god components ni god stores, `getState()` dentro de funciones de render, imports circulares, números mágicos o prop drilling de varios niveles. Los componentes no conocen Supabase ni los mocks: dependen de interfaces de repositorio que se inyectan (Repository + Strategy).
3. **Complejidad mínima.** Retornos tempranos, tablas de búsqueda en vez de cadenas de if/switch y funciones puras. ESLint lo exige (`complexity`, `max-depth`, `sonarjs/cognitive-complexity`).
4. **Componentes chicos.** Un solo propósito y menos de unas 150 líneas. Se separan el contenedor (datos y estado) y el presentacional (props puras).
5. **Patrones donde aportan.** Repository, Strategy, Adapter (fila de DB → modelo de dominio), Factory (íconos del mapa), Observer (realtime) y Command (mutaciones optimistas con rollback).
6. **Estado responsable.**
   - El estado del servidor va en TanStack Query; el de UI y las preferencias, en Zustand por slices con `persist`.
   - Siempre con selectores (`useShallow`); nunca `useAppStore()` sin selector.
   - El estado derivado no se guarda.
   - El realtime parchea o invalida la caché; nunca hace un refetch total por cada evento.
7. **TypeScript strict.** `noUncheckedIndexedAccess` activo, los tipos de la DB son generados y no hay `any` implícito.
8. **Scripts y migraciones idempotentes.** Se pueden correr dos veces sin error ni duplicados: `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`, `ON CONFLICT` y `cron.unschedule` antes de `cron.schedule`.
9. **100% de cobertura global.** Líneas, ramas, funciones y sentencias de `src/`, con el umbral de vitest; si baja de 100, falla. Toda RPC tiene una prueba pgTAP con el caso feliz y un caso de abuso que falla.

## Convenciones de dominio

- Claves de combustible: `corriente`, `extra`, `diesel`, `gnv`, `urea`. Nunca `super` (es legado).
- Precios en COP enteros. Galón para líquidos y m³ para GNV (`getFuelUnit`).
- UI en español de Colombia: "tanquear", "galón", "estación", "EDS".
- Zona horaria de negocio: `America/Bogota`.

## Reglas de base de datos (obligatorias)

1. Todo cambio de schema va en una migración nueva en `supabase/migrations/`. Nunca edites una migración ya aplicada.
2. Prohibido crear políticas RLS de `UPDATE` o `DELETE` públicas. Las escrituras del cliente pasan por funciones RPC `SECURITY DEFINER` con `SET search_path = public`, que validan entradas y usan `auth.uid()`.
3. El cliente solo usa la anon key. La service key no toca el frontend ni el repo.
4. No ejecutes nada contra la base de producción. Genera el SQL y deja instrucciones: Mario lo revisa y lo aplica.
5. Toda RPC nueva necesita un test pgTAP (`supabase test db`, en local) que verifique el caso feliz y que el abuso falle.

## Forma de trabajo

- Una tarea del `docs/ROADMAP.md` por rama: `feat/<id>-<slug>` o `fix/<id>-<slug>`.
- Antes de escribir código, propone un plan corto (archivos que tocarás y riesgos) y espera el OK.
- Cambios pequeños y revisables. Si la tarea crece, divídela y avisa.
- Al terminar: `npm run check` en verde (mientras no exista, `npm run build`), un resumen de lo hecho y los pasos manuales pendientes para Mario (por ejemplo, SQL a correr en Supabase o toggles en el dashboard).
- Marca la tarea como hecha en `docs/ROADMAP.md`.
- Commits en español, estilo convencional: `fix(rls): ...`, `feat(mapa): ...`.
