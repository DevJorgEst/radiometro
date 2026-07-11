import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RadioProvider } from './context/RadioContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RadioProvider>
      <App />
    </RadioProvider>
  </StrictMode>,
)
