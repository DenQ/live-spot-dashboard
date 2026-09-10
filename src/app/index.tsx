import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@shared/styles'
import { applyStoredTheme } from '@features/theme'

import { App } from './App'

applyStoredTheme()

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root is missing')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
