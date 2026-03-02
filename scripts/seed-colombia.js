#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════
 *  GasolinApp — Seed Script: Gasolineras de Colombia
 *  Fuente: OpenStreetMap via Overpass API (gratuito, legal, ~3000 estaciones)
 *
 *  Uso:
 *    node scripts/seed-colombia.js              # Genera SQL en stdout
 *    node scripts/seed-colombia.js --city BAQ   # Solo Barranquilla
 *    node scripts/seed-colombia.js --out seed.sql  # Guarda archivo
 *    node scripts/seed-colombia.js --supabase   # Inserta directo en Supabase
 *
 *  Dependencias (ya en package.json): @supabase/supabase-js
 *  Dependencia extra solo para este script:
 *    npm install node-fetch@3   (o usa Node 18+ que tiene fetch nativo)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const cityFilter  = args.includes('--city')     ? args[args.indexOf('--city') + 1]     : null
const outFile     = args.includes('--out')      ? args[args.indexOf('--out') + 1]      : null
const directInsert = args.includes('--supabase')

// ── Zonas de Colombia (ciudades principales + sus límites bbox) ──────────────
// bbox formato: [south, west, north, east]
export const COLOMBIA_ZONES = [
  // ── Caribe ─────────────────────────────────────────────────────
  { code: 'BAQ', name: 'Barranquilla',      city: 'Barranquilla',   dept: 'Atlántico',       lat: 10.9878, lng: -74.7889, bbox: [10.85, -74.95, 11.12, -74.63] },
  { code: 'CTG', name: 'Cartagena',         city: 'Cartagena',      dept: 'Bolívar',          lat: 10.3910, lng: -75.4794, bbox: [10.20, -75.65, 10.55, -75.30] },
  { code: 'SMR', name: 'Santa Marta',       city: 'Santa Marta',    dept: 'Magdalena',        lat: 11.2408, lng: -74.2110, bbox: [11.10, -74.32, 11.38, -74.06] },
  { code: 'MTC', name: 'Montería',          city: 'Montería',       dept: 'Córdoba',          lat:  8.7479, lng: -75.8814, bbox: [ 8.60, -76.05,  8.90, -75.70] },
  { code: 'VAL', name: 'Valledupar',        city: 'Valledupar',     dept: 'Cesar',            lat: 10.4769, lng: -73.2538, bbox: [10.35, -73.40, 10.62, -73.14] },
  { code: 'RHC', name: 'Riohacha',          city: 'Riohacha',       dept: 'La Guajira',       lat: 11.5444, lng: -72.9072, bbox: [11.43, -73.03, 11.68, -72.77] },
  { code: 'SNS', name: 'Sincelejo',         city: 'Sincelejo',      dept: 'Sucre',            lat:  9.3047, lng: -75.3978, bbox: [ 9.18, -75.54,  9.44, -75.26] },

  // ── Andina ─────────────────────────────────────────────────────
  { code: 'BOG', name: 'Bogotá Norte',      city: 'Bogotá',         dept: 'Cundinamarca',     lat:  4.7110, lng: -74.0721, bbox: [ 4.60, -74.22,  4.83, -73.99] },
  { code: 'BOGS', name: 'Bogotá Sur',       city: 'Bogotá',         dept: 'Cundinamarca',     lat:  4.5200, lng: -74.1200, bbox: [ 4.36, -74.23,  4.62, -73.99] },
  { code: 'MED', name: 'Medellín',          city: 'Medellín',       dept: 'Antioquia',        lat:  6.2442, lng: -75.5812, bbox: [ 6.10, -75.72,  6.38, -75.44] },
  { code: 'MEDN', name: 'Norte Antioquia',  city: 'Bello',          dept: 'Antioquia',        lat:  6.3350, lng: -75.5550, bbox: [ 6.28, -75.63,  6.45, -75.48] },
  { code: 'CLO', name: 'Cali',             city: 'Cali',            dept: 'Valle del Cauca',  lat:  3.4516, lng: -76.5320, bbox: [ 3.28, -76.67,  3.58, -76.39] },
  { code: 'BUC', name: 'Bucaramanga',       city: 'Bucaramanga',    dept: 'Santander',        lat:  7.1254, lng: -73.1198, bbox: [ 6.98, -73.26,  7.26, -73.00] },
  { code: 'PEI', name: 'Pereira',           city: 'Pereira',        dept: 'Risaralda',        lat:  4.8133, lng: -75.6961, bbox: [ 4.70, -75.85,  4.93, -75.56] },
  { code: 'MAN', name: 'Manizales',         city: 'Manizales',      dept: 'Caldas',           lat:  5.0700, lng: -75.5130, bbox: [ 4.95, -75.64,  5.19, -75.38] },
  { code: 'IBG', name: 'Ibagué',            city: 'Ibagué',         dept: 'Tolima',           lat:  4.4389, lng: -75.2322, bbox: [ 4.33, -75.38,  4.56, -75.10] },
  { code: 'NEI', name: 'Neiva',             city: 'Neiva',          dept: 'Huila',            lat:  2.9273, lng: -75.2819, bbox: [ 2.80, -75.43,  3.07, -75.14] },
  { code: 'TUN', name: 'Tunja',             city: 'Tunja',          dept: 'Boyacá',           lat:  5.5353, lng: -73.3678, bbox: [ 5.45, -73.48,  5.63, -73.25] },
  { code: 'CUC', name: 'Cúcuta',            city: 'Cúcuta',         dept: 'Norte de Santander', lat: 7.8891, lng: -72.4967, bbox: [ 7.78, -72.62,  7.99, -72.38] },
  { code: 'ARM', name: 'Armenia',           city: 'Armenia',        dept: 'Quindío',          lat:  4.5339, lng: -75.6811, bbox: [ 4.44, -75.79,  4.63, -75.58] },
  { code: 'PAS', name: 'Pasto',             city: 'Pasto',          dept: 'Nariño',           lat:  1.2136, lng: -77.2811, bbox: [ 1.10, -77.40,  1.33, -77.16] },
  { code: 'VIL', name: 'Villavicencio',     city: 'Villavicencio',  dept: 'Meta',             lat:  4.1533, lng: -73.6345, bbox: [ 4.02, -73.77,  4.29, -73.49] },
  { code: 'POP', name: 'Popayán',           city: 'Popayán',        dept: 'Cauca',            lat:  2.4448, lng: -76.6147, bbox: [ 2.33, -76.73,  2.56, -76.50] },

  // ── Pacífico ───────────────────────────────────────────────────
  { code: 'BTV', name: 'Buenaventura',      city: 'Buenaventura',   dept: 'Valle del Cauca',  lat:  3.8801, lng: -77.0311, bbox: [ 3.74, -77.17,  3.99, -76.89] },

  // ── Orinoquia ──────────────────────────────────────────────────
  { code: 'YOP', name: 'Yopal',             city: 'Yopal',          dept: 'Casanare',         lat:  5.3378, lng: -72.3956, bbox: [ 5.24, -72.53,  5.46, -72.27] },

  // ── Eje Cafetero ───────────────────────────────────────────────
  { code: 'CAL', name: 'Caldas (Antioquia)', city: 'Caldas',        dept: 'Antioquia',        lat:  6.0930, lng: -75.6380, bbox: [ 5.98, -75.74,  6.18, -75.54] },
]

// ── Overpass API query builder ────────────────────────────────────────────────
function buildOverpassQuery(bbox) {
  const [s, w, n, e] = bbox
  return `
[out:json][timeout:60];
(
  node["amenity"="fuel"](${s},${w},${n},${e});
  way["amenity"="fuel"](${s},${w},${n},${e});
  relation["amenity"="fuel"](${s},${w},${n},${e});
);
out center tags;
`.trim()
}

// ── Fetch from Overpass ───────────────────────────────────────────────────────
async function fetchStationsForZone(zone) {
  const query = buildOverpassQuery(zone.bbox)
  const url   = 'https://overpass-api.de/api/interpreter'

  console.error(`  ⏳ Fetching ${zone.name} (${zone.code})...`)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) throw new Error(`Overpass error ${res.status}: ${await res.text()}`)

  const json = await res.json()
  return json.elements || []
}

// ── Map OSM element → station object ─────────────────────────────────────────
function mapOSMToStation(el, zone) {
  // Position: nodes have lat/lng, ways/relations have center
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon

  if (!lat || !lng) return null

  const tags    = el.tags || {}
  const brand   = normalizeBrand(tags.brand || tags.operator || tags.name || '')
  const name    = tags.name || tags['brand:es'] || tags.brand || `Gasolinera ${zone.city}`
  const address = buildAddress(tags, zone)

  return {
    id:        randomUUID(),
    osm_id:    `${el.type}/${el.id}`,
    name:      cleanText(name),
    brand:     cleanText(brand),
    address:   address,
    lat:       parseFloat(lat.toFixed(6)),
    lng:       parseFloat(lng.toFixed(6)),
    zone_code: zone.code,   // store code, not UUID — resolved in SQL via LATERAL
  }
}

function normalizeBrand(raw) {
  const s = raw.toLowerCase()
  if (s.includes('terpel'))   return 'Terpel'
  if (s.includes('biomax'))   return 'Biomax'
  if (s.includes('primax'))   return 'Primax'
  if (s.includes('texaco'))   return 'Texaco'
  if (s.includes('shell'))    return 'Shell'
  if (s.includes('chevron'))  return 'Chevron'
  if (s.includes('mobil'))    return 'Mobil'
  if (s.includes('bp'))       return 'BP'
  if (s.includes('puma'))     return 'Puma'
  if (s.includes('esso'))     return 'Esso'
  if (s.includes('zeuss'))    return 'Zeuss'
  if (s.includes('petrobras')) return 'Petrobras'
  if (s.includes('gulf'))     return 'Gulf'
  if (s.includes('galp'))     return 'Galp'
  if (s.includes('brio'))     return 'Brio'
  return raw ? cleanText(raw) : 'Independiente'
}

function buildAddress(tags, zone) {
  const parts = []
  if (tags['addr:street'])      parts.push(tags['addr:street'])
  if (tags['addr:housenumber']) parts.push('#' + tags['addr:housenumber'])
  if (!parts.length && tags['addr:full']) return cleanText(tags['addr:full'])
  if (!parts.length) return zone.city
  return cleanText(parts.join(' '))
}

function cleanText(s) {
  return (s || '').trim().replace(/'/g, "''").substring(0, 200)
}

// ── SQL generators ────────────────────────────────────────────────────────────

function generateZoneSQL(zones) {
  const rows = zones.map(z =>
    `  (gen_random_uuid(), '${cleanText(z.name)}', '${cleanText(z.city)}', ` +
    `'${cleanText(z.dept)}', '${z.code}', ${z.lat}, ${z.lng})`
  ).join(',\n')

  return `
-- ══════════════════════════════════════════════════════════════════
--  PASO 1: Preparar columnas y constraint (seguro si ya existen)
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE stations ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS city   TEXT;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS dept   TEXT;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS code   TEXT;

ALTER TABLE stations DROP CONSTRAINT IF EXISTS stations_osm_id_unique;
ALTER TABLE stations ADD  CONSTRAINT stations_osm_id_unique UNIQUE (osm_id);

-- ══════════════════════════════════════════════════════════════════
--  PASO 2: Insertar/actualizar zonas
-- ══════════════════════════════════════════════════════════════════
INSERT INTO zones (id, name, city, dept, code, lat, lng) VALUES
${rows}
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  dept = EXCLUDED.dept,
  code = EXCLUDED.code;
`
}

// Generates stations INSERT grouped by zone, using a LATERAL subquery to find
// the zone_id dynamically — works regardless of what UUIDs exist in the DB.
function generateStationsSQL(stations, zones) {
  if (!stations.length) return ''

  const byZone = new Map()
  for (const s of stations) {
    if (!byZone.has(s.zone_code)) byZone.set(s.zone_code, [])
    byZone.get(s.zone_code).push(s)
  }

  const blocks = []
  for (const [code, zoneStations] of byZone) {
    const zone = zones.find(z => z.code === code)
    if (!zone) continue

    const rows = zoneStations.map(s =>
      `    ('${s.id}', '${s.name}', '${s.brand}', '${s.address}', ` +
      `${s.lat}, ${s.lng}, '${s.osm_id}')`
    ).join(',\n')

    blocks.push(`
-- ${zone.name} (${code}) — ${zoneStations.length} estaciones
INSERT INTO stations (id, name, brand, address, lat, lng, zone_id, osm_id)
SELECT v.id::uuid, v.name, v.brand, v.address, v.lat::float, v.lng::float, z.id, v.osm_id
FROM (VALUES
${rows}
) AS v(id, name, brand, address, lat, lng, osm_id)
CROSS JOIN LATERAL (
  SELECT id FROM zones
  WHERE name ILIKE '%${cleanText(zone.city)}%'
     OR name ILIKE '%${cleanText(zone.name)}%'
     OR (ABS(lat - ${zone.lat}) < 0.27 AND ABS(lng - (${zone.lng})) < 0.27)
  ORDER BY ABS(lat - ${zone.lat}) + ABS(lng - (${zone.lng}))
  LIMIT 1
) z
ON CONFLICT (osm_id) DO UPDATE SET
  name    = EXCLUDED.name,
  brand   = EXCLUDED.brand,
  address = EXCLUDED.address,
  lat     = EXCLUDED.lat,
  lng     = EXCLUDED.lng;`)
  }

  return blocks.join('\n')
}

// ── Direct Supabase insert ────────────────────────────────────────────────────
async function insertToSupabase(zones, stations) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ Faltan variables: SUPABASE_URL y SUPABASE_SERVICE_KEY')
    console.error('   Usa: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-colombia.js --supabase')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  // ── Step 1: Fetch ALL existing zones from DB ─────────────────────────────────
  console.error('\n📍 Sincronizando zonas...')
  const { data: existingZones, error: fetchErr } = await supabase
    .from('zones').select('id, name, lat, lng')
  if (fetchErr) {
    console.error('  ❌ Error leyendo zonas:', fetchErr.message)
    process.exit(1)
  }
  console.error(`  ℹ️  Zonas existentes en DB: ${existingZones.length}`)
  if (existingZones.length > 0) {
    console.error('     ' + existingZones.map(z => `"${z.name}"`).join(', '))
  }

  // ── Step 2: Match cada zona del script con una zona de DB ────────────────────
  // Estrategia: primero por nombre exacto, luego por ciudad contenida,
  // luego por proximidad geográfica (radio 30km)
  const zoneIdMap = new Map() // zone.code → real DB UUID

  for (const z of zones) {
    const nameLC = z.name.toLowerCase()
    const cityLC = z.city.toLowerCase()

    const match = existingZones.find(ez => {
      const ezLC = ez.name.toLowerCase()
      // 1. Nombre exacto
      if (ezLC === nameLC) return true
      // 2. El nombre del script está contenido en el de DB (ej: "Barranquilla" en "Barranquilla Norte")
      if (ezLC.includes(nameLC) || nameLC.includes(ezLC)) return true
      // 3. Ciudad contenida en nombre de zona
      if (ezLC.includes(cityLC) || cityLC.includes(ezLC)) return true
      // 4. Proximidad geográfica < 30km (~0.27 grados)
      if (Math.abs(ez.lat - z.lat) < 0.27 && Math.abs(ez.lng - z.lng) < 0.27) return true
      return false
    })

    if (match) {
      zoneIdMap.set(z.code, match.id)
      z._uuid = match.id
      console.error(`  ✓ "${z.name}" → zona existente "${match.name}" (${match.id.slice(0,8)}...)`)
    }
  }

  // ── Step 3: Crear zonas que no existen en DB ─────────────────────────────────
  const newZones = zones.filter(z => !zoneIdMap.has(z.code))

  if (newZones.length > 0) {
    console.error(`\n  ℹ️  ${newZones.length} zonas nuevas a crear: ${newZones.map(z => z.code).join(', ')}`)

    // Intentar insertar (requiere service_role key o RLS desactivado)
    const toInsert = newZones.map(z => ({
      id: z._uuid, name: z.name, city: z.city, dept: z.dept,
      code: z.code, lat: z.lat, lng: z.lng,
    }))

    const { error: insErr } = await supabase.from('zones').insert(toInsert)

    if (insErr) {
      // Si falla por RLS, dar instrucciones claras para hacerlo manual
      console.error(`\n  ⚠️  No se pudieron crear zonas automáticamente (${insErr.message})`)
      console.error('\n  ════════════════════════════════════════════════════════')
      console.error('  📋 Ejecuta este SQL en el Supabase SQL Editor y vuelve a correr el script:')
      console.error('  ════════════════════════════════════════════════════════\n')
      for (const z of newZones) {
        console.error(`  INSERT INTO zones (id, name, city, dept, code, lat, lng)`)
        console.error(`  VALUES ('${z._uuid}', '${z.name}', '${z.city}', '${z.dept}', '${z.code}', ${z.lat}, ${z.lng})`)
        console.error(`  ON CONFLICT (id) DO NOTHING;\n`)
      }
      console.error('  ════════════════════════════════════════════════════════')

      if (zoneIdMap.size === 0) {
        console.error('\n  ❌ Sin zonas válidas, abortando.')
        process.exit(1)
      }
      console.error(`\n  ⚡ Continuando con las ${zoneIdMap.size} zonas que sí se encontraron...\n`)
    } else {
      newZones.forEach(z => {
        zoneIdMap.set(z.code, z._uuid)
        console.error(`  ✓ Zona "${z.name}" creada (${z._uuid.slice(0,8)}...)`)
      })
    }
  }

  console.error(`\n  ✅ ${zoneIdMap.size}/${zones.length} zonas listas`)

  // ── Step 4: Remap zone_id de cada estación al UUID real de DB ────────────────
  // El script asignó z._uuid a las estaciones antes de conocer los IDs reales
  const uuidToCode = new Map(zones.map(z => [z._uuid, z.code]))

  const remappedStations = stations
    .map(s => {
      const code      = uuidToCode.get(s.zone_id)
      const realZoneId = code ? zoneIdMap.get(code) : null
      return realZoneId ? { ...s, zone_id: realZoneId } : null
    })
    .filter(Boolean)

  const skipped = stations.length - remappedStations.length
  if (skipped > 0) {
    console.error(`  ⚠️  ${skipped} estaciones omitidas (su zona no existe en DB)`)
  }

  if (remappedStations.length === 0) {
    console.error('  ❌ No hay estaciones para insertar. Verifica que las zonas existan en DB.')
    process.exit(1)
  }

  // ── Step 5: Upsert estaciones en batches de 100 ──────────────────────────────
  console.error(`\n⛽ Insertando ${remappedStations.length} gasolineras...`)
  const BATCH = 100
  let inserted = 0
  let errCount = 0

  for (let i = 0; i < remappedStations.length; i += BATCH) {
    const batch = remappedStations.slice(i, i + BATCH).map(s => ({
      id: s.id, name: s.name, brand: s.brand, address: s.address,
      lat: s.lat, lng: s.lng, zone_id: s.zone_id, osm_id: s.osm_id,
    }))
    const { error } = await supabase.from('stations').upsert(
      batch, { onConflict: 'osm_id', ignoreDuplicates: false }
    )
    if (error) {
      errCount++
      console.error(`\n  ⚠️  Batch ${i}–${i + batch.length}: ${error.message}`)
    } else {
      inserted += batch.length
      process.stderr.write('.')
    }
  }
  console.error(`\n  ✓ ${inserted} gasolineras insertadas${errCount ? ` (${errCount} batches con error)` : ''}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const targetZones = cityFilter
    ? COLOMBIA_ZONES.filter(z => z.code === cityFilter.toUpperCase())
    : COLOMBIA_ZONES

  if (!targetZones.length) {
    console.error(`❌ Ciudad "${cityFilter}" no encontrada. Códigos disponibles:`)
    console.error(COLOMBIA_ZONES.map(z => `  ${z.code} → ${z.name}`).join('\n'))
    process.exit(1)
  }

  console.error(`\n🇨🇴 GasolinApp — Seed Script`)
  console.error(`📊 Procesando ${targetZones.length} zonas...`)
  console.error(`🌐 Fuente: OpenStreetMap / Overpass API\n`)

  const allStations = []
  let totalFetched  = 0
  let totalSkipped  = 0

  // Rate-limit: Overpass pide max 1 req/seg por cortesía
  for (const zone of targetZones) {
    try {
      const elements = await fetchStationsForZone(zone)
      let zoneCount = 0

      for (const el of elements) {
        const station = mapOSMToStation(el, zone)
        if (!station) { totalSkipped++; continue }
        allStations.push(station)
        zoneCount++
      }

      console.error(`  ✓ ${zone.name}: ${zoneCount} estaciones`)
      totalFetched += zoneCount

      // Polite delay between requests
      if (targetZones.indexOf(zone) < targetZones.length - 1) {
        await new Promise(r => setTimeout(r, 1200))
      }
    } catch (err) {
      console.error(`  ❌ Error en ${zone.name}: ${err.message}`)
    }
  }

  // Remove duplicates by OSM ID (some stations near zone borders appear twice)
  const seen = new Set()
  const deduplicated = allStations.filter(s => {
    if (seen.has(s.osm_id)) return false
    seen.add(s.osm_id)
    return true
  })

  // Dedup por proximidad: node + way + relation del mismo sitio físico
  // Si dos estaciones están a <50m entre sí, conserva solo la primera encontrada
  const DIST = 0.0005 // ~50 metros en grados
  const final = []
  for (const s of deduplicated) {
    const nearby = final.find(e =>
      Math.abs(e.lat - s.lat) < DIST && Math.abs(e.lng - s.lng) < DIST
    )
    if (!nearby) final.push(s)
  }

  console.error(`\n📊 Resultado:`)
  console.error(`   Total encontradas: ${totalFetched}`)
  console.error(`   Sin coordenadas (skip): ${totalSkipped}`)
  console.error(`   Duplicadas por osm_id: ${totalFetched - deduplicated.length}`)
  console.error(`   Duplicadas por proximidad (<50m): ${deduplicated.length - final.length}`)
  console.error(`   ✅ Listas para insertar: ${final.length}`)

  if (directInsert) {
    await insertToSupabase(targetZones, final)
    console.error('\n🎉 ¡Seed completado exitosamente!')
    return
  }

  // Always output a SQL file — default name seed.sql
  const outputFile = outFile || 'seed.sql'

  const header = `-- ═══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Seed: Gasolineras de Colombia
--  Generado: ${new Date().toISOString()}
--  Fuente: OpenStreetMap (© OpenStreetMap contributors, ODbL)
--  Total zonas: ${targetZones.length}
--  Total gasolineras: ${final.length}
--
--  Instrucciones:
--  1. Abre Supabase SQL Editor
--  2. Pega TODO este archivo y ejecuta
--  3. El SQL busca zonas existentes por nombre/proximidad automáticamente
-- ═══════════════════════════════════════════════════════════════════════════

`

  const zonesSQL    = generateZoneSQL(targetZones)
  const stationsSQL = generateStationsSQL(final, targetZones)

  const fullSQL = header + zonesSQL +
    `\n-- ══════════════════════════════════════════════════════════════════\n` +
    `--  PASO 3: Gasolineras (${final.length} total, agrupadas por zona)\n` +
    `-- ══════════════════════════════════════════════════════════════════\n` +
    stationsSQL + '\n'

  writeFileSync(outputFile, fullSQL, 'utf-8')
  console.error(`\n💾 SQL guardado en: ${outputFile}  (${(fullSQL.length/1024).toFixed(0)} KB)`)
  console.error(`\n✅ Siguiente paso:`)
  console.error(`   1. Abre Supabase → SQL Editor`)
  console.error(`   2. Pega el contenido de ${outputFile}`)
  console.error(`   3. Ejecuta — ¡listo!`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
