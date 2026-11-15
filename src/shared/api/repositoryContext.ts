import { createContext, useContext, type Provider } from 'react'

export interface RepositoryContext<T> {
  readonly Provider: Provider<T | null>
  readonly useRepository: () => T
}

/**
 * Contexto de inyección para el repositorio de un feature. La app decide qué
 * implementación provee (Supabase o Mock); los hooks solo conocen la interfaz.
 */
export function createRepositoryContext<T>(name: string): RepositoryContext<T> {
  const Context = createContext<T | null>(null)
  const useRepository = (): T => {
    const repository = useContext(Context)
    if (repository === null) throw new Error(`Falta el proveedor del repositorio "${name}"`)
    return repository
  }
  return { Provider: Context.Provider, useRepository }
}
