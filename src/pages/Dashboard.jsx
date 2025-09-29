import { useEffect, useMemo, useState } from "react";
import "../styles/dashboard.css";

// === helpers ===
const LS_MEM_KEY = "pdfMem.progress.v1";
const QUIZ_KEYS = ["preguntas.stats.v1", "quiz.stats.v1"]; // intentamos ambos por si varía el nombre

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function getTodayIndex(totalDays = 5) {
  // Lunes=0 ... Domingo=6  → mapea a 0..(totalDays-1)
  const js = new Date().getDay(); // 0..6
  const mondayBased = (js + 6) % 7;
  return mondayBased % totalDays;
}

function loadLocalJSON(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function loadQuizStats() {
  for (const k of QUIZ_KEYS) {
    const val = loadLocalJSON(k, null);
    if (val && typeof val === "object") return val;
  }
  // fallback
  return { answered: 0, correct: 0, streak: 0, lastAt: null };
}

export default function Dashboard() {
  const [material, setMaterial] = useState({ pdfs: [], youtube: [] });
  const [memData, setMemData] = useState({ days: [], cards: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/material.json", { cache: "no-store" }),
      fetch("/pdf-cards.json", { cache: "no-store" }).catch(() => null),
    ])
      .then(async ([m, p]) => {
        if (!m.ok) throw new Error("No se pudo cargar material.json");
        const mj = await m.json();
        const pj = p && p.ok ? await p.json() : { days: [], cards: [] };
        if (alive) {
          setMaterial(mj || { pdfs: [], youtube: [] });
          setMemData(pj || { days: [], cards: [] });
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // PDFs
  const pdfs = useMemo(() => {
    const arr = Array.isArray(material.pdfs) ? material.pdfs : [];
    return [...arr].sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) ||
        String(a.title || "").localeCompare(String(b.title || ""), "es")
    );
  }, [material.pdfs]);

  // Notas
  const totalNotes = useMemo(
    () =>
      (pdfs || []).reduce((acc, p) => acc + (Array.isArray(p.notes) ? p.notes.length : 0), 0),
    [pdfs]
  );

  // Videos
  const videos = useMemo(() => toArray(material.youtube).filter(Boolean), [material.youtube]);

  // Memorización (hoy)
  const byId = useMemo(() => {
    const map = new Map();
    (memData.cards || []).forEach((c) => map.set(String(c.id), c));
    return map;
  }, [memData.cards]);

  const todayIndex = getTodayIndex(5);
  const selectedDay = useMemo(() => {
    const days = memData.days || [];
    return days.length ? days[Math.min(todayIndex, days.length - 1)] : { day: todayIndex + 1, cards: [] };
  }, [memData.days, todayIndex]);

  const todayCards = useMemo(
    () => (selectedDay.cards || []).map((id) => byId.get(String(id))).filter(Boolean),
    [selectedDay, byId]
  );

  const memProgress = useMemo(() => {
    const state = loadLocalJSON(LS_MEM_KEY, { status: {}, reveal: {} });
    const status = state.status || {};
    const total = todayCards.length;
    const done = todayCards.filter((c) => status[String(c.id)] === "done").length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const nextThree = todayCards.filter((c) => status[String(c.id)] !== "done").slice(0, 3);
    return { total, done, percent, nextThree };
  }, [todayCards]);

  // Preguntas
  const quiz = useMemo(() => {
    const q = loadQuizStats();
    const answered = Number(q.answered || 0);
    const correct = Number(q.correct || 0);
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const streak = Number(q.streak || 0);
    return { answered, correct, accuracy, streak, lastAt: q.lastAt || null };
  }, []);

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">
            Resumen rápido: material, memorización de hoy y estado de preguntas.
          </p>
        </div>
      </header>

      {error && <div className="dash-error">{error}</div>}

      {/* MÉTRICAS */}
      <section className="dash-metrics">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-k">PDFs</span>
            <span className="metric-v">{pdfs.length}</span>
          </div>
          <div className="metric-sub">Total de documentos</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-k">Notas</span>
            <span className="metric-v">{totalNotes}</span>
          </div>
          <div className="metric-sub">Resumenes/Notitas asociadas</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-k">Videos</span>
            <span className="metric-v">{videos.length}</span>
          </div>
          <div className="metric-sub">Enlaces de YouTube</div>
        </div>

        <div className="metric-card progress">
          <div className="progressbar">
            <div className="fill" style={{ width: `${memProgress.percent}%` }} />
          </div>
          <div className="metric-bottom">
            <div className="metric-k">Memorización (hoy)</div>
            <div className="metric-v">{memProgress.done}/{memProgress.total} · {memProgress.percent}%</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-k">Preguntas</span>
            <span className="metric-v">{quiz.answered}</span>
          </div>
          <div className="metric-sub">Correctas: {quiz.correct} · Acierto {quiz.accuracy}% · Racha {quiz.streak}</div>
        </div>
      </section>

      {/* HOY: SIGUIENTES A MEMORIZAR */}
      <section className="dash-section">
        <div className="sec-head">
          <h2 className="sec-title">Hoy (Día {selectedDay.day || todayIndex + 1}) · Próximas cards</h2>
          <a className="sec-link" href="/pdf">Ir a Memorización</a>
        </div>
        <div className="next-grid">
          {memProgress.nextThree.length ? (
            memProgress.nextThree.map((c) => (
              <article className="next-card" key={c.id}>
                <div className="next-top">
                  <div className="idx">#{String(c.id).padStart(2, "0")}</div>
                  <div className="title">{c.title}</div>
                </div>
                <div className="next-body">
                  {(c.lines || []).slice(0, 3).map((ln, i) => (
                    <p key={i} className="ln">{ln}</p>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="empty">No hay pendientes para hoy. ¡Buen trabajo!</div>
          )}
        </div>
      </section>

      {/* MATERIAL: LISTA RÁPIDA */}
      <section className="dash-section">
        <div className="sec-head">
          <h2 className="sec-title">Material</h2>
          <a className="sec-link" href="/material">Ver todo</a>
        </div>

        <div className="mat-list">
          {pdfs.slice(0, 6).map((p, i) => (
            <article key={`${p.file}-${i}`} className="mat-item">
              <div className="mat-left">
                <div className="badge">{String(i + 1).padStart(2, "0")}</div>
                <div className="meta">
                  <div className="name" title={p.title}>{p.title}</div>
                  <div className="sub">
                    <a href={p.file} target="_blank" rel="noreferrer">Abrir PDF</a>
                    {Array.isArray(p.notes) && p.notes.length ? (
                      <span className="dot">•</span>
                    ) : null}
                    {Array.isArray(p.notes) && p.notes.length ? (
                      <span>{p.notes.length} nota(s)</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {Array.isArray(p.notes) && p.notes.length ? (
                <div className="mat-notes">
                  {(p.notes || []).slice(0, 2).map((n) => (
                    <div className="note-chip" key={n.id} title={n.summary}>
                      {n.title}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mat-notes muted">Sin notas</div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ATAJOS */}
      <section className="dash-section">
        <div className="sec-head">
          <h2 className="sec-title">Atajos</h2>
        </div>
        <div className="quick-grid">
          <a className="qk" href="/estudio">
            <span className="qk-title">Estudio</span>
            <span className="qk-sub">Objetivo, datos y bosquejo</span>
          </a>
          <a className="qk" href="/pdf">
            <span className="qk-title">Memorización</span>
            <span className="qk-sub">42 cards en 5 días</span>
          </a>
          <a className="qk" href="/material">
            <span className="qk-title">Material</span>
            <span className="qk-sub">PDFs y videos</span>
          </a>
          <a className="qk" href="/preguntas">
            <span className="qk-title">Preguntas</span>
            <span className="qk-sub">Práctica cronometrada</span>
          </a>
        </div>
      </section>
    </div>
  );
}
