import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createRepositoryContext } from './repositoryContext'

const { Provider, useRepository } = createRepositoryContext<{ name: string }>('demo')

describe('createRepositoryContext', () => {
  it('entrega el repositorio inyectado', () => {
    const repository = { name: 'mock' }
    const wrapper = ({ children }: { children: ReactNode }) => <Provider value={repository}>{children}</Provider>
    expect(renderHook(() => useRepository(), { wrapper }).result.current).toBe(repository)
  })

  it('falla con un mensaje claro si falta el proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useRepository())).toThrow('Falta el proveedor del repositorio "demo"')
  })
})
