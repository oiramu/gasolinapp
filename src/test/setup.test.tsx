import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from './msw/server'

const API = 'https://api.test/estado'

describe('infraestructura de tests', () => {
  it('renderiza con Testing Library y usa los matchers de jest-dom', () => {
    render(<p>Tanquear</p>)
    expect(screen.getByText('Tanquear')).toBeInTheDocument()
  })

  it('responde con los handlers registrados en MSW', async () => {
    server.use(http.get(API, () => HttpResponse.json({ ok: true })))
    const res = await fetch(API)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('rechaza las peticiones sin handler', async () => {
    await expect(fetch('https://api.test/sin-handler')).rejects.toThrow()
  })
})
