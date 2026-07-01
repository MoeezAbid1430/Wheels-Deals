import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom' // Import this
import { AuctionProvider } from './context/AuctionContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap App in BrowserRouter */}
    <BrowserRouter>
      <AuctionProvider>
        <App />
      </AuctionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
