// npm run reference-prices:import -- <archivo.csv> --valid-from YYYY-MM-DD --source https://... [--out archivo.sql]
// Valida el CSV de precios oficiales (city,fuel_type,price) y genera el SQL para el SQL Editor de Supabase.
// No toca la base: Mario revisa el SQL y lo aplica a mano cada mes.
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { parseReferenceCsv, toReferenceSql, validateOptions } from '@/features/prices/import/referencePrices'

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { 'valid-from': { type: 'string' }, source: { type: 'string' }, out: { type: 'string' } },
  })
  const [csvPath] = positionals
  if (!csvPath) {
    console.error('Uso: npm run reference-prices:import -- <archivo.csv> --valid-from YYYY-MM-DD --source https://... [--out archivo.sql]')
    return 1
  }
  const options = validateOptions(values['valid-from'], values.source)
  const rows = parseReferenceCsv(readFileSync(csvPath, 'utf8'))
  const errors = [...(options.ok ? [] : options.errors), ...(rows.ok ? [] : rows.errors)]
  if (!options.ok || !rows.ok) {
    console.error(`No se generó el SQL:\n${errors.map((error) => `  - ${error}`).join('\n')}`)
    return 1
  }
  const sql = toReferenceSql(rows.value, options.value)
  if (values.out) {
    writeFileSync(values.out, sql)
    console.log(`${String(rows.value.length)} precios → ${values.out}`)
  } else {
    process.stdout.write(sql)
  }
  return 0
}

process.exit(main())
