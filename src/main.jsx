import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import FavoritesProvider from './context/FavoritesProvider.jsx'
import ProductProvider from './context/ProductProvider.jsx'
import {BrowserRouter} from "react-router-dom";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><FavoritesProvider><ProductProvider><App /></ProductProvider></FavoritesProvider></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
