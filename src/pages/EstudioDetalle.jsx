import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/study-detail.css";

/* -------------------- Utils -------------------- */
function slugify(s = "") {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// Etiqueta legible para claves de objetos
function labelize(k = "") {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/^\w/, (m) => m.toUpperCase())
    .replace("Contexto cultural religioso", "Contexto cultural/religioso")
    .replace("Vocabulario enfasis", "Vocabulario (énfasis)")
    .replace("Detalle practico", "Detalle práctico")
    .replace("Fechas importantes", "Fechas importantes");
}

/* -------- Persistencia local sin BD (localStorage) -------- */
const STORAGE_KEY = "study.v1";

function lsLoad() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function lsSave(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
function setProfileName(name) {
  const s = lsLoad();
  s.profile = { ...(s.profile || {}), name };
  lsSave(s);
}
function getProfileName() {
  return lsLoad().profile?.name || "";
}
function setPdfStatus(file, status) {
  if (!file) return;
  const s = lsLoad();
  s.progress = { ...(s.progress || {}), [file]: { status, ts: Date.now() } };
  lsSave(s);
}
function getPdfStatus(file) {
  return lsLoad().progress?.[file]?.status || "";
}

/* -------------------- Componente -------------------- */
export default function EstudioDetalle() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [material, setMaterial] = useState({ pdfs: [] });
  const [summaries, setSummaries] = useState({ byFile: {} });
  const [error, setError] = useState("");

  const [student, setStudent] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/material.json", { cache: "no-store" }),
      fetch("/summaries.json", { cache: "no-store" })
    ])
      .then(async ([m, s]) => {
        if (!m.ok) throw new Error("No se pudo cargar material.json");
        if (!s.ok) throw new Error("No se pudo cargar summaries.json");
        const mj = await m.json();
        const sj = await s.json();
        if (alive) {
          setMaterial(mj);
          setSummaries(sj);
          // nombre guardado (perfil)
          setStudent(getProfileName());
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const current = useMemo(() => {
    const arr = Array.isArray(material.pdfs) ? material.pdfs : [];
    if (location.state?.pdf) {
      const idx = location.state?.idx ?? 0;
      return { pdf: location.state.pdf, idx };
    }
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const slug = slugify(p.title || p.file || `pdf-${i}`);
      if (slug === params.slug) return { pdf: p, idx: i };
    }
    return null;
  }, [material.pdfs, location.state, params.slug]);

  // Al conocer el PDF actual, cargar estado guardado
  useEffect(() => {
    if (!current?.pdf?.file) return;
    const st = getPdfStatus(current.pdf.file);
    if (st) setStatus(st);
  }, [current]);

  if (error) return <div className="sd-error">{error}</div>;
  if (!current) {
    return (
      <div className="sd-empty">
        <p>No se encontró el material solicitado.</p>
        <button className="sd-back" onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  const { pdf } = current;
  const s = summaries.byFile?.[pdf.file] || {};
  const de = s.datosEsenciales || {};
  const bosquejo = Array.isArray(s.bosquejo) ? s.bosquejo : [];

  // Renderiza "puntosClave" aceptando array u objeto
  const renderPuntosClave = (pk) => {
    if (!pk) return <div className="sd-empty">—</div>;
    if (Array.isArray(pk)) {
      return (
        <ul className="sd-list">
          {pk.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    if (typeof pk === "object") {
      const entries = Object.entries(pk);
      if (!entries.length) return <div className="sd-empty">—</div>;
      return (
        <div className="sd-grid-2">
          {entries.map(([k, v], i) => (
            <article key={i} className="sd-card">
              <h3 className="sd-h3">{labelize(k)}</h3>
              {Array.isArray(v) ? (
                <ul className="sd-list">
                  {v.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p>{String(v)}</p>
              )}
            </article>
          ))}
        </div>
      );
    }
    return <div className="sd-empty">—</div>;
  };

  return (
    <div className="sd-page">
      <header className="sd-hero">
        <div className="sd-hero-meta">
          <div className="sd-badge">Estudio • Detalle</div>
          <h1 className="sd-title">{pdf.title || pdf.file}</h1>
          <p className="sd-subtitle">
            Autor: <strong>{de.autor || "—"}</strong>
            {" · "}Lugar: {de.lugar || "—"}
            {" · "}Fecha: {de.fecha || "—"}
            {s.temaCentral ? <>{" · "}Tema: <strong>{s.temaCentral}</strong></> : null}
          </p>
        </div>
        <div className="sd-actions">
          <a className="sd-link" href={pdf.file} target="_blank" rel="noreferrer">
            Abrir PDF
          </a>
          <button className="sd-link" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </header>

      {/* 1. Objetivo de estudio + 2. Resumen breve */}
      <section className="sd-section">
        <div className="sd-grid-2">
          <article className="sd-card">
            <h2 className="sd-h2">1. Objetivo de estudio</h2>
            <p>{s.objetivoEstudio || "Sin objetivo de estudio en summaries.json."}</p>
          </article>
          <article className="sd-card">
            <h2 className="sd-h2">2. Resumen breve</h2>
            <p>{s.resumenBreve || "Sin resumen breve en summaries.json."}</p>
          </article>
        </div>
      </section>

      {/* 3. Datos esenciales */}
      <section className="sd-section">
        <h2 className="sd-h2">3. Datos esenciales</h2>
        <ul className="sd-list">
          <li>
            <strong>Autor:</strong> {de.autor || "—"}
          </li>
          <li>
            <strong>Lugar:</strong> {de.lugar || "—"}
          </li>
          <li>
            <strong>Fecha:</strong> {de.fecha || "—"}
          </li>
          <li>
            <strong>Destinatarios:</strong> {de.destinatarios || "—"}
          </li>
          <li>
            <strong>Contexto:</strong> {de.contexto || "—"}
          </li>
        </ul>
      </section>

      {/* 4. Tema Central */}
      <section className="sd-section">
        <h2 className="sd-h2">4. Tema central</h2>
        <p>{s.temaCentral || "—"}</p>
      </section>

      {/* 5. Bosquejo */}
      <section className="sd-section">
        <h2 className="sd-h2">5. Bosquejo</h2>
        {bosquejo.length > 0 ? (
          <ol className="sd-list">
            {bosquejo.map((t, i) => {
              if (typeof t !== "string") return <li key={i}>{String(t)}</li>;
              const parts = t.split(":");
              if (parts.length > 1) {
                const head = parts.shift();
                const tail = parts.join(":").trim();
                return (
                  <li key={i}>
                    <strong>{head}:</strong> {tail}
                  </li>
                );
              }
              return <li key={i}>{t}</li>;
            })}
          </ol>
        ) : (
          <div className="sd-empty">Sin bosquejo en summaries.json.</div>
        )}
      </section>

      {/* 6. Puntos clave (array u objeto con secciones) */}
      <section className="sd-section">
        <h2 className="sd-h2">6. Puntos clave</h2>
        {renderPuntosClave(s.puntosClave)}
      </section>

      {/* 7. Mnemotecnia (si existe) */}
      {s.mnemotecnia ? (
        <section className="sd-section">
          <h2 className="sd-h2">7. Mnemotecnia</h2>
          <p>{s.mnemotecnia}</p>
        </section>
      ) : null}

      {/* Registro de sesión */}
      <section className="sd-section sd-register">
        <h2 className="sd-h2">Registro de sesión</h2>
        <div className="sd-form">
          <label className="sd-label">Tu nombre</label>
          <input
            className="sd-input"
            placeholder="Escribe tu nombre"
            value={student}
            onChange={(e) => {
              const v = e.target.value;
              setStudent(v);
              setProfileName(v); // persistir nombre
            }}
          />

          <div className="sd-checks">
            {[
              { key: "done", label: "Cumplido ✔" },
              { key: "so-so", label: "Más o menos ~" },
              { key: "nope", label: "No pudo ✖" }
            ].map((opt) => (
              <button
                key={opt.key}
                className={`sd-check ${status === opt.key ? "active" : ""}`}
                onClick={() => {
                  setStatus(opt.key);
                  setPdfStatus(pdf.file, opt.key); // persistir estado por PDF
                }}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="sd-note">
            {student ? (
              <>
                Registrado para <strong>{student}</strong> — estado:{" "}
                <strong>
                  {({ done: "Cumplido ✔", "so-so": "Más o menos ~", nope: "No pudo ✖" }[status] ||
                    "sin marcar")}
                </strong>
                .
              </>
            ) : (
              <>Escribe tu nombre y marca el estado de la sesión.</>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
