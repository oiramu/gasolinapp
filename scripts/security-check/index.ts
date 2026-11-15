// npm run security:check — prueba de ataque con la anon key (SUPABASE_URL y SUPABASE_ANON_KEY).
// Imprime PASS/FAIL por caso y sale con código 1 si algún ataque pasa.
// Escribe solo en las estaciones de prueba (is_test) y al final borra lo suyo con clear_my_test_data.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/shared/api/database.types.ts'
import { ATTACK_CASES, type Context, type Verdict } from './cases.ts'

const EXPECTED_TEST_STATIONS = 3

function env(name: string, fallback: string): string {
  const value = process.env[name] ?? process.env[fallback]
  if (!value) throw new Error(`Falta ${name} (o ${fallback})`)
  return value
}

async function connect(): Promise<Context> {
  const client = createClient<Database>(env('SUPABASE_URL', 'VITE_SUPABASE_URL'), env('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  })
  const { data: auth, error } = await client.auth.signInAnonymously()
  if (error || !auth.user) throw new Error(`No se pudo crear la sesión anónima: ${String(error?.message)}`)

  const { data: stations } = await client.from('stations').select('id').eq('is_test', true).order('id')
  if (stations?.length !== EXPECTED_TEST_STATIONS) throw new Error('Faltan las estaciones de prueba (migración estaciones_de_prueba)')

  const { data: ranges } = await client.from('fuel_price_ranges').select('fuel_type, min_price')
  const minPrices = new Map((ranges ?? []).map(({ fuel_type, min_price }) => [fuel_type, min_price]))
  return { client, uid: auth.user.id, stations: stations.map(({ id }) => id), minPrices }
}

async function runCase(ctx: Context, run: (ctx: Context) => Promise<Verdict>): Promise<Verdict> {
  try {
    return await run(ctx)
  } catch (error) {
    return { pass: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function main(): Promise<number> {
  const ctx = await connect()
  console.log(`Sesión anónima ${ctx.uid}\n`)
  let failures = 0
  for (const { name, run } of ATTACK_CASES) {
    const { pass, detail } = await runCase(ctx, run)
    if (!pass) failures += 1
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : `\n      ${detail}`}`)
  }
  const { data: deleted, error } = await ctx.client.rpc('clear_my_test_data')
  console.log(`\nLimpieza: ${error ? `ERROR ${error.message}` : `${String(deleted)} filas de prueba borradas`}`)
  await ctx.client.auth.signOut()
  console.log(failures === 0 ? 'Todo PASS' : `${String(failures)} caso(s) FAIL`)
  return failures === 0 ? 0 : 1
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
