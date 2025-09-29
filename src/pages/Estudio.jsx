import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/study.css";

/* -------------------- Utils -------------------- */
function slugify(s = "") {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// Normaliza "puntosClave": admite array o objeto {seccion: [...]/"..."}
function normalizePuntosClave(value, max = 6) {
  if (!value) return [];
  const out = [];
  const labelize = (k) =>
    k
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/^\w/, (m) => m.toUpperCase())
      .replace("Fechas importantes", "Fechas importantes")
      .replace("Contexto cultural religioso", "Contexto cultural/religioso")
      .replace("Vocabulario enfasis", "Vocabulario (énfasis)")
      .replace("Detalle practico", "Detalle práctico");

  if (Array.isArray(value)) {
    return value.slice(0, max);
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (out.length >= max) break;
      if (Array.isArray(v)) {
        const take = v.slice(0, 2).join(", ");
        out.push(`${labelize(k)}: ${take}`);
      } else if (typeof v === "string") {
        out.push(`${labelize(k)}: ${v}`);
      }
    }
  }
  return out.slice(0, max);
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
function getProfileName() {
  return lsLoad().profile?.name || "";
}
function getAllProgress() {
  return lsLoad().progress || {};
}

/* -------------------- Componente -------------------- */
export default function Estudio() {
  const [material, setMaterial] = useState({ pdfs: [] });
  const [summaries, setSummaries] = useState({ byFile: {} });
  const [error, setError] = useState("");

  // perfil/avance guardado
  const [profileName, setProfileNameState] = useState("");
  const [progress, setProgress] = useState({});

  const navigate = useNavigate();

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
          setProfileNameState(getProfileName());
          setProgress(getAllProgress());
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // Si otra pestaña cambia el progreso o perfil
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setProfileNameState(getProfileName());
        setProgress(getAllProgress());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pdfs = useMemo(() => {
    const arr = Array.isArray(material.pdfs) ? material.pdfs : [];
    return [...arr]
      .sort(
        (a, b) =>
          (a.order ?? 999) - (b.order ?? 999) ||
          (a.title || "").localeCompare(b.title || "", "es")
      )
      .slice(0, 30);
  }, [material.pdfs]);

  const statusLabel = (st = "") =>
    st === "done" ? "✔ Cumplido" : st === "so-so" ? "∼ Más o menos" : st === "nope" ? "✖ No pudo" : "";

  return (
    <div className="study-page">
      <header className="study-header">
        <div>
          <h1 className="study-title">Estudio</h1>
          <p className="study-subtitle">
            Tarjetas por PDF con <strong>objetivo</strong>,{" "}
            <strong>resumen</strong>, <strong>datos esenciales</strong> y{" "}
            <strong>puntos clave</strong> (desde JSON).
          </p>
          {profileName ? (
            <p className="study-subtitle" style={{ marginTop: 6 }}>
              Sesión de <strong>{profileName}</strong>
            </p>
          ) : null}
        </div>
      </header>

      {error && <div className="study-error">{error}</div>}

      {pdfs.map((pdf, idx) => {
        const s = summaries.byFile?.[pdf.file] || {};
        const de = s.datosEsenciales || {};
        const puntos = normalizePuntosClave(s.puntosClave, 6);
        const slug = slugify(pdf.title || pdf.file || `pdf-${idx}`);
        const goDetail = () => navigate(`/estudio/${slug}`, { state: { pdf, idx } });

        const st = progress?.[pdf.file]?.status || "";

        return (
          <section key={`${pdf.file}-${idx}`} className="study-group">
            <div className="group-head">
              <div className="group-index">{String(idx + 1).padStart(2, "0")}</div>
              <div className="group-meta">
                <h2 className="group-title">{pdf.title || pdf.file}</h2>

                {/* Estado guardado (pill opcional) */}
                {st ? (
                  <div className="tags" style={{ marginTop: 6 }}>
                    <span className="tag">{statusLabel(st)}</span>
                  </div>
                ) : null}

                <div className="group-links">
                  <a href={pdf.file} target="_blank" rel="noreferrer" className="group-link">
                    Abrir PDF
                  </a>
                  <button className="group-link as-button" onClick={goDetail}>
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>

            <div className="card-grid">
              {/* Ficha técnica */}
              <article className="card link-card" onClick={goDetail}>
                <h3 className="card-title">Ficha técnica</h3>
                <ul className="meta-list">
                  <li>
                    <span className="k">Autor:</span> <span className="v">{de.autor || "—"}</span>
                  </li>
                  <li>
                    <span className="k">Lugar:</span> <span className="v">{de.lugar || "—"}</span>
                  </li>
                  <li>
                    <span className="k">Fecha:</span> <span className="v">{de.fecha || "—"}</span>
                  </li>
                </ul>
                <div className="tags">
                  {s.temaCentral ? <span className="tag">{s.temaCentral}</span> : null}
                  {de.destinatarios ? (
                    <span className="tag">
                      {String(de.destinatarios).length > 28
                        ? String(de.destinatarios).slice(0, 28) + "…"
                        : String(de.destinatarios)}
                    </span>
                  ) : null}
                </div>
              </article>

              {/* Resumen breve */}
              <article className="card link-card" onClick={goDetail}>
                <h3 className="card-title">Resumen breve</h3>
                <p className="summary">{s.resumenBreve || "Sin resumen aún."}</p>
              </article>

              {/* Puntos clave (normalizados) */}
              <article className="card link-card" onClick={goDetail}>
                <h3 className="card-title">Puntos clave</h3>
                <ul className="bullets">
                  {puntos.length ? puntos.map((kp, i) => <li key={i}>{kp}</li>) : <li>—</li>}
                </ul>
              </article>

              {/* Mnemotecnia si existe */}
              <article className="card link-card" onClick={goDetail}>
                <h3 className="card-title">Mnemotecnia</h3>
                <p className="summary">{s.mnemotecnia || "—"}</p>
              </article>
            </div>
          </section>
        );
      })}
    </div>
  );
}
