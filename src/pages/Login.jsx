import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyPassword, startSession } from "../auth";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await verifyPassword(password);
    setLoading(false);

    if (!ok) {
      setError("Contraseña incorrecta.");
      return;
    }
    startSession();
    const to = location.state?.from?.pathname || "/";
    navigate(to, { replace: true });
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-badge">Study</div>
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">
            Ingresa tu contraseña para continuar.
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label className="input-label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="••••••••••••"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="input-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !password}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <div className="login-footnote">
          <span className="dot" />
          Modo local — sin cuentas ni servidor
        </div>
      </div>
    </div>
  );
}
