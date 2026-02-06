import { Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import TocarPage from "@/pages/Tocar"
import NotaPage from "@/pages/Nota"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tocar/:codigo" element={<TocarPage />} />
      <Route path="/nota" element={<NotaPage />} />
    </Routes>
  )
}
