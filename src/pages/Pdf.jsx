import { useEffect, useMemo, useState } from "react";
import "../styles/pdf.css";

const LS_KEY = "pdfMem.progress.v1";

function getTodayIndex() {
  // 1..7 -> 0..6 (Lunes=1 en ISO; usaremos 0=Domingo, 1=Lunes... nos da igual)
  const d = new Date();
  const js = d.getDay(); // 0=Domingo ... 6=Sábado
  // mapeo a 1..7 donde Lunes sea 1: (js+6)%7 +1
  return ((js + 6) % 7); // 0..6 con Lunes=0
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveProgress(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export default function Pdf() {
  const [data, setData] = useState({ days: [], cards: [] });
  const [error, setError] = useState("");
  const [dayIndex, setDayIndex] = useState(getTodayIndex()); // 0..6
  const [progress, setProgress] = useState(loadProgress()); // { status: { [id]: "done"|"again" }, reveal: { [id]: bool } }
  const [practice, setPractice] = useState({ active: false, pointer: 0, seconds: 20 });

  useEffect(() => {
    let alive = true;
    fetch("/pdf-cards.json", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar pdf-cards.json"))))
      .then(json => alive && setData(json))
      .catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => {
    const map = new Map();
    (data.cards || []).forEach(c => map.set(String(c.id), c));
    return map;
  }, [data.cards]);

  const days = useMemo(() => data.days || [], [data.days]);

  const selectedDay = useMemo(() => {
    if (!days.length) return { day: dayIndex + 1, cards: [] };
    return days[Math.min(dayIndex, days.length - 1)] || { day: dayIndex + 1, cards: [] };
  }, [days, dayIndex]);

  const cardsOfDay = useMemo(() => {
    return (selectedDay.cards || [])
      .map(id => byId.get(String(id)))
      .filter(Boolean);
  }, [selectedDay, byId]);

  // progress helpers
  const status = progress.status || {};
  const reveal = progress.reveal || {};
  const doneCount = cardsOfDay.filter(c => status[c.id] === "done").length;
  const percent = cardsOfDay.length ? Math.round((doneCount / cardsOfDay.length) * 100) : 0;

  function toggleReveal(id) {
    const next = { ...progress, reveal: { ...reveal, [id]: !reveal[id] } };
    setProgress(next); saveProgress(next);
  }
  function mark(id, value) {
    const next = { ...progress, status: { ...status, [id]: value } };
    setProgress(next); saveProgress(next);
  }
  function resetDay() {
    const next = { ...progress };
    (selectedDay.cards || []).forEach(id => {
      if (next.status) delete next.status[id];
      if (next.reveal) delete next.reveal[id];
    });
    setProgress(next); saveProgress(next);
  }

  // practice mode
  useEffect(() => {
    if (!practice.active) return;
    if (!cardsOfDay.length) return;

    const ids = cardsOfDay.map(c => String(c.id));
    // apuntar al primer no "done"
    let p = practice.pointer;
    if (p >= ids.length) p = 0;

    const timer = setInterval(() => {
      setPractice(prev => {
        if (!prev.active) return prev;
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        // tiempo agotado: pasar a siguiente
        const nextPtr = (prev.pointer + 1) % ids.length;
        return { ...prev, pointer: nextPtr, seconds: 20 };
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice.active, practice.pointer, cardsOfDay.length]);

  function startPractice() {
    setPractice({ active: true, pointer: 0, seconds: 20 });
  }
  function stopPractice() {
    setPractice({ active: false, pointer: 0, seconds: 20 });
  }
  function practiceMark(val) {
    const ids = cardsOfDay.map(c => String(c.id));
    const id = ids[practice.pointer];
    if (id) {
      mark(id, val);
      // avanzar
      const nextPtr = (practice.pointer + 1) % ids.length;
      setPractice(p => ({ ...p, pointer: nextPtr, seconds: 20 }));
    }
  }

  return (
    <div className="pdfmem-page">
      <header className="pdfmem-header">
        <div>
          <h1 className="pdfmem-title">Memorización por día</h1>
          <p className="pdfmem-subtitle">
            42 cards de 3 líneas, organizadas en 7 días (6 por día). Marca tu avance y practica con un temporizador.
          </p>
        </div>
      </header>

      {error && <div className="pdfmem-error">{error}</div>}

      <section className="day-switch">
        <div className="day-pills">
          {(days.length ? days : Array.from({ length: 7 }, (_, i) => ({ day: i + 1 }))).map((d, i) => {
            const is = i === dayIndex;
            return (
              <button
                key={d.day || i}
                className={`pill ${is ? "active" : ""}`}
                onClick={() => setDayIndex(i)}
              >
                Día {d.day || i + 1}
              </button>
            );
          })}
        </div>

        <div className="day-stats">
          <div className="progressbar">
            <div className="fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="stats-text">
            {doneCount}/{cardsOfDay.length} memorizadas · {percent}%
          </div>

          <div className="day-actions">
            {!practice.active ? (
              <button className="btn primary" onClick={startPractice}>Modo práctica</button>
            ) : (
              <button className="btn" onClick={stopPractice}>Detener práctica</button>
            )}
            <button className="btn subtle" onClick={resetDay}>Reiniciar día</button>
          </div>
        </div>
      </section>

      {practice.active && cardsOfDay.length > 0 && (
        <section className="practice">
          {(() => {
            const c = cardsOfDay[practice.pointer];
            return (
              <div className="practice-card">
                <div className="pc-head">
                  <span className="pc-index">#{String(c.id).padStart(2, "0")}</span>
                  <span className="pc-title">{c.title}</span>
                  <span className="pc-timer">{practice.seconds}s</span>
                </div>
                <div className="pc-body">
                  {c.lines.map((ln, i) => <p key={i}>{ln}</p>)}
                </div>
                <div className="pc-actions">
                  <button className="btn ok" onClick={() => practiceMark("done")}>Memorizado</button>
                  <button className="btn warn" onClick={() => practiceMark("again")}>Repetir</button>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      <section className="cards-grid">
        {cardsOfDay.map((c) => {
          const s = status[String(c.id)];
          const show = !!reveal[String(c.id)];
          return (
            <article key={c.id} className={`mcard ${s || ""}`}>
              <div className="mhead">
                <div className="idx">#{String(c.id).padStart(2, "0")}</div>
                <h3 className="mtitle">{c.title}</h3>
              </div>

              <div className={`mbody ${show ? "reveal" : ""}`}>
                {c.lines.map((ln, i) => (
                  <p key={i} className="line">{ln}</p>
                ))}
                {!show && <div className="blur" />}
              </div>

              <div className="mactions">
                <button className="btn ghost" onClick={() => toggleReveal(String(c.id))}>
                  {show ? "Ocultar" : "Revelar"}
                </button>
                <div className="right">
                  <button className={`btn ok ${s === "done" ? "active" : ""}`} onClick={() => mark(String(c.id), "done")}>Cumplido</button>
                  <button className={`btn warn ${s === "again" ? "active" : ""}`} onClick={() => mark(String(c.id), "again")}>Repasar</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
