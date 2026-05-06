import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkbenchApp } from '@/app/WorkbenchApp'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <WorkbenchApp />
  </StrictMode>,
)
