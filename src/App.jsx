import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Material from "./pages/Material";
import Estudio from "./pages/Estudio";
import EstudioDetalle from "./pages/EstudioDetalle"; // <- nuevo
import Pdf from "./pages/Pdf";
import Preguntas from "./pages/Preguntas";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="material" element={<Material />} />
        <Route path="estudio" element={<Estudio />} />
        <Route path="estudio/:slug" element={<EstudioDetalle />} /> {/* nuevo */}
        <Route path="pdf" element={<Pdf />} />
        <Route path="preguntas" element={<Preguntas />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
