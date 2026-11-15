import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders'
import { createQueryClient } from './app/queryClient'
import { createRepositories } from './app/repositories'
import { parseEnv } from './shared/config/env'
import './index.css'

const repositories = createRepositories(parseEnv(import.meta.env))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders repositories={repositories} queryClient={createQueryClient()}>
      <App />
    </AppProviders>
  </React.StrictMode>
)
