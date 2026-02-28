# ⛽ Seed Script — Gasolineras de Colombia

Pobla la base de datos con gasolineras reales de OpenStreetMap (~2,500–3,500 estaciones en Colombia).

## ¿Por qué OpenStreetMap y no Google Maps?

| | OpenStreetMap | Google Maps |
|--|--|--|
| **Costo** | Gratis, siempre | API de pago (~$0.032/request) |
| **Legalidad** | ✅ Open Data (ODbL) | ❌ Scraping viola ToS, riesgo de ban |
| **Datos Colombia** | ~3,000 gasolineras | Más completo pero no accesible |
| **Uso comercial** | ✅ Con atribución | ❌ Prohibido scraping |

---

## Setup rápido

### 1. Aplicar migración en Supabase primero

En **Supabase Dashboard → SQL Editor**, ejecuta:
```
database/migration_seed.sql
```

Esto agrega las columnas `osm_id`, `city`, `dept`, `code` que necesita el seed.

### 2. Opciones para correr el script

#### Opción A: Generar SQL y ejecutar manualmente
```bash
# Genera SQL para todas las ciudades (~2 min, respeta rate limits)
node scripts/seed-colombia.js --out seed.sql

# Luego en Supabase SQL Editor: pegar contenido de seed.sql
```

#### Opción B: Insertar directo en Supabase
```bash
# Necesitas la SERVICE KEY (no la anon key) para bypasear RLS
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGci..."   # Project Settings > API > service_role

node scripts/seed-colombia.js --supabase
```

#### Opción C: Solo una ciudad (para testing rápido)
```bash
# Códigos disponibles: BAQ CTG SMR BOG BOGS MED CLO BUC PEI...
node scripts/seed-colombia.js --city BAQ --out barranquilla.sql
node scripts/seed-colombia.js --city MED --supabase
node scripts/seed-colombia.js --city BOG --out bogota.sql
```

---

## Ciudades incluidas (26 zonas)

| Código | Ciudad | Departamento |
|--------|--------|-------------|
| BAQ | Barranquilla | Atlántico |
| CTG | Cartagena | Bolívar |
| SMR | Santa Marta | Magdalena |
| MTC | Montería | Córdoba |
| VAL | Valledupar | Cesar |
| BOG | Bogotá Norte | Cundinamarca |
| BOGS | Bogotá Sur | Cundinamarca |
| MED | Medellín | Antioquia |
| CLO | Cali | Valle del Cauca |
| BUC | Bucaramanga | Santander |
| PEI | Pereira | Risaralda |
| MAN | Manizales | Caldas |
| IBG | Ibagué | Tolima |
| NEI | Neiva | Huila |
| TUN | Tunja | Boyacá |
| CUC | Cúcuta | Norte de Santander |
| ARM | Armenia | Quindío |
| PAS | Pasto | Nariño |
| VIL | Villavicencio | Meta |
| POP | Popayán | Cauca |
| ... | + 6 más | |

---

## ¿Qué datos trae OSM?

Cada gasolinera incluye (cuando está disponible):
- Nombre de la estación
- Marca (Terpel, Biomax, Primax, Texaco, Shell, etc.)
- Dirección aproximada
- Coordenadas exactas (lat/lng)
- ID de OSM para deduplicación

Los precios **no están en OSM** — esos los reportan los usuarios en la app (ese es el valor diferencial).

---

## Actualizar datos periódicamente

OSM se actualiza constantemente. Para mantener los datos frescos:

```bash
# Cron mensual: re-ejecutar el seed hace UPSERT, no duplica
0 3 1 * * cd /tu/proyecto && node scripts/seed-colombia.js --supabase >> logs/seed.log 2>&1
```

El script hace `INSERT ... ON CONFLICT (osm_id) DO UPDATE` — nunca duplica estaciones existentes.

---

## Agregar más zonas

Edita el array `COLOMBIA_ZONES` en `scripts/seed-colombia.js`:

```js
{ 
  code: 'ARM', 
  name: 'Armenia', 
  city: 'Armenia',
  dept: 'Quindío',
  lat: 4.5339, 
  lng: -75.6811, 
  bbox: [4.44, -75.79, 4.63, -75.58]   // [sur, oeste, norte, este]
}
```

Para obtener el bbox de cualquier ciudad: busca en [bboxfinder.com](http://bboxfinder.com)
