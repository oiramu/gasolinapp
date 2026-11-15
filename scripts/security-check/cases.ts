// Casos de ataque con la anon key. Cada caso pasa si el ataque queda bloqueado:
// no basta con que haya error, se relee la fila para confirmar que nada cambió.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/shared/api/database.types.ts'

export interface Context {
  readonly client: SupabaseClient<Database>
  readonly uid: string
  readonly stations: readonly string[]
  readonly minPrices: ReadonlyMap<string, number>
}

export interface Verdict {
  readonly pass: boolean
  readonly detail: string
}

export interface AttackCase {
  readonly name: string
  readonly run: (ctx: Context) => Promise<Verdict>
}

const FORGED_PRICE = 1
const FORGED_VOTES = 9999
const OUT_OF_RANGE_PRICE = 999_999
const MAX_PRICES_PER_HOUR = 10

const verdict = (pass: boolean, detail: string): Verdict => ({ pass, detail })

/** Estación de prueba n (0, 1 o 2). */
const station = (ctx: Context, index: number): string => ctx.stations[index] ?? ''

async function ownPrice(ctx: Context): Promise<string> {
  const { data, error } = await ctx.client.rpc('report_price', { p_station_id: station(ctx, 0), p_fuel_type: 'corriente', p_price: ctx.minPrices.get('corriente') ?? 0 })
  if (error) throw new Error(`no se pudo crear el precio de prueba: ${error.message}`)
  return data
}

const forgePrice: AttackCase = {
  name: 'UPDATE de fuel_prices.price y votes_up',
  async run(ctx) {
    const id = await ownPrice(ctx)
    await ctx.client.from('fuel_prices').update({ price: FORGED_PRICE, votes_up: FORGED_VOTES }).eq('id', id)
    const { data } = await ctx.client.from('fuel_prices').select('price, votes_up').eq('id', id).single()
    return verdict(data?.price !== FORGED_PRICE && data?.votes_up !== FORGED_VOTES, `fila después del ataque: ${JSON.stringify(data)}`)
  },
}

const insertDirect: AttackCase = {
  name: 'INSERT directo en fuel_prices y reports',
  async run(ctx) {
    const price = await ctx.client.from('fuel_prices').insert({ station_id: station(ctx, 0), fuel_type: 'extra', price: 18000 })
    const report = await ctx.client.from('reports').insert({ station_id: station(ctx, 0), content: 'insert directo' })
    return verdict(price.error !== null && report.error !== null, `errores: ${String(price.error?.code)} / ${String(report.error?.code)}`)
  },
}

const editStation: AttackCase = {
  name: 'UPDATE de nombre, coordenadas o is_active de una estación',
  async run(ctx) {
    const id = station(ctx, 0)
    await ctx.client.from('stations').update({ name: 'Hackeada', lat: 1, is_active: false }).eq('id', id)
    const { data } = await ctx.client.from('stations').select('name, lat, is_active').eq('id', id).single()
    return verdict(data?.name !== 'Hackeada' && data?.lat !== 1 && data?.is_active === true, `fila después del ataque: ${JSON.stringify(data)}`)
  },
}

const doubleVote: AttackCase = {
  name: 'Votar dos veces con la misma sesión',
  async run(ctx) {
    const { data: reportId } = await ctx.client.rpc('add_report', { p_station_id: station(ctx, 1), p_type: 'comment', p_content: 'security-check' })
    const target = { p_target_type: 'report', p_target_id: reportId ?? '', p_value: 1 }
    const first = await ctx.client.rpc('cast_vote', target).single()
    const second = await ctx.client.rpc('cast_vote', target).single()
    const { count } = await ctx.client.from('votes').select('id', { count: 'exact', head: true }).eq('voter_id', ctx.uid).eq('target_id', reportId ?? '')
    return verdict(first.data?.my_vote === 1 && second.data?.my_vote === null && count === 0, `segundo voto: ${JSON.stringify(second.data)}; filas: ${String(count)}`)
  },
}

const outOfRange: AttackCase = {
  name: 'Precio fuera de rango por RPC',
  async run(ctx) {
    const { error } = await ctx.client.rpc('report_price', { p_station_id: station(ctx, 1), p_fuel_type: 'extra', p_price: OUT_OF_RANGE_PRICE })
    return verdict(error?.message === 'OUT_OF_RANGE', `error: ${String(error?.message)}`)
  },
}

const rateLimit: AttackCase = {
  name: 'Pasarse del límite de report_price',
  async run(ctx) {
    let limited = false
    for (const id of ctx.stations) {
      for (const [fuel, price] of ctx.minPrices) {
        const { error } = await ctx.client.rpc('report_price', { p_station_id: id, p_fuel_type: fuel, p_price: price })
        limited ||= error?.message === 'RATE_LIMIT'
      }
    }
    const { count } = await ctx.client.from('fuel_prices').select('id', { count: 'exact', head: true }).eq('reporter_id', ctx.uid)
    return verdict(limited && (count ?? 0) <= MAX_PRICES_PER_HOUR, `RATE_LIMIT visto: ${String(limited)}; precios guardados: ${String(count)}`)
  },
}

const directTables: AttackCase = {
  name: 'Escribir directo en votes y service_suggestions',
  async run(ctx) {
    const vote = await ctx.client.from('votes').insert({ target_type: 'report', target_id: station(ctx, 0), value: 1 })
    const suggestion = await ctx.client.from('service_suggestions').insert({ station_id: station(ctx, 0), voter_id: ctx.uid, services: { svc_bano: true } })
    return verdict(vote.error !== null && suggestion.error !== null, `errores: ${String(vote.error?.code)} / ${String(suggestion.error?.code)}`)
  },
}

/** En el orden del sprint, salvo el límite de tasa: va al final porque agota los reportes de la sesión. */
export const ATTACK_CASES: readonly AttackCase[] = [forgePrice, insertDirect, editStation, doubleVote, outOfRange, directTables, rateLimit]
