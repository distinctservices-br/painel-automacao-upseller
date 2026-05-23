import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#FAFAFA',
            border: '1px solid rgba(115,243,164,0.30)',
            borderRadius: '10px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#73F3A4', secondary: '#0F0F0F' },
          },
          error: {
            iconTheme: { primary: '#FF8B85', secondary: '#0F0F0F' },
          },
          duration: 3000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
