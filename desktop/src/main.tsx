import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { FilaProximaProvider } from "./contexts/fila-proxima"
import { Toaster } from "./components/ui/sonner"
import "./styles/globals.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FilaProximaProvider>
        <App />
        <Toaster />
      </FilaProximaProvider>
    </BrowserRouter>
  </React.StrictMode>
)
