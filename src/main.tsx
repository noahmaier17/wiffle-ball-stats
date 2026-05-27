import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { computeAtBatDeltas } from './utils/computeAtBatDeltas'

declare global { interface Window { computeAtBatDeltas: typeof computeAtBatDeltas; debugLog?: boolean } }
window.computeAtBatDeltas = computeAtBatDeltas;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
