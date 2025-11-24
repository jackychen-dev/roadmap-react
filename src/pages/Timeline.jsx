import React, { useState, useMemo } from "react";
import { useTasks } from "../store/TasksContext";
import WorkstreamLabel from "../components/WorkstreamLabel";

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b) - new Date(a)) / ms) + 1;
}

function addDays(dateStr, offset) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// small helper to darken/lighten color
function shadeColor(hex, percent) {
  try {
    const f = hex.slice(1);
    const R = parseInt(f.substring(0,2),16);
    const G = parseInt(f.substring(2,4),16);
    const B = parseInt(f.substring(4,6),16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const Rn = Math.round((t - R) * p) + R;
    const Gn = Math.round((t - G) * p) + G;
    const Bn = Math.round((t - B) * p) + B;
    return `#${((1<<24) + (Rn<<16) + (Gn<<8) + Bn).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
}

export default function Timeline() {
  const { tasks } = useTasks();
  const [zoom, setZoom] = useState(1.0); // 1.0 = default scale

  if (!tasks || tasks.length === 0) return <div className="page-card">No tasks</div>;

  const starts = tasks.map((t) => t.start).filter(Boolean);
  const ends = tasks.map((t) => t.end).filter(Boolean);
  const minStart = starts.reduce((a, b) => (a < b ? a : b), starts[0]);
  const maxEnd = ends.reduce((a, b) => (a > b ? a : b), ends[0]);

  const totalDays = daysBetween(minStart, maxEnd);
  const dates = Array.from({ length: totalDays }).map((_, i) => addDays(minStart, i));

  // pixel width per day depends on zoom
  const pixelPerDay = Math.max(48, Math.round(90 * zoom));

  // compute daily load
  const load = {};
  tasks.forEach((t) => {
    const d = daysBetween(t.start, t.end);
    const perDay = (t.timeToComplete || t.effort || d * 8) / d;
    for (let i = 0; i < d; i++) {
      const day = addDays(t.start, i);
      load[day] = (load[day] || 0) + perDay;
    }
  });

  // color mapping per workstream for nicer visuals
  const palette = ["#4f46e5", "#06b6d4", "#f97316", "#10b981", "#ef4444", "#8b5cf6"];
  const workstreamColors = useMemo(() => {
    const map = {};
    let idx = 0;
    tasks.forEach((t) => {
      const w = t.workstream || "Unassigned";
      if (!map[w]) {
        map[w] = palette[idx % palette.length];
        idx++;
      }
    });
    return map;
  }, [tasks]);

  // grouped by workstream (keeps order from appearance)
  const groupedKeys = Array.from(new Set(tasks.map((t) => t.workstream || "Unassigned")));

  return (
    <div className="page-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Timeline</h2>
        <div className="timeline-controls">
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))}>Zoom +</button>
          <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}>-</button>
          <span className="muted" style={{ marginLeft: 12 }}>Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="timeline-wrap large">
        <div className="timeline-grid" style={{ gridTemplateColumns: `260px repeat(${dates.length}, ${pixelPerDay}px)` }}>
          <div className="timeline-header-spacer" />
          {dates.map((d) => (
            <div key={d} className="timeline-date large">{d}</div>
          ))}

          {groupedKeys.map((ws) => {
            const rows = tasks.filter((t) => (t.workstream || "Unassigned") === ws);
            return rows.map((t) => {
              const offset = daysBetween(minStart, t.start) - 1;
              const span = daysBetween(t.start, t.end);
              const left = offset * pixelPerDay + 6;
              const width = Math.max(28, span * pixelPerDay - 12);
              const color = workstreamColors[t.workstream || "Unassigned"] || "#4f46e5";
              return (
                <React.Fragment key={t.id}>
                  <div className="timeline-task-label big">
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.deliverable || t.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.feature || ''} • {t.assignee || '—'}</div>
                  </div>
                  <div className="timeline-row big">
                    <div
                      className="task-bar"
                      title={`${t.deliverable || t.name} — ${t.start} → ${t.end} — ${t.timeToComplete || t.effort || 0}h`}
                      style={{ left: left + 'px', width: width + 'px', background: `linear-gradient(90deg, ${color}, ${shadeColor(color, -20)})` }}
                    >
                      <div className="task-bar-label">{t.deliverable || t.name}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.entries(workstreamColors).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, background: c, borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
              <WorkstreamLabel workstream={k} size="small" />
            </div>
          ))}
        </div>

        <div className="muted">Total days: {dates.length}</div>
      </div>

      <h3 style={{ marginTop: 18 }}>Resource Load (total hours per day)</h3>
      <div className="resource-load large">
        {dates.map((d) => (
          <div key={d} className="resource-day">
            <div className="date-small">{d}</div>
            <div className="hours">{Math.round((load[d] || 0) * 10) / 10}h</div>
          </div>
        ))}
      </div>
    </div>
  );
}
