import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FuelType } from '@/shared/domain/fuel'
import { readStationLink, writeStationLink } from './stationLink'
import { useStationLink, type StationLinkOptions } from './useStationLink'

describe('readStationLink', () => {
  it('lee la estación y el combustible', () => {
    expect(readStationLink('?estacion=s1&combustible=diesel')).toEqual({ stationId: 's1', fuelType: 'diesel' })
  })

  it('sin combustible, o con uno desconocido (super es legado), solo la estación', () => {
    expect(readStationLink('?estacion=s1')).toEqual({ stationId: 's1', fuelType: null })
    expect(readStationLink('?estacion=s1&combustible=super')).toEqual({ stationId: 's1', fuelType: null })
  })

  it('sin estación (o vacía) no hay enlace', () => {
    expect(readStationLink('')).toBeNull()
    expect(readStationLink('?combustible=extra')).toBeNull()
    expect(readStationLink('?estacion=%20')).toBeNull()
  })
})

describe('writeStationLink', () => {
  it('pone la estación y el combustible y conserva los demás parámetros', () => {
    expect(writeStationLink('?utm_source=whatsapp', { stationId: 's1', fuelType: 'gnv' })).toBe('?utm_source=whatsapp&estacion=s1&combustible=gnv')
  })

  it('reemplaza un enlace anterior y, sin combustible, no lo escribe', () => {
    expect(writeStationLink('?estacion=s1&combustible=extra', { stationId: 's2', fuelType: null })).toBe('?estacion=s2')
  })

  it('sin estación abierta quita el enlace (y el "?" si no queda nada)', () => {
    expect(writeStationLink('?estacion=s1&combustible=extra&utm_source=x', null)).toBe('?utm_source=x')
    expect(writeStationLink('?estacion=s1', null)).toBe('')
  })
})

describe('useStationLink', () => {
  const stations = [{ id: 's1' }, { id: 's2' }]

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  function renderLink(url: string, initial: Partial<StationLinkOptions<{ id: string }>> = {}) {
    window.history.replaceState(null, '', url)
    const onOpen = vi.fn<(station: { id: string }, fuelType: FuelType | null) => void>()
    const props: StationLinkOptions<{ id: string }> = { stations, ready: false, openStationId: null, fuelType: 'corriente', onOpen, ...initial }
    const hook = renderHook((options: StationLinkOptions<{ id: string }>) => {
      useStationLink(options)
    }, { initialProps: props })
    return { ...hook, onOpen, props }
  }

  it('espera a que carguen las estaciones y abre la del enlace una sola vez', () => {
    const { rerender, onOpen, props } = renderLink('/?estacion=s2&combustible=extra')
    expect(onOpen).not.toHaveBeenCalled()
    expect(window.location.search).toBe('?estacion=s2&combustible=extra') // mientras carga, la URL no se toca
    rerender({ ...props, ready: true })
    rerender({ ...props, ready: true, openStationId: 's2', fuelType: 'extra' })
    rerender({ ...props, ready: true, openStationId: 's2', fuelType: 'extra', stations: [...stations] })
    expect(onOpen).toHaveBeenCalledExactlyOnceWith({ id: 's2' }, 'extra')
    expect(window.location.search).toBe('?estacion=s2&combustible=extra')
  })

  it('un id que no existe deja el mapa normal y limpia la URL', () => {
    const { onOpen } = renderLink('/?estacion=no-existe', { ready: true })
    expect(onOpen).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })

  it('abrir otra estación, cambiar de combustible y cerrar actualizan la URL sin llenar el historial', () => {
    const { rerender, props } = renderLink('/#mapa', { ready: true })
    const historyLength = window.history.length
    rerender({ ...props, ready: true, openStationId: 's1' })
    expect(window.location.search).toBe('?estacion=s1&combustible=corriente')
    rerender({ ...props, ready: true, openStationId: 's1', fuelType: 'diesel' })
    expect(window.location.search).toBe('?estacion=s1&combustible=diesel')
    rerender({ ...props, ready: true, openStationId: null, fuelType: 'diesel' })
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#mapa')
    expect(window.history.length).toBe(historyLength)
  })
})
