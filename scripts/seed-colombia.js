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
function mapOSMToStation(el, zone, zoneId) {
  // Position: nodes have lat/lng, ways/relations have center
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon

  if (!lat || !lng) return null

  const tags    = el.tags || {}
  const brand   = normalizeBrand(tags.brand || tags.operator || tags.name || '')
  const name    = tags.name || tags['brand:es'] || tags.brand || `Gasolinera ${zone.city}`
  const address = buildAddress(tags, zone)

  return {
    id:      randomUUID(),
    osm_id:  `${el.type}/${el.id}`,
    name:    cleanText(name),
    brand:   cleanText(brand),
    address: address,
    lat:     parseFloat(lat.toFixed(6)),
    lng:     parseFloat(lng.toFixed(6)),
    zone_id: zoneId,
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
  const rows = zones.map(z => {
    const id = randomUUID()
    z._uuid = id
    return `  ('${id}', '${cleanText(z.name)}', '${cleanText(z.city)}', ` +
           `'${cleanText(z.dept)}', '${z.code}', ${z.lat}, ${z.lng})`
  }).join(',\n')

  return `
-- ═══════════════════════════════════════════════════════════
--  ZONAS (${zones.length} ciudades principales de Colombia)
-- ═══════════════════════════════════════════════════════════
-- Nota: si ya tienes esta tabla, añade las columnas city/dept/code
-- ALTER TABLE zones ADD COLUMN IF NOT EXISTS city TEXT;
-- ALTER TABLE zones ADD COLUMN IF NOT EXISTS dept TEXT;
-- ALTER TABLE zones ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

INSERT INTO zones (id, name, city, dept, code, lat, lng) VALUES
${rows}
ON CONFLICT (id) DO NOTHING;
`
}

function generateStationsSQL(stations) {
  if (!stations.length) return ''

  const rows = stations.map(s =>
    `  ('${s.id}', '${s.name}', '${s.brand}', '${s.address}', ` +
    `${s.lat}, ${s.lng}, '${s.zone_id}', '${s.osm_id}')`
  ).join(',\n')

  return `
INSERT INTO stations (id, name, brand, address, lat, lng, zone_id, osm_id) VALUES
${rows}
ON CONFLICT (osm_id) DO UPDATE SET
  name    = EXCLUDED.name,
  brand   = EXCLUDED.brand,
  address = EXCLUDED.address,
  lat     = EXCLUDED.lat,
  lng     = EXCLUDED.lng;
`
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

  // Insert zones
  console.error('\n📍 Insertando zonas...')
  const { error: zErr } = await supabase.from('zones').upsert(
    zones.map(z => ({ id: z._uuid, name: z.name, city: z.city, dept: z.dept, code: z.code, lat: z.lat, lng: z.lng })),
    { onConflict: 'id' }
  )
  if (zErr) console.error('  Error zonas:', zErr.message)
  else console.error(`  ✓ ${zones.length} zonas insertadas`)

  // Insert stations in batches of 100
  console.error('\n⛽ Insertando gasolineras...')
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < stations.length; i += BATCH) {
    const batch = stations.slice(i, i + BATCH).map(s => ({
      id: s.id, name: s.name, brand: s.brand, address: s.address,
      lat: s.lat, lng: s.lng, zone_id: s.zone_id, osm_id: s.osm_id,
    }))
    const { error } = await supabase.from('stations').upsert(batch, { onConflict: 'osm_id', ignoreDuplicates: false })
    if (error) console.error(`  ⚠️  Batch ${i}-${i+BATCH}: ${error.message}`)
    else { inserted += batch.length; process.stderr.write('.') }
  }
  console.error(`\n  ✓ ${inserted} gasolineras insertadas`)
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

  // Assign UUIDs to zones first
  targetZones.forEach(z => { z._uuid = randomUUID() })

  const allStations = []
  let totalFetched  = 0
  let totalSkipped  = 0

  // Rate-limit: Overpass pide max 1 req/seg por cortesía
  for (const zone of targetZones) {
    try {
      const elements = await fetchStationsForZone(zone)
      let zoneCount = 0

      for (const el of elements) {
        const station = mapOSMToStation(el, zone, zone._uuid)
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

  console.error(`\n📊 Resultado:`)
  console.error(`   Total encontradas: ${totalFetched}`)
  console.error(`   Sin coordenadas (skip): ${totalSkipped}`)
  console.error(`   Duplicadas removidas: ${totalFetched - deduplicated.length}`)
  console.error(`   ✅ Listas para insertar: ${deduplicated.length}`)

  if (directInsert) {
    await insertToSupabase(targetZones, deduplicated)
    console.error('\n🎉 ¡Seed completado exitosamente!')
    return
  }

  // Generate SQL output
  const header = `
-- ═══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Seed: Gasolineras de Colombia
--  Generado: ${new Date().toISOString()}
--  Fuente: OpenStreetMap (© OpenStreetMap contributors, ODbL)
--  Total zonas: ${targetZones.length}
--  Total gasolineras: ${deduplicated.length}
--
--  Uso: psql $DATABASE_URL < seed.sql
--       o copiar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Primero asegurarse de tener la columna osm_id para UPSERT
ALTER TABLE stations ADD COLUMN IF NOT EXISTS osm_id TEXT UNIQUE;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS city  TEXT;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS dept  TEXT;
ALTER TABLE zones    ADD COLUMN IF NOT EXISTS code  TEXT;

`
  const zonesSQL    = generateZoneSQL(targetZones)
  const stationsSQL = generateStationsSQL(deduplicated)

  // Chunk stations into batches of 500 for SQL readability
  const CHUNK = 500
  const stationChunks = []
  for (let i = 0; i < deduplicated.length; i += CHUNK) {
    stationChunks.push(generateStationsSQL(deduplicated.slice(i, i + CHUNK)))
  }

  const fullSQL = header + zonesSQL + '\n-- ═══════════════════════════════\n' +
    `--  GASOLINERAS (${deduplicated.length} total)\n` +
    '-- ═══════════════════════════════\n\n' +
    stationChunks.join('\n')

  if (outFile) {
    writeFileSync(outFile, fullSQL, 'utf-8')
    console.error(`\n💾 SQL guardado en: ${outFile}`)
    console.error(`   Siguiente paso: ejecuta en Supabase SQL Editor o con psql`)
  } else {
    process.stdout.write(fullSQL)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
