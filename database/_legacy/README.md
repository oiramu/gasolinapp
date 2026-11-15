# database/_legacy — histórico, no usar

Estos scripts se corrieron a mano en el SQL Editor antes de que existieran migraciones. Quedan solo como referencia.

**La fuente de verdad del schema es `supabase/migrations/`.** La baseline `20261113000000_baseline.sql` reconstruye el estado de producción al 2026-11-13 y reemplaza todo lo de esta carpeta. El hotfix `hotfixes/0.0_cerrar_escrituras_stations.sql` ya vive como la migración `20261113235634_cerrar_escrituras_stations.sql`.

No edites ni vuelvas a correr estos archivos. Algunos ya no coinciden con producción. Por ejemplo, `schema.sql` define `price < 100` y usa `super`. El detalle está en `docs/db/0.1-diferencias.md`.
