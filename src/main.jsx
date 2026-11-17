import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders'
import { createQueryClient } from './app/queryClient'
import { createRepositories } from './app/repositories'
import { registerServiceWorker } from './app/serviceWorker'
import { parseEnv } from './shared/config/env'
import './index.css'

const repositories = createRepositories(parseEnv(import.meta.env))

// 4.2: solo en el build (en dev el service worker se mezclaría con la recarga en caliente)
if (import.meta.env.PROD) registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders repositories={repositories} queryClient={createQueryClient()}>
      <App />
    </AppProviders>
  </React.StrictMode>
)
