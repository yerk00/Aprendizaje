import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/layout.css";

export default function SidebarLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(v => !v);
  const close = () => setOpen(false);

  // Cerrar al navegar y con tecla ESC
  useEffect(() => { close(); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    try {
      ["auth","auth.login","auth.loggedIn","loggedIn","isAuth","token","authToken"].forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}
    navigate("/login", { replace: true });
  };

  return (
    <div className={`app-shell ${open ? "nav-open" : ""}`}>
      {/* Sidebar (desktop y off-canvas en mobile) */}
      <aside id="app-sidebar" className={`sidebar ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="brand-wrap">
          <img src="/images/logo.jpg" alt="Logo" className="brand-logo" />

        </div>

        <nav className="nav" aria-label="Navegación principal">
          <NavLink to="/" end className="navlink"><span>Dashboard</span></NavLink>
          <NavLink to="/material" className="navlink"><span>Material</span></NavLink>
          <NavLink to="/estudio" className="navlink"><span>Estudio</span></NavLink>
          <NavLink to="/pdf" className="navlink"><span>Memorizacion</span></NavLink>
          <NavLink to="/preguntas" className="navlink"><span>Preguntas</span></NavLink>
        </nav>

        <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Cerrar sesión">
          Cerrar sesión
        </button>
      </aside>

      {/* Scrim */}
      <button
        className={`scrim ${open ? "show" : ""}`}
        onClick={close}
        aria-label="Cerrar menú"
        aria-hidden={!open}
      />

      {/* Topbar (solo visible en móvil) */}
      <div className="topbar">
        <button
          className={`hamburger ${open ? "is-open" : ""}`}
          onClick={toggle}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-controls="app-sidebar"
          aria-expanded={open}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <img src="/images/logo.jpg" alt="Logo" className="brand-logo" />

      </div>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
