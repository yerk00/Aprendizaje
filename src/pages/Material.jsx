import { useEffect, useMemo, useState } from "react";
import "../styles/material.css";

function toEmbedUrl(raw = "") {
  try {
    const u = new URL(raw);
    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    // youtube.com/watch?v=<id>
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      // ya viene embebido o es /embed/<id>
      if (u.pathname.startsWith("/embed/")) return raw;
    }
  } catch {}
  return "";
}

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default function Material() {
  const [data, setData] = useState({ pdfs: [], youtube: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/material.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar material.json"))))
      .then((json) => mounted && setData(json))
      .catch((e) => mounted && setError(e.message));
    return () => { mounted = false; };
  }, []);

  const pdfs = useMemo(() => {
    const arr = Array.isArray(data.pdfs) ? data.pdfs : [];
    // Orden: 'order' luego 'title'. Mostramos TODOS.
    return [...arr].sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) ||
        String(a.title || "").localeCompare(String(b.title || ""), "es")
    );
  }, [data.pdfs]);

  const ytEmbeds = useMemo(() => {
    const arr = toArray(data.youtube);
    return arr
      .map((url) => ({ url, embed: toEmbedUrl(String(url || "")) }))
      .filter((x) => !!x.embed)
      .slice(0, 8); // seguridad
  }, [data.youtube]);

  return (
    <div className="material-page">
      <header className="mat-header">
        <div>
          <h1 className="mat-title">Material por carta</h1>
          <p className="mat-subtitle">
            Materiales de estudio 
          </p>
        </div>
      </header>

      {error && <div className="mat-error">{error}</div>}

      {/* PDFs */}
      <section className="pdf-grid">
        {pdfs.map((doc, idx) => (
          <article key={`${doc.file}-${idx}`} className="pdf-card">
            <div className="pdf-top">
              <div className="pdf-index">{String(idx + 1).padStart(2, "0")}</div>
              <div className="pdf-meta">
                <h3 className="pdf-name" title={doc.title}>{doc.title}</h3>
                <a className="pdf-open" href={doc.file} target="_blank" rel="noreferrer">
                  Abrir en pestaña nueva
                </a>
              </div>
            </div>

            <div className="pdf-preview">
              <iframe
                className="pdf-iframe"
                title={`preview-${idx}`}
                src={`${doc.file}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                loading="lazy"
              />
            </div>
          </article>
        ))}
      </section>

      {/* Videos */}
      <section className="yt-section">
        <div className="yt-head" style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
          <h2 className="yt-title" style={{margin:0}}>Recursos en video</h2>
          {ytEmbeds.length === 0 && (
            <span className="yt-empty">Agrega enlaces en <code>public/material.json</code> (campo <code>youtube</code> puede ser string o array).</span>
          )}
        </div>

        <div className="yt-grid" style={{display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
          {ytEmbeds.map((v, i) => (
            <div key={i} className="yt-card" style={{border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:12, background:"rgba(255,255,255,.03)"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                <div style={{fontWeight:700}}>Video {String(i + 1).padStart(2, "0")}</div>
                <a className="yt-link" href={v.url} target="_blank" rel="noreferrer">Abrir en YouTube</a>
              </div>
              <div className="yt-embed" style={{aspectRatio:"16/9"}}>
                <iframe
                  src={v.embed}
                  title={`YouTube-${i}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  style={{width:"100%", height:"100%", border:0, borderRadius:8}}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
