import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
// ── Phase-specific exercises ──────────────────────────────────────────────────
const EXERCISES_BY_STAGE = {
  A: [
    { name: "Wall Squats",          cue: "Back flat, knees at 90°, breathe steady — isometric hold" },
    { name: "Spanish Squat",        cue: "Band behind knees, torso upright, hold the tension" },
    { name: "Leg Extensions",       cue: "Heavy slow resistance, 3–5s down, full control" },
    { name: "Quad Sets",            cue: "Towel under knee, press down for 5s, wake up the quad" },
    { name: "Calf Raises",          cue: "Slow and controlled, full range of motion" },
  ],
  B: [
    { name: "Wall Squats",          cue: "Increase hold duration or add light load this phase" },
    { name: "Split Squats",         cue: "95% weight on front leg, slow descent over 3–5s" },
    { name: "Spanish Squat",        cue: "Increase band tension — aim for 70% max effort" },
    { name: "Leg Extensions",       cue: "Heavy slow resistance, 3–5s eccentric, no momentum" },
    { name: "Eccentric Heel Drops", cue: "Lower slowly over 3 seconds, control the descent" },
  ],
  C: [
    { name: "Bulgarian Split Squat",cue: "Rear foot elevated, 95% load on front leg, 3s down" },
    { name: "Leg Press Hold",       cue: "Press through heel, engage quad — 45s isometric" },
    { name: "Spanish Squat",        cue: "Full 45s holds at 70%+ MVC — push the load" },
    { name: "Eccentric Heel Drops", cue: "Single leg, 3s down, focus on control not speed" },
    { name: "Leg Extensions HSR",   cue: "Heavy slow resistance — 3s up, 3s down, no bounce" },
  ],
  M: [
    { name: "Bulgarian Split Squat",cue: "Progressive load — increase weight each session" },
    { name: "Single-Leg Press",     cue: "Full range, slow eccentric, bulletproofing the tendon" },
    { name: "Spanish Squat",        cue: "Max load you can hold for 45s — maintenance phase" },
    { name: "Eccentric Heel Drops", cue: "Add weight if bodyweight feels easy" },
    { name: "Leg Extensions HSR",   cue: "Working sets — push to near failure on last set" },
  ],
};

// ── Warm-up stretches ─────────────────────────────────────────────────────────
const WARMUP_STRETCHES = [
  { name: "Hamstring Stretch",  cue: "Seated or standing toe reach — hold 30s", hold: 30, emoji: "🦵" },
  { name: "Quad Stretch",       cue: "Stand, pull foot to glute — hold 30s each side", hold: 30, emoji: "🦵" },
  { name: "Calf Stretch",       cue: "Lean against wall, heel flat on ground — 30s", hold: 30, emoji: "🦶" },
  { name: "Quad Sets",          cue: "Lie back, towel under knee, press down — 5s holds × 10", hold: 30, emoji: "🏋️" },
];

const STAGE_CRITERIA = {
  A: { minWeeks: 4, maxAvgPain: 3, nextStage: "B" },
  B: { minWeeks: 4, maxAvgPain: 3, nextStage: "C" },
  C: { minWeeks: 4, maxAvgPain: 3, nextStage: "M" },
  M: { minWeeks: 999, maxAvgPain: 10, nextStage: null },
};

const DEFAULT_SETTINGS = { holdSecs: 45, restSecs: 60, totalSets: 4 };

const THEMES = {
  dark: {
    bg: "#0a0a0a", card: "#141414", cardBorder: "#222",
    green: "#B2FF00", blue: "#3b82f6", yellow: "#eab308",
    red: "#ef4444", orange: "#f97316", purple: "#a855f7",
    textPrimary: "#f2f2f2", textSecondary: "#777", textMuted: "#3a3a3a",
    navBg: "#0d0d0d", inputBg: "#111", rowBorder: "#1a1a1a",
    timerTrack: "#1a1a1a", barEmpty: "#1e1e1e", barBorder: "#2a2a2a",
    sliderThumbBorder: "#0a0a0a",
    // Extended tokens
    surface:    "#111",       // slightly elevated surface inside cards
    surfaceAlt: "#0e0e0e",    // deeper inset areas
    surfaceBorder: "#222",
    rowAlt:     "#1a1a1a",    // subtle row separators
    badgeBg:    "#1a1a1a",    // number badge backgrounds
    badgeText:  "#555",
    mutedText:  "#555",
    dimText:    "#444",
    checkInRow: "#0c0c0c",
    stageBadgeBg: "#1a1a1a",
    streakBg:   "#0f1a00",
    streakText: "#f2f2f2",
  },
  light: {
    bg: "#f0f0f0", card: "#ffffff", cardBorder: "#e0e0e0",
    green: "#5a9200", blue: "#2563eb", yellow: "#ca8a04",
    red: "#dc2626", orange: "#ea580c", purple: "#9333ea",
    textPrimary: "#0a0a0a", textSecondary: "#666", textMuted: "#bbb",
    navBg: "#ffffff", inputBg: "#f5f5f5", rowBorder: "#eeeeee",
    timerTrack: "#e0e0e0", barEmpty: "#e8e8e8", barBorder: "#d5d5d5",
    sliderThumbBorder: "#f0f0f0",
    // Extended tokens
    surface:    "#f5f5f5",
    surfaceAlt: "#efefef",
    surfaceBorder: "#e0e0e0",
    rowAlt:     "#eeeeee",
    badgeBg:    "#e8e8e8",
    badgeText:  "#666",
    mutedText:  "#888",
    dimText:    "#999",
    checkInRow: "#f0f0f0",
    stageBadgeBg: "#e8e8e8",
    streakBg:   "#f0f7e0",
    streakText: "#1a2e00",
  },
};

// Theme context — lets any component read colors without prop drilling
const ThemeContext = React.createContext(THEMES.dark);
const useTheme = () => React.useContext(ThemeContext);

const makeStyles = (c) => `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Geist:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${c.bg}; font-family: 'Geist', sans-serif; color: ${c.textPrimary}; transition: background 0.3s ease, color 0.3s ease; }
  :root { color-scheme: ${c.bg === "#f0f0f0" ? "light" : "dark"}; }
  button { font-family: 'Outfit', sans-serif !important; }
  .outfit { font-family: 'Outfit', sans-serif; }
  input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
  input[type=range]::-webkit-slider-track { height: 4px; background: ${c.cardBorder}; border-radius: 2px; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%; background: ${c.blue}; margin-top: -7px; }
  textarea { font-family: 'Geist', sans-serif; resize: none; outline: none; }
  .scroll-area { overflow-y: auto; scrollbar-width: none; }
  .scroll-area::-webkit-scrollbar { display: none; }
  @keyframes fadeIn       { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeInFast   { from { opacity:0; transform:translateY(4px);  } to { opacity:1; transform:translateY(0); } }
  @keyframes slideInRight { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
  @keyframes pulse        { 0%,100% { box-shadow:0 0 0 0 rgba(178,255,0,0.35); } 50% { box-shadow:0 0 0 14px rgba(178,255,0,0); } }
  @keyframes completePop  { 0% { transform:scale(0.75); opacity:0; } 65% { transform:scale(1.06); } 100% { transform:scale(1); opacity:1; } }
  @keyframes slideUp      { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fade-in        { animation: fadeIn 0.35s ease forwards; }
  .fade-in-fast   { animation: fadeInFast 0.2s ease forwards; }
  .slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
  .pulse-green    { animation: pulse 2s infinite; }
  .complete-pop   { animation: completePop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .slide-up       { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
  .card { background:${c.card}; border:1px solid ${c.cardBorder}; border-radius:18px; padding:20px; margin-bottom:12px; transition: background 0.3s ease, border-color 0.3s ease; }
  .mono { font-family:'JetBrains Mono',monospace; }
  h1,h2,h3 { font-family:'Outfit',sans-serif; }
  .btn-primary { background:${c.green}; color:#000; border:none; border-radius:14px; padding:15px 36px; font-size:15px; font-weight:700; cursor:pointer; letter-spacing:0.3px; display:inline-flex; align-items:center; gap:10px; transition:opacity 0.15s; }
  .btn-primary:active { opacity:0.8; }
  .btn-icon { background:${c.card}; border:1px solid ${c.cardBorder}; border-radius:12px; padding:12px 14px; cursor:pointer; display:inline-flex; align-items:center; }
`;

// Keep a module-level colors alias that components can use as fallback
// (overridden by useTheme() inside components)
let colors = THEMES.dark;

// ── Sound / Haptic helpers ────────────────────────────────────────────────────
function playTone(freq = 880, duration = 0.15, type = "sine") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
  } catch {}
}
function vibrate(pattern = [100]) { try { navigator.vibrate?.(pattern); } catch {} }
function cueHoldEnd()  { playTone(660, 0.12); playTone(880, 0.18); vibrate([80, 40, 80]); }
function cueRestEnd()  { playTone(440, 0.1);  playTone(660, 0.18); vibrate([60]); }

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(painLog, sessionHistory) {
  const painRows = painLog.map((e, i) =>
    `Pain Log,${i + 1},${e.date},${e.value},${e.label},""`
  );
  const sessionRows = sessionHistory.map(s =>
    `Session,${s.id},${s.date},${s.exercises},${s.totalSets},${s.intensity}%,"${s.notes || ""}"`
  );
  const csv = [
    "Type,#,Date,Value/Exercises,Sets/Label,Intensity,Notes",
    ...painRows, ...sessionRows
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "rebuild-your-knee.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const s = { stroke: color, fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const f = { fill: color, stroke: "none" };
  const map = {
    today:     <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    trends:    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    protocols: <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    profile:   <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    check:     <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    bolt:      <svg width={size} height={size} viewBox="0 0 24 24" {...f}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    chevron:   <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="6 9 12 15 18 9"/></svg>,
    settings:  <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    fire:      <svg width={size} height={size} viewBox="0 0 24 24" {...f}><path d="M12 2C6.5 2 4 6 4 9c0 3 2 5 2 5s-1-2 0-4c1-2 3-2 3-2s-1 3 1 5c2 2 3 4 3 4s4-3 4-7c0-4-5-8-5-8z"/></svg>,
    knee:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M9 2v8l-3 4v8M15 2v8l3 4v8M9 10c1 2 5 2 6 0"/></svg>,
    nutrition: <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>,
    workout:   <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M6 4v16M18 4v16M6 12h12M2 8h4M18 8h4M2 16h4M18 16h4"/></svg>,
    pain:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    trophy:    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H17l-1 7H8L7 4z"/><path d="M7 4C7 4 4 4 4 7s3 3 3 3"/><path d="M17 4C17 4 20 4 20 7s-3 3-3 3"/></svg>,
    play:      <svg width={size} height={size} viewBox="0 0 24 24" {...f}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pause:     <svg width={size} height={size} viewBox="0 0 24 24" {...f}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    reset:     <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
    x:         <svg width={size} height={size} viewBox="0 0 24 24" {...s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    arrow:     <svg width={size} height={size} viewBox="0 0 24 24" {...s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    moon:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    note:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    download:  <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    up:        <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="18 15 12 9 6 15"/></svg>,
    history:   <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/><polyline points="12 7 12 12 15 15"/></svg>,
    warn:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    star:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    sun:       <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    bell:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    lock:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    exit:      <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };
  return map[name] || null;
};

// ── Custom Pain Slider ────────────────────────────────────────────────────────
function PainSlider({ value, onChange }) {
  const c = useTheme();
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const getVal = (e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.round(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * 20) / 2;
  };
  const onMove = useCallback((e) => { if (dragging.current) { e.preventDefault(); onChange(getVal(e)); } }, []);
  const onUp   = useCallback(() => { dragging.current = false; }, []);
  useEffect(() => {
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false }); window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [onMove, onUp]);
  const pct = (value / 10) * 100;
  const thumbColor = (() => {
    const stops = [[0,[178,255,0]],[0.2,[212,255,0]],[0.4,[255,235,59]],[0.6,[255,152,0]],[0.8,[255,61,0]],[1,[233,30,140]]];
    const t = value / 10;
    let lo = stops[0], hi = stops[stops.length-1];
    for (let i = 0; i < stops.length-1; i++) { if (t >= stops[i][0] && t <= stops[i+1][0]) { lo=stops[i]; hi=stops[i+1]; break; } }
    const f = lo[0]===hi[0] ? 0 : (t-lo[0])/(hi[0]-lo[0]);
    return `rgb(${Math.round(lo[1][0]+(hi[1][0]-lo[1][0])*f)},${Math.round(lo[1][1]+(hi[1][1]-lo[1][1])*f)},${Math.round(lo[1][2]+(hi[1][2]-lo[1][2])*f)})`;
  })();
  return (
    <div style={{ padding: "10px 0 6px", userSelect: "none" }}>
      <div ref={trackRef} style={{ position:"relative", height:36, display:"flex", alignItems:"center", cursor:"pointer" }}
        onMouseDown={e => { dragging.current=true; onChange(getVal(e)); }}
        onTouchStart={e => { dragging.current=true; onChange(getVal(e)); }}>
        <div style={{ width:"100%", height:10, borderRadius:5, background:"linear-gradient(to right,#B2FF00 0%,#d4ff00 15%,#ffeb3b 40%,#ff9800 60%,#ff3d00 80%,#e91e8c 100%)", boxShadow:"0 0 12px rgba(0,0,0,0.4)" }} />
        <div style={{ position:"absolute", left:`calc(${pct}% - 14px)`, width:28, height:28, borderRadius:"50%", background:"#fff", border:`3px solid ${c.sliderThumbBorder}`, boxShadow:`0 0 0 2px ${thumbColor},0 4px 12px rgba(0,0,0,0.7)`, transition:"box-shadow 0.15s ease", cursor:"grab", zIndex:2 }} />
      </div>
    </div>
  );
}

// ── Circular Timer ────────────────────────────────────────────────────────────
function CircularTimer({ seconds, total, label, color }) {
  const c = useTheme();
  const col = color || c.green;
  const r = 68, circ = 2 * Math.PI * r;
  const offset = circ * (1 - seconds / total);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <div style={{ display:"flex", justifyContent:"center", margin:"10px 0" }}>
      <svg width="166" height="166" viewBox="0 0 166 166">
        <circle cx="83" cy="83" r={r} fill="none" stroke={c.timerTrack} strokeWidth="7" />
        <circle cx="83" cy="83" r={r} fill="none" stroke={col} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 83 83)" style={{ transition:"stroke-dashoffset 0.6s ease" }} />
        <text x="83" y="77" textAnchor="middle" fill={c.textPrimary} fontFamily="'JetBrains Mono',monospace" fontSize="28" fontWeight="700">{mins}:{secs}</text>
        <text x="83" y="98" textAnchor="middle" fill={col} fontFamily="'Geist',sans-serif" fontSize="11" fontWeight="600" letterSpacing="3">{label}</text>
      </svg>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function BarChart({ data, color }) {
  const c = useTheme();
  const col = color || c.green;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:64 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", borderRadius:4, height:`${(d.value/max)*52}px`, background:d.highlight?col:c.barEmpty, border:`1px solid ${d.highlight?col:c.barBorder}`, transition:"height 0.4s ease", minHeight:4 }} />
          <span style={{ fontSize:9, color:c.textMuted, fontWeight:500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color, height = 52 }) {
  const c = useTheme();
  const col = color || c.green;
  if (data.length < 2) return null;
  const max = Math.max(...data)||1, min = Math.min(...data);
  const w = 280, h = height;
  const pts = data.map((v,i) => { const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*(h-12)-6; return `${x},${y}`; }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v,i) => { const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*(h-12)-6; return <circle key={i} cx={x} cy={y} r="3.5" fill={col} />; })}
    </svg>
  );
}

// ── WORKOUT SCREEN ────────────────────────────────────────────────────────────
function WorkoutScreen({ onExit, onComplete, settings, intensity: initIntensity, stage }) {
  const { holdSecs, restSecs, totalSets } = settings;
  const WORKOUT_EXERCISES = EXERCISES_BY_STAGE[stage] || EXERCISES_BY_STAGE.A;

  // ── Warm-up state ──
  const [warmupDone, setWarmupDone]     = useState(false);
  const [warmupIdx, setWarmupIdx]       = useState(0);
  const [warmupTimeLeft, setWarmupTimeLeft] = useState(WARMUP_STRETCHES[0].hold);
  const [warmupRunning, setWarmupRunning]   = useState(false);
  const warmupRef = useRef(null);

  useEffect(() => {
    if (warmupRunning && warmupTimeLeft > 0) {
      warmupRef.current = setInterval(() => setWarmupTimeLeft(t => t - 1), 1000);
    } else {
      clearInterval(warmupRef.current);
      if (warmupRunning && warmupTimeLeft === 0) {
        // auto-advance to next stretch
        if (warmupIdx < WARMUP_STRETCHES.length - 1) {
          setWarmupIdx(i => i + 1);
          setWarmupTimeLeft(WARMUP_STRETCHES[warmupIdx + 1].hold);
          setWarmupRunning(false);
        } else {
          setWarmupRunning(false);
        }
      }
    }
    return () => clearInterval(warmupRef.current);
  }, [warmupRunning, warmupTimeLeft, warmupIdx]);
  const [exIdx, setExIdx]               = useState(0);
  const [phase, setPhase]               = useState("idle");
  const [timeLeft, setTimeLeft]         = useState(holdSecs);
  const [isRunning, setIsRunning]       = useState(false);
  const [completedSets, setCompletedSets] = useState(0);
  const [showExit, setShowExit]         = useState(false);
  const [sessionNote, setSessionNote]   = useState("");
  const [intensity, setIntensity]       = useState(initIntensity);
  const [sessionStartTime]              = useState(Date.now());

  const timerRef  = useRef(null);
  const phaseRef  = useRef(phase);
  const setsRef   = useRef(completedSets);
  const exRef     = useRef(exIdx);
  phaseRef.current = phase; setsRef.current = completedSets; exRef.current = exIdx;

  const exercise     = WORKOUT_EXERCISES[exIdx];
  const isLastEx     = exIdx === WORKOUT_EXERCISES.length - 1;
  const isHold       = phase === "hold";
  const isRest       = phase === "rest";
  const isExDone     = phase === "exDone";
  const isSessionDone= phase === "sessionDone";
  const isIdle       = phase === "idle";
  const ringColor    = isHold ? THEMES.dark.green : isRest ? THEMES.dark.blue : THEMES.dark.green;
  const total        = isHold ? holdSecs : restSecs;
  const r = 100, circ = 2 * Math.PI * r;
  const dashOffset   = (isIdle||isExDone||isSessionDone) ? circ : circ*(timeLeft/total);
  const mins = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const secs = String(timeLeft%60).padStart(2,"0");

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev > 1) return prev - 1;
      const p = phaseRef.current, sets = setsRef.current;
      if (p === "hold") {
        cueHoldEnd();
        const next = sets + 1;
        setCompletedSets(next);
        if (next >= totalSets) { setPhase("exDone"); setIsRunning(false); clearInterval(timerRef.current); return 0; }
        setPhase("rest");
        setTimeout(() => setIsRunning(true), 60);
        return restSecs;
      }
      if (p === "rest") {
        cueRestEnd();
        setPhase("idle"); setIsRunning(false); clearInterval(timerRef.current); return holdSecs;
      }
      return 0;
    });
  }, [holdSecs, restSecs, totalSets]);

  useEffect(() => {
    if (isRunning) timerRef.current = setInterval(tick, 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRunning, tick]);

  const [confirmedEffort, setConfirmedEffort] = useState(false);

  // Show effort confirmation before first hold of the session
  const showEffortPrompt = isIdle && exIdx === 0 && completedSets === 0 && !confirmedEffort;

  function handleStart() { setPhase("hold"); setTimeLeft(holdSecs); setIsRunning(true); }
  const handlePause    = () => setIsRunning(r => !r);
  const handleResetSet = () => { clearInterval(timerRef.current); setIsRunning(false); setPhase("idle"); setTimeLeft(holdSecs); };
  const handleNextEx   = () => {
    if (isLastEx) { setPhase("sessionDone"); }
    else { setExIdx(i=>i+1); setCompletedSets(0); setPhase("idle"); setTimeLeft(holdSecs); setIsRunning(false); }
  };
  const handleFinish = () => {
    const elapsed = Math.round((Date.now()-sessionStartTime)/60000);
    onComplete({ date: new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}), exercises: WORKOUT_EXERCISES.length, totalSets: WORKOUT_EXERCISES.length * totalSets, intensity, duration: elapsed, notes: sessionNote });
    setPhase("saved");
  };

  // ── WARM-UP SCREEN ────────────────────────────────────────────────────────────
  if (!warmupDone) {
    const stretch = WARMUP_STRETCHES[warmupIdx];
    const pct = 1 - warmupTimeLeft / stretch.hold;
    const r2 = 68, circ2 = 2 * Math.PI * r2;
    const allDone = warmupIdx === WARMUP_STRETCHES.length - 1 && warmupTimeLeft === 0 && !warmupRunning;
    return (
      <div style={{ position:"fixed", inset:0, background:"#000", zIndex:200, display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"52px 20px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.textSecondary, letterSpacing:3 }}>WARM-UP</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginTop:2 }}>Stretching &amp; Activation</div>
          </div>
          <button onClick={()=>setShowExit(true)} style={{ background:"transparent", border:`1px solid #333`, borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:600, color:THEMES.dark.textSecondary, cursor:"pointer" }}>Skip</button>
        </div>

        {/* Step dots */}
        <div style={{ display:"flex", gap:6, padding:"0 20px 20px" }}>
          {WARMUP_STRETCHES.map((_,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < warmupIdx ? THEMES.dark.green : i === warmupIdx ? THEMES.dark.green+"88" : "#222", transition:"background 0.4s" }} />
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
          <div style={{ fontSize:44, marginBottom:16 }}>{stretch.emoji}</div>
          <div style={{ fontSize:26, fontWeight:900, fontFamily:"'Outfit',sans-serif", textAlign:"center", marginBottom:8 }}>{stretch.name}</div>
          <div style={{ fontSize:14, color:THEMES.dark.textSecondary, textAlign:"center", lineHeight:1.6, marginBottom:32, maxWidth:280 }}>{stretch.cue}</div>

          {/* Timer ring */}
          <div style={{ position:"relative", marginBottom:28 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={r2} fill="none" stroke="#1a1a1a" strokeWidth="7" />
              <circle cx="80" cy="80" r={r2} fill="none" stroke={THEMES.dark.green} strokeWidth="7"
                strokeDasharray={circ2} strokeDashoffset={circ2 * (1 - pct)}
                strokeLinecap="round" transform="rotate(-90 80 80)"
                style={{ transition:"stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:36, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color: warmupTimeLeft===0 ? THEMES.dark.green : "#f2f2f2" }}>
                {warmupTimeLeft === 0 ? "✓" : warmupTimeLeft}
              </span>
              <span style={{ fontSize:10, color:THEMES.dark.textSecondary, fontWeight:600, letterSpacing:2 }}>
                {warmupTimeLeft === 0 ? "DONE" : "SECS"}
              </span>
            </div>
          </div>

          <div style={{ fontSize:12, color:THEMES.dark.textSecondary }}>
            Stretch {warmupIdx + 1} of {WARMUP_STRETCHES.length}
          </div>
        </div>

        {/* Bottom buttons */}
        <div style={{ padding:"0 20px 48px", display:"flex", flexDirection:"column", gap:10 }}>
          {allDone ? (
            <button onClick={()=>setWarmupDone(true)} style={{ width:"100%", background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"18px", fontSize:16, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
              Start Workout →
            </button>
          ) : warmupTimeLeft === 0 && warmupIdx < WARMUP_STRETCHES.length - 1 ? (
            <button onClick={()=>{ setWarmupIdx(i=>i+1); setWarmupTimeLeft(WARMUP_STRETCHES[warmupIdx+1].hold); setWarmupRunning(false); }} style={{ width:"100%", background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"18px", fontSize:16, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
              Next Stretch →
            </button>
          ) : !warmupRunning ? (
            <button onClick={()=>setWarmupRunning(true)} style={{ width:"100%", background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"18px", fontSize:16, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <Icon name="play" size={17} color="#000" />
              {warmupIdx === 0 && warmupTimeLeft === stretch.hold ? "Begin Warm-Up" : "Resume"}
            </button>
          ) : (
            <button onClick={()=>setWarmupRunning(false)} style={{ width:"100%", background:"#111", color:THEMES.dark.textSecondary, border:"1px solid #333", borderRadius:50, padding:"18px", fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
              Pause
            </button>
          )}
          <button onClick={()=>setWarmupDone(true)} style={{ width:"100%", background:"transparent", border:"none", padding:"10px", fontSize:13, fontWeight:600, color:THEMES.dark.textSecondary, cursor:"pointer" }}>
            Skip to Workout
          </button>
        </div>

        {/* Exit confirm */}
        {showExit && (
          <div style={{ position:"absolute", inset:0, background:"#000000cc", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ background:"#141414", border:"1px solid #222", borderRadius:20, padding:24, width:"100%", maxWidth:340, textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:6 }}>Exit workout?</div>
              <div style={{ fontSize:13, color:THEMES.dark.textSecondary, marginBottom:20 }}>Progress won't be saved</div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setShowExit(false)} style={{ flex:1, background:"#1a1a1a", border:"1px solid #333", borderRadius:50, padding:"12px", fontSize:14, fontWeight:600, color:THEMES.dark.textSecondary, cursor:"pointer" }}>Stay</button>
                <button onClick={onExit} style={{ flex:1, background:THEMES.dark.red+"15", border:`1.5px solid ${THEMES.dark.red}55`, borderRadius:50, padding:"12px", fontSize:14, fontWeight:700, color:THEMES.dark.red, cursor:"pointer" }}>Exit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── SESSION SAVED CELEBRATION SCREEN ──
  if (phase === "saved") {
    const elapsed = Math.round((Date.now()-sessionStartTime)/60000);
    const messages = [
      "Tendons loaded. Recovery on track.",
      "Consistency is everything. Nice work.",
      "Another session banked. Keep going.",
      "That's how you rebuild. See you tomorrow.",
      "Pain is temporary. Progress is permanent.",
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    return (
      <div style={{ position:"fixed", inset:0, background:"#000", zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"64px 28px 52px", overflowY:"auto" }}>

        {/* Top — icon + headline */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", width:"100%", maxWidth:380 }}>
          <div className="complete-pop" style={{ width:72, height:72, borderRadius:20, background:THEMES.dark.green, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28 }}>
            <Icon name="bolt" size={36} color="#000" />
          </div>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.green, letterSpacing:3, marginBottom:12 }}>SESSION COMPLETE</div>
          <div style={{ fontSize:42, fontWeight:900, fontFamily:"'Outfit',sans-serif", lineHeight:1.05, letterSpacing:-1, marginBottom:16 }}>
            Great<br />work,<br />Adam.
          </div>
          <div style={{ fontSize:15, color:c.textSecondary, lineHeight:1.6, marginBottom:36 }}>{msg}</div>

          {/* Stats row */}
          <div style={{ display:"flex", gap:12, width:"100%", marginBottom:32 }}>
            {[{ label:"EXERCISES", value:WORKOUT_EXERCISES.length, unit:"done" }, { label:"SETS", value:WORKOUT_EXERCISES.length*totalSets, unit:"total" }, { label:"TIME", value:`${elapsed || 1}`, unit:"mins" }].map((s,i) => (
              <div key={i} style={{ flex:1, background:c.surface, borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:c.mutedText, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:6 }}>{s.label}</div>
                <div className="mono" style={{ fontSize:24, fontWeight:700, color:THEMES.dark.green }}>{s.value}</div>
                <div style={{ fontSize:10, color:c.dimText, marginTop:2 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ width:"100%", marginBottom:8 }}>
            <div style={{ fontSize:11, color:c.mutedText, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:10 }}>SESSION NOTES</div>
            <textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)}
              placeholder="How did it feel? Any tightness, wins, observations…" rows={3}
              style={{ width:"100%", background:c.surface, border:`1px solid ${c.surfaceBorder}`, borderRadius:12, padding:"12px 14px", fontSize:13, color:c.textPrimary, lineHeight:1.55, caretColor:THEMES.dark.green }} />
          </div>
        </div>

        {/* Bottom — CTA */}
        <div style={{ width:"100%", maxWidth:380 }}>
          <button onClick={onExit} style={{ width:"100%", background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"18px", fontSize:16, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer", letterSpacing:0.3 }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Session Complete (exercise checklist before saving) ──
  if (isSessionDone) {
    const elapsed = Math.round((Date.now()-sessionStartTime)/60000);
    return (
      <div className="fade-in" style={{ position:"fixed", inset:0, background:"#000", zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", overflowY:"auto" }}>
        <div className="complete-pop" style={{ width:80, height:80, borderRadius:20, background:THEMES.dark.green, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
          <Icon name="check" size={38} color="#000" />
        </div>
        <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Outfit',sans-serif", marginBottom:6, letterSpacing:-0.5 }}>All done!</div>
        <div style={{ fontSize:14, color:c.textSecondary, marginBottom:32 }}>Review your session below</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, width:"100%", maxWidth:360, marginBottom:28 }}>
          {[{ label:"EXERCISES", value:WORKOUT_EXERCISES.length, unit:"done" }, { label:"TOTAL SETS", value:WORKOUT_EXERCISES.length*totalSets, unit:"sets" }, { label:"DURATION", value:`~${elapsed}`, unit:"mins" }].map((s,i) => (
            <div key={i} style={{ background:c.surface, border:`1px solid ${c.surfaceBorder}`, borderRadius:14, padding:"13px 8px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:c.mutedText, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:4 }}>{s.label}</div>
              <div className="mono" style={{ fontSize:20, fontWeight:700, color:THEMES.dark.green }}>{s.value}</div>
              <div style={{ fontSize:10, color:c.dimText, marginTop:1 }}>{s.unit}</div>
            </div>
          ))}
        </div>

        <div style={{ width:"100%", maxWidth:360, marginBottom:28 }}>
          {WORKOUT_EXERCISES.map((ex,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<WORKOUT_EXERCISES.length-1?`1px solid ${c.rowAlt}`:"none" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:THEMES.dark.green+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name="check" size={12} color={THEMES.dark.green} />
              </div>
              <span style={{ fontSize:14, fontWeight:500 }}>{ex.name}</span>
              <span style={{ marginLeft:"auto", fontSize:12, color:c.mutedText }}>{totalSets} sets</span>
            </div>
          ))}
        </div>

        <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
          <div style={{ fontSize:11, color:c.mutedText, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:8 }}>SESSION NOTES (optional)</div>
          <textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="How did it feel? Any tightness, wins, observations…" rows={3}
            style={{ width:"100%", background:c.surface, border:`1px solid ${c.surfaceBorder}`, borderRadius:12, padding:"12px 14px", fontSize:13, color:c.textPrimary, lineHeight:1.5, caretColor:THEMES.dark.green }} />
        </div>

        <button onClick={handleFinish} style={{ width:"100%", maxWidth:360, background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"17px", fontSize:16, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
          Save Session
        </button>
      </div>
    );
  }

  // Motivational headlines
  const holdHeadlines = ["THIS SHOULD BE DIFFICULT","FEEL THE BURN","DON'T YOU DARE QUIT","LOCK IT IN","EMBRACE THE DISCOMFORT"];
  const restHeadlines = ["SHAKE IT OFF","YOU EARNED THIS","BREATHE. RESET.","STAY LOOSE","NEXT SET INCOMING"];
  const [headlineIdx] = useState(() => Math.floor(Math.random() * holdHeadlines.length));

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:200, display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ padding:"52px 20px 0", flexShrink:0 }}>
        {/* Motivational headline */}
        <div key={phase} className="fade-in" style={{ marginBottom:18, minHeight:36 }}>
          {(isHold||isIdle) && (
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Outfit',sans-serif", letterSpacing:-0.5, lineHeight:1.1 }}>
              <span style={{ color:THEMES.dark.green }}>{holdHeadlines[headlineIdx].split(" ").slice(0,-1).join(" ")} </span>
              <span style={{ color:THEMES.dark.green, fontStyle:"italic" }}>{holdHeadlines[headlineIdx].split(" ").slice(-1)[0]}</span>
            </div>
          )}
          {isRest && (
            <div style={{ fontSize:26, fontWeight:900, fontFamily:"'Outfit',sans-serif", letterSpacing:-0.5, color:THEMES.dark.blue }}>{restHeadlines[headlineIdx]}</div>
          )}
          {isExDone && (
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.green }}>EXERCISE DONE 🔥</div>
          )}
        </div>

        {/* Exercise label */}
        <div style={{ fontSize:10, color:THEMES.dark.textSecondary, fontWeight:600, letterSpacing:2, marginBottom:4 }}>EXERCISE {exIdx+1} OF {WORKOUT_EXERCISES.length}</div>
        <div key={exIdx} className="slide-in-right" style={{ fontSize:24, fontWeight:800, fontFamily:"'Outfit',sans-serif", lineHeight:1.1, marginBottom:14 }}>{exercise.name}</div>

        {/* Progress segments */}
        <div style={{ display:"flex", gap:6 }}>
          {WORKOUT_EXERCISES.map((_,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<exIdx?THEMES.dark.green:i===exIdx?(isExDone?THEMES.dark.green:THEMES.dark.green+"55"):"#222", transition:"background 0.4s ease" }} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
        {isExDone ? (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", width:"100%" }}>
            <div className="complete-pop" style={{ width:90, height:90, borderRadius:"50%", background:THEMES.dark.green+"18", border:`2px solid ${THEMES.dark.green}55`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, boxShadow:`0 0 40px ${THEMES.dark.green}33` }}>
              <Icon name="check" size={40} color={THEMES.dark.green} />
            </div>
            <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>{exercise.name}</div>
            <div style={{ fontSize:13, color:THEMES.dark.green, fontWeight:600, marginBottom:24, letterSpacing:1 }}>{totalSets} SETS COMPLETE</div>
            {!isLastEx && (
              <div style={{ background:c.surface, border:`1px solid #222`, borderRadius:16, padding:"14px 20px", marginBottom:24, width:"100%", maxWidth:320 }}>
                <div style={{ fontSize:10, color:THEMES.dark.textSecondary, fontWeight:600, letterSpacing:2, marginBottom:5 }}>NEXT UP</div>
                <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{WORKOUT_EXERCISES[exIdx+1].name}</div>
                <div style={{ fontSize:12, color:THEMES.dark.textSecondary, marginTop:3 }}>{WORKOUT_EXERCISES[exIdx+1].cue}</div>
              </div>
            )}
            <button onClick={handleNextEx} style={{ width:"100%", maxWidth:340, background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"17px", fontSize:16, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {isLastEx ? "Finish Session" : `Start ${WORKOUT_EXERCISES[exIdx+1].name}`}
              <Icon name="arrow" size={18} color="#000" />
            </button>
          </div>
        ) : (
          <>
            {/* Set tiles — solid fill when done */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:10, color:THEMES.dark.textSecondary, fontWeight:600, letterSpacing:2.5, marginBottom:12 }}>SETS COMPLETED</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                {Array.from({ length: totalSets }).map((_,i) => {
                  const done   = i < completedSets;
                  const active = (isHold||isRest) && i===completedSets;
                  return (
                    <div key={i} style={{
                      width:58, height:58, borderRadius:16,
                      background: done ? THEMES.dark.green : active ? ringColor+"18" : "#111",
                      border: `1.5px solid ${done ? THEMES.dark.green : active ? ringColor : "#2a2a2a"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all 0.35s ease",
                      boxShadow: done ? `0 0 16px ${THEMES.dark.green}44` : active ? `0 0 12px ${ringColor}33` : "none",
                    }}>
                      <span className="mono" style={{ fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", color: done ? "#000" : active ? ringColor : THEMES.dark.textSecondary }}>
                        {i+1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thick glowing ring */}
            <div style={{ position:"relative", marginBottom:10 }}>
              <svg width="230" height="230" viewBox="0 0 240 240" style={{ filter: !isIdle ? `drop-shadow(0 0 18px ${ringColor}88)` : "none", transition:"filter 0.4s ease" }}>
                <circle cx="120" cy="120" r={r} fill="none" stroke="#111" strokeWidth="14" />
                {!isIdle && (
                  <circle cx="120" cy="120" r={r} fill="none" stroke={ringColor} strokeWidth="14"
                    strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                    transform="rotate(-90 120 120)" style={{ transition:"stroke-dashoffset 0.5s linear,stroke 0.35s ease" }} />
                )}
                {isIdle && (
                  <circle cx="120" cy="120" r={r} fill="none" stroke="#222" strokeWidth="14"
                    strokeDasharray="8 14" transform="rotate(-90 120 120)" />
                )}
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span className="mono" style={{ fontSize:52, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:isIdle?"#2a2a2a":THEMES.dark.textPrimary, lineHeight:1, transition:"color 0.3s", letterSpacing:-1 }}>{mins}:{secs}</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:isIdle?"#2a2a2a":ringColor, letterSpacing:4, transition:"color 0.3s" }}>
                  {isIdle?"READY":isHold?"HOLD":"REST"}
                </span>
              </div>
            </div>

            {/* Cue text */}
            <div style={{ fontSize:13, color:THEMES.dark.textSecondary, textAlign:"center", marginBottom:24, padding:"0 20px", lineHeight:1.55 }}>
              {isIdle ? `Set ${completedSets+1} of ${totalSets} — ${exercise.cue}`
                      : isHold ? `Set ${completedSets+1} of ${totalSets} — hold it steady`
                                : `Recover · Set ${completedSets+1} of ${totalSets} coming up`}
            </div>

            {/* Action button — full-width pill */}
            {isIdle && (
              showEffortPrompt ? (
                <div className="fade-in" style={{ width:"100%", maxWidth:340 }}>
                  <div style={{ background:"#111", border:"1px solid #222", borderRadius:16, padding:"16px", marginBottom:12, textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.green, letterSpacing:1, marginBottom:6 }}>EFFORT CHECK</div>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Are you working at ~70% of your max effort?</div>
                    <div style={{ fontSize:12, color:THEMES.dark.textSecondary, lineHeight:1.55 }}>
                      Barely trying won't stimulate tendon remodelling. You should feel significant discomfort — not pain, but challenge.
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>{ setIntensity(i => Math.min(i, 65)); setConfirmedEffort(true); }} style={{ flex:1, background:"#111", border:"1px solid #333", borderRadius:50, padding:"14px", fontSize:13, fontWeight:700, color:THEMES.dark.textSecondary, cursor:"pointer" }}>
                      Need to increase load
                    </button>
                    <button onClick={()=>setConfirmedEffort(true)} style={{ flex:1, background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"14px", fontSize:13, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
                      Yes, let's go →
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={handleStart} style={{ width:"100%", maxWidth:340, background:THEMES.dark.green, color:"#000", border:"none", borderRadius:50, padding:"17px", fontSize:16, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 0 24px ${THEMES.dark.green}44` }}>
                  <Icon name="play" size={17} color="#000" />
                  {completedSets===0 ? "Start Hold" : `Start Set ${completedSets+1}`}
                </button>
              )
            )}
            {isHold && (
              <div style={{ width:"100%", maxWidth:340, display:"flex", gap:10 }}>
                <button onClick={handlePause} style={{ flex:1, background:isRunning?"#111":THEMES.dark.green, color:isRunning?THEMES.dark.textSecondary:"#000", border:`1.5px solid ${isRunning?"#333":THEMES.dark.green}`, borderRadius:50, padding:"16px", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" }}>
                  <Icon name={isRunning?"pause":"play"} size={16} color={isRunning?THEMES.dark.textSecondary:"#000"} />
                  {isRunning?"PAUSE":"RESUME"}
                </button>
                <button onClick={handleResetSet} style={{ background:c.surface, border:`1.5px solid ${c.cardBorder}`, borderRadius:50, padding:"16px 18px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <Icon name="reset" size={17} color={THEMES.dark.textSecondary} />
                </button>
              </div>
            )}
            {isRest && (
              <button disabled style={{ width:"100%", maxWidth:340, background:THEMES.dark.blue+"22", color:THEMES.dark.blue, border:`1.5px solid ${THEMES.dark.blue}55`, borderRadius:50, padding:"17px", fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"default", letterSpacing:0.5 }}>
                Resting...
              </button>
            )}
          </>
        )}
      </div>

      {/* End Workout */}
      <div style={{ padding:"0 24px 40px", flexShrink:0 }}>
        {showExit ? (
          <div className="fade-in-fast" style={{ background:c.surface, border:`1px solid ${c.cardBorder}`, borderRadius:18, padding:"18px", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:3 }}>End this workout?</div>
            <div style={{ fontSize:12, color:THEMES.dark.textSecondary, marginBottom:16 }}>Your progress won't be saved</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowExit(false)} style={{ flex:1, background:c.badgeBg, border:"1px solid #333", borderRadius:50, padding:"12px", fontSize:14, fontWeight:600, color:THEMES.dark.textSecondary, cursor:"pointer" }}>Keep Going</button>
              <button onClick={onExit} style={{ flex:1, background:THEMES.dark.red+"15", border:`1.5px solid ${THEMES.dark.red}66`, borderRadius:50, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.red, cursor:"pointer" }}>End Workout</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowExit(true)} style={{ width:"100%", background:"transparent", border:`1.5px solid ${THEMES.dark.red}66`, borderRadius:50, padding:"16px", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:THEMES.dark.red, cursor:"pointer", letterSpacing:0.3 }}>
            End Workout
          </button>
        )}
      </div>
    </div>
  );
}

// ── TODAY SCREEN ──────────────────────────────────────────────────────────────
function TodayScreen({ painLog, setPainLog, sessionHistory, streak, onStartWorkout, settings, stage }) {
  const c = useTheme();
  const [painValue, setPainValue]     = useState(painLog[painLog.length-1]?.value ?? 2);
  const [checkedIn, setCheckedIn]     = useState(false);
  const [supplements, setSupplements] = useState([false,false]);
  const supps = ["15g Collagen Peptides","225mg Vitamin C"];

  // Stage-specific exercise list for the preview card
  const WORKOUT_EXERCISES = EXERCISES_BY_STAGE[stage] || EXERCISES_BY_STAGE.A;

  // Detect if a session was completed today
  const todayStr = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  const sessionToday = sessionHistory.some(s => s.date === todayStr);

  // 48-hour rest check — find the most recent session date
  const lastSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null;
  const hoursSinceLastSession = lastSession
    ? (Date.now() - new Date(lastSession.date.split(" ").reverse().join(" "))) / 3600000
    : 999;
  // Parse the stored date string "DD Mon YYYY" properly
  const lastSessionDate = lastSession ? (() => {
    const parts = lastSession.date.split(" "); // ["24","Feb","2026"]
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  })() : null;
  const daysSinceLast = lastSessionDate
    ? Math.floor((Date.now() - lastSessionDate.getTime()) / 86400000)
    : 99;
  const within48hrs = daysSinceLast === 0 && !sessionToday; // trained today already handled separately
  const needsRest   = daysSinceLast < 1 && !sessionToday;  // same-day attempt

  // Timestamp-based nutrition timer — survives lock screen / backgrounding
  const DURATION = 3600;
  const [nutStartedAt, setNutStartedAt] = useState(null);
  const [nutSecondsLeft, setNutSecondsLeft] = useState(DURATION);
  const nutTickRef = useRef(null);

  // Ice timer — 10 minutes, same timestamp approach
  const ICE_DURATION = 600;
  const [iceStartedAt, setIceStartedAt] = useState(null);
  const [iceSecondsLeft, setIceSecondsLeft] = useState(ICE_DURATION);
  const [iceDone, setIceDone] = useState(false);
  const iceTickRef = useRef(null);

  const recalcIce = useCallback(() => {
    if (!iceStartedAt) return;
    const elapsed = Math.floor((Date.now() - iceStartedAt) / 1000);
    const remaining = Math.max(0, ICE_DURATION - elapsed);
    setIceSecondsLeft(remaining);
    if (remaining === 0) {
      clearInterval(iceTickRef.current);
      setIceStartedAt(null);
      setIceDone(true);
    }
  }, [iceStartedAt]);

  useEffect(() => {
    if (iceStartedAt) {
      recalcIce();
      iceTickRef.current = setInterval(recalcIce, 1000);
    } else {
      clearInterval(iceTickRef.current);
    }
    return () => clearInterval(iceTickRef.current);
  }, [iceStartedAt, recalcIce]);

  useEffect(() => {
    const onVisible = () => { if (iceStartedAt) recalcIce(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [iceStartedAt, recalcIce]);

  // Recalculate remaining time from the stored start timestamp
  const recalcNut = useCallback(() => {
    if (!nutStartedAt) return;
    const elapsed = Math.floor((Date.now() - nutStartedAt) / 1000);
    const remaining = Math.max(0, DURATION - elapsed);
    setNutSecondsLeft(remaining);
    if (remaining === 0) {
      clearInterval(nutTickRef.current);
      setNutStartedAt(null);
    }
  }, [nutStartedAt]);

  useEffect(() => {
    if (nutStartedAt) {
      recalcNut(); // immediate update on mount / resume
      nutTickRef.current = setInterval(recalcNut, 1000);
    } else {
      clearInterval(nutTickRef.current);
    }
    return () => clearInterval(nutTickRef.current);
  }, [nutStartedAt, recalcNut]);

  // Recalculate when app comes back to foreground
  useEffect(() => {
    const onVisible = () => { if (nutStartedAt) recalcNut(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [nutStartedAt, recalcNut]);

  const handleNutStart  = () => setNutStartedAt(Date.now());
  const handleNutPause  = () => {
    // Freeze remaining time, clear start so interval stops
    setNutSecondsLeft(prev => { setNutStartedAt(null); return prev; });
  };
  const handleNutReset  = () => { setNutStartedAt(null); setNutSecondsLeft(DURATION); };
  const nutRunning = !!nutStartedAt;
  const nutDone = nutSecondsLeft === 0;

  const painColor = painValue<=3?c.green:painValue<=6?c.yellow:c.red;

  // Pain spike insight
  const recentPain = painLog.slice(-3).map(p=>p.value);
  const painSpike = recentPain.length===3 && recentPain.every((v,i)=>i===0||v>=recentPain[i-1]) && recentPain[2]>recentPain[0];

  // Overload prompt — 4+ sessions at same intensity, no pain spike
  const lastFour = sessionHistory.slice(-4);
  const sameIntensity = lastFour.length===4 && lastFour.every(s=>s.intensity===lastFour[0].intensity);
  const recentAvgPain = painLog.slice(-4).reduce((a,b)=>a+b.value,0)/(painLog.slice(-4).length||1);
  const showOverload = sameIntensity && recentAvgPain<=3 && !painSpike;

  const handleLogCheckIn = () => {
    setCheckedIn(true);
    const lbl = painValue<=3?"Low":painValue<=6?"Moderate":"Severe";
    setPainLog([...painLog,{ value:painValue, label:lbl, date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) }].slice(-30));
  };

  const handleRestDay = () => {
    setPainLog([...painLog,{ value:painValue, label:"Rest", date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}), restDay:true }].slice(-30));
    setCheckedIn(true);
  };

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>

      {/* Greeting */}
      {(() => {
        const h = new Date().getHours();
        const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
        return (
          <div style={{ marginBottom:20, paddingTop:4 }}>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Outfit',sans-serif", lineHeight:1.1, letterSpacing:-0.5 }}>
              {greeting},
            </div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Outfit',sans-serif", lineHeight:1.1, letterSpacing:-0.5, color:c.green }}>
              Adam.
            </div>
          </div>
        );
      })()}

      {/* Overload prompt */}
      {showOverload && (
        <div className="slide-up" style={{ background:c.yellow+"11", border:`1px solid ${c.yellow}33`, borderRadius:14, padding:"14px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"flex-start" }}>
          <Icon name="up" size={18} color={c.yellow} />
          <div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.yellow, marginBottom:2 }}>Ready to progress?</div>
            <div style={{ fontSize:12, color:c.textSecondary, lineHeight:1.5 }}>4 sessions at {lastFour[0]?.intensity}% with no pain spike. Consider increasing intensity by 5–10%.</div>
          </div>
        </div>
      )}

      {/* Pain spike warning — rich intervention card */}
      {painSpike && (
        <div className="slide-up" style={{ background:c.red+"0d", border:`1.5px solid ${c.red}44`, borderRadius:16, padding:"16px", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:c.red+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="warn" size={18} color={c.red} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:c.red }}>⚠️ Hold On — Tendon Needs More Time</div>
              <div style={{ fontSize:11, color:c.textSecondary, marginTop:1 }}>Pain trending up over last 3 check-ins</div>
            </div>
          </div>
          <div style={{ fontSize:12, color:c.textSecondary, lineHeight:1.6, marginBottom:12 }}>
            <strong style={{ color:c.textPrimary }}>The 24-Hour Rule:</strong> Your pain hasn't returned to baseline — last session load was too high.
          </div>
          <div style={{ background:c.surface, borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.red, letterSpacing:1, marginBottom:6 }}>TODAY'S PLAN</div>
            <div style={{ fontSize:12, color:c.textSecondary, lineHeight:1.7 }}>
              • Take a <strong style={{ color:c.textPrimary }}>complete rest day</strong> from loading<br/>
              • Or do <strong style={{ color:c.textPrimary }}>2–3 sets of light isometrics</strong> (30s holds) if pain is tolerable<br/>
              • When you return: reduce <strong style={{ color:c.textPrimary }}>volume or intensity by 10–20%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 24-HR Check-In */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:c.badgeBg, border:`1px solid ${c.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="pain" size={17} color={painColor} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>24-HR Check-In</div>
            <div style={{ fontSize:12, color:c.textSecondary, marginTop:1 }}>Morning baseline</div>
          </div>
        </div>
        <PainSlider value={painValue} onChange={setPainValue} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:800, fontFamily:"'Outfit',sans-serif", letterSpacing:0.5, marginBottom:14, marginTop:4 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}><span style={{ color:"#B2FF00" }}>NO PAIN</span><span style={{ color:c.textSecondary, fontSize:12 }}>0</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center" }}><span style={{ color:"#f59e0b" }}>MODERATE</span><span style={{ color:c.textSecondary, fontSize:12 }}>5</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" }}><span style={{ color:"#e91e8c" }}>SEVERE</span><span style={{ color:c.textSecondary, fontSize:12 }}>10</span></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:c.checkInRow, borderRadius:12, padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:checkedIn?c.green:c.badgeBg, border:`1px solid ${checkedIn?c.green:c.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s", flexShrink:0 }}>
              {checkedIn && <Icon name="check" size={13} color="#000" />}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:checkedIn?c.textPrimary:c.textSecondary, lineHeight:1.2 }}>
                {checkedIn ? `Logged — ${painValue<=3?"Low":painValue<=6?"Moderate":"Severe"} pain` : "Ready for today's protocol"}
              </div>
              {checkedIn && <div style={{ fontSize:11, color:c.textSecondary, marginTop:1 }}>{painValue}/10</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, fontWeight:600, color:c.mutedText, background:c.badgeBg, padding:"4px 10px", borderRadius:20, letterSpacing:0.5 }}>STAGE: {stage}</span>
            {!checkedIn && (
              <button onClick={handleLogCheckIn} style={{ background:c.green, color:"#000", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>LOG</button>
            )}
          </div>
        </div>
        {/* Rest Day */}
        {!checkedIn && (
          <button onClick={handleRestDay} style={{ width:"100%", marginTop:10, background:"transparent", border:`1px solid #222`, borderRadius:10, padding:"10px", fontSize:12, fontWeight:600, color:c.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <Icon name="moon" size={14} color={c.textSecondary} />
            Log as Rest Day
          </button>
        )}
      </div>

      {/* Pre-Workout Nutrition */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:c.badgeBg, border:`1px solid ${c.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="nutrition" size={17} color={c.green} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Pre-Workout Nutrition</div>
            <div style={{ fontSize:12, color:c.textSecondary, marginTop:1 }}>60-min absorption window</div>
          </div>
        </div>
        <CircularTimer seconds={nutSecondsLeft} total={DURATION} label={nutDone?"READY!":"PROTOCOL"} color={nutDone?c.green:nutRunning?c.green:c.textSecondary} />
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:14 }}>
          {nutDone ? (
            <button onClick={handleNutReset} style={{ background:c.green+"18", border:`1px solid ${c.green}44`, borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", color:c.green }}>
              Reset
            </button>
          ) : (
            <>
              <button onClick={nutRunning?handleNutPause:handleNutStart} style={{ background:nutRunning?c.badgeBg:c.green, color:nutRunning?c.textSecondary:"#000", border:`1px solid ${nutRunning?c.cardBorder:c.green}`, borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                <Icon name={nutRunning?"pause":"play"} size={13} color={nutRunning?c.textSecondary:"#000"} />
                {nutRunning?"PAUSE":"START"}
              </button>
              <button onClick={handleNutReset} style={{ background:c.badgeBg, border:`1px solid ${c.cardBorder}`, borderRadius:10, padding:"9px 14px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                <Icon name="reset" size={15} color={c.textSecondary} />
              </button>
            </>
          )}
        </div>
        {supps.map((s,i)=>(
          <div key={i} onClick={()=>setSupplements(p=>p.map((v,j)=>j===i?!v:v))} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 13px", borderRadius:10, background:c.surfaceAlt, border:`1px solid ${supplements[i]?c.green+"33":c.cardBorder}`, marginBottom:8, cursor:"pointer", transition:"border-color 0.2s" }}>
            <div style={{ width:19, height:19, borderRadius:5, border:`1.5px solid ${supplements[i]?c.green:c.textSecondary}`, background:supplements[i]?c.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 }}>
              {supplements[i]&&<Icon name="check" size={11} color="#000" />}
            </div>
            <span style={{ fontSize:13, fontWeight:500, color:c.textSecondary, textDecoration:supplements[i]?"line-through":"none" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Today's Workout */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:c.green+"18", border:`1px solid ${c.green}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="workout" size={17} color={c.green} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Today's Workout</div>
            <div style={{ fontSize:12, color:c.textSecondary, marginTop:1 }}>{WORKOUT_EXERCISES.length} exercises · {settings.totalSets} × {settings.holdSecs}s</div>
          </div>
        </div>
        {WORKOUT_EXERCISES.map((ex,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:i<WORKOUT_EXERCISES.length-1?`1px solid ${c.rowAlt}`:"none" }}>
            <div style={{ width:20, height:20, borderRadius:5, background:c.badgeBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.mutedText }}>{i+1}</span>
            </div>
            <span style={{ fontSize:13, fontWeight:500 }}>{ex.name}</span>
            <span style={{ marginLeft:"auto", fontSize:11, color:c.dimText, fontWeight:500 }}>{settings.totalSets} × {settings.holdSecs}s</span>
          </div>
        ))}
        {/* 48-hour rest warning */}
        {needsRest && !sessionToday && (
          <div style={{ background:c.yellow+"11", border:`1px solid ${c.yellow}33`, borderRadius:12, padding:"12px 14px", marginTop:14, display:"flex", gap:10, alignItems:"flex-start" }}>
            <Icon name="warn" size={16} color={c.yellow} />
            <div style={{ fontSize:12, color:c.textSecondary, lineHeight:1.55 }}>
              <strong style={{ color:c.yellow }}>48-hour rule:</strong> Your last session was today. Tendons need 48hrs for net positive collagen synthesis. Rest up.
            </div>
          </div>
        )}
        <button
          onClick={needsRest && !sessionToday ? undefined : onStartWorkout}
          style={{ width:"100%", marginTop:18, background: needsRest && !sessionToday ? c.badgeBg : c.green, color: needsRest && !sessionToday ? c.textSecondary : "#000", border: needsRest && !sessionToday ? `1px solid ${c.cardBorder}` : "none", borderRadius:50, padding:"16px", fontSize:15, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor: needsRest && !sessionToday ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow: needsRest && !sessionToday ? "none" : `0 0 20px ${c.green}33`, opacity: needsRest && !sessionToday ? 0.6 : 1 }}>
          <Icon name={needsRest && !sessionToday ? "moon" : "play"} size={17} color={needsRest && !sessionToday ? c.textSecondary : "#000"} />
          {needsRest && !sessionToday ? "Rest Day — Come Back Tomorrow" : sessionToday ? "Workout Complete Today ✓" : "Ready to Workout"}
        </button>
      </div>

      {/* Ice Timer — appears after completing a session today */}
      {sessionToday && (
        <div className="card fade-in">
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"#e0f4ff22", border:`1px solid #38bdf833`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              🧊
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Post-Workout Ice</div>
              <div style={{ fontSize:12, color:c.textSecondary, marginTop:1 }}>Apply ice to front of knee · 10 min</div>
            </div>
          </div>

          {iceDone ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, background:c.green+"11", border:`1px solid ${c.green}33`, borderRadius:12, padding:"14px 16px" }}>
              <Icon name="check" size={18} color={c.green} />
              <div>
                <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.green }}>Ice session complete</div>
                <div style={{ fontSize:12, color:c.textSecondary, marginTop:1 }}>Great recovery work. See you next session.</div>
              </div>
              <button onClick={()=>{ setIceDone(false); setIceSecondsLeft(ICE_DURATION); }} style={{ marginLeft:"auto", background:"transparent", border:"none", fontSize:11, color:c.textSecondary, cursor:"pointer", fontWeight:600 }}>Reset</button>
            </div>
          ) : (
            <>
              <CircularTimer seconds={iceSecondsLeft} total={ICE_DURATION} label={iceStartedAt?"ICING":"READY"} color="#38bdf8" />
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                {!iceStartedAt ? (
                  <button onClick={()=>setIceStartedAt(Date.now())} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:50, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                    <Icon name="play" size={14} color="#000" />
                    Start Ice Timer
                  </button>
                ) : (
                  <>
                    <button onClick={()=>{ setIceSecondsLeft(prev => { setIceStartedAt(null); return prev; }); }} style={{ background:c.surface, border:`1px solid ${c.cardBorder}`, borderRadius:50, padding:"12px 24px", fontSize:14, fontWeight:600, color:c.textSecondary, cursor:"pointer" }}>
                      Pause
                    </button>
                    <button onClick={()=>{ setIceStartedAt(null); setIceSecondsLeft(ICE_DURATION); }} style={{ background:c.surface, border:`1px solid ${c.cardBorder}`, borderRadius:50, padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <Icon name="reset" size={15} color={c.textSecondary} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Streak */}
      <div className="card" style={{ background:c.streakBg, border:`1px solid ${c.green}33`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:-24, right:-10, opacity:0.06 }}><Icon name="fire" size={130} color={c.green} /></div>
        <div style={{ fontSize:10, color:c.green, fontWeight:600, letterSpacing:3, marginBottom:8 }}>DAILY STREAK</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:30, fontWeight:800, fontFamily:"'Outfit',sans-serif", lineHeight:1.15, color:c.streakText }}>{streak}-Day Streak<br />Active</div>
          <div style={{ width:46, height:46, borderRadius:"50%", background:c.green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="bolt" size={22} color="#000" /></div>
        </div>
      </div>
    </div>
  );
}

// ── TRENDS SCREEN ─────────────────────────────────────────────────────────────
function TrendsScreen({ painLog, sessionHistory, onExport }) {
  const c = useTheme();
  const [tab, setTab] = useState("pain");

  const recentPain   = painLog.slice(-14);
  const last7Pain    = painLog.slice(-7);
  const prev7Pain    = painLog.slice(-14, -7);
  const avgPain      = last7Pain.length ? (last7Pain.reduce((a,b)=>a+b.value,0)/last7Pain.length).toFixed(1) : "—";
  const prevAvgPain  = prev7Pain.length ? (prev7Pain.reduce((a,b)=>a+b.value,0)/prev7Pain.length).toFixed(1) : null;
  const painDelta    = prevAvgPain ? (parseFloat(avgPain) - parseFloat(prevAvgPain)).toFixed(1) : null;

  // Consistency = % of last 30 days with session or rest log
  const todayMs = Date.now();
  const activeDates = new Set([...sessionHistory.map(s=>s.date), ...painLog.map(p=>p.date)]);
  let activeDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayMs - i * 86400000);
    const lbl = d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    if (activeDates.has(lbl)) activeDays++;
  }
  const consistency = Math.round((activeDays / 30) * 100);
  const prevConsistency = Math.max(0, consistency - 5); // approx trend
  const consistencyDelta = consistency - prevConsistency;

  // Monthly calendar
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthName = now.toLocaleString("en-GB", { month:"long", year:"numeric" }).toUpperCase();
  const sessionDates = new Set(sessionHistory.map(s=>s.date));
  const restDates    = new Set(painLog.filter(p=>p.restDay).map(p=>p.date));

  const trainDays  = sessionHistory.slice(-14).map(s=>s.date);
  const trainPain  = painLog.filter(p=>trainDays.includes(p.date)).map(p=>p.value);
  const restPain   = painLog.filter(p=>!trainDays.includes(p.date)&&!p.restDay).map(p=>p.value);
  const trainAvg   = trainPain.length ? (trainPain.reduce((a,b)=>a+b,0)/trainPain.length).toFixed(1) : null;
  const restAvg    = restPain.length  ? (restPain.reduce((a,b)=>a+b,0)/restPain.length).toFixed(1)  : null;
  const intensityData = sessionHistory.slice(-10).map(s=>s.intensity);

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>
      <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Outfit',sans-serif", marginBottom:4, letterSpacing:-0.5 }}>Recovery Trends</div>
      <div style={{ fontSize:12, color:c.textSecondary, marginBottom:16 }}>Monitoring morning baseline</div>

      {/* Tab toggle */}
      <div style={{ display:"flex", background:c.surfaceAlt, borderRadius:12, padding:3, marginBottom:16, border:`1px solid ${c.cardBorder}` }}>
        {[{id:"pain",label:"Pain & Progress"},{id:"history",label:"Session History"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:tab===t.id?c.card:"transparent", color:tab===t.id?c.textPrimary:c.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s", boxShadow:tab===t.id?`0 1px 4px rgba(0,0,0,0.15)`:"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pain" && (
        <>
          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div className="card" style={{ margin:0, padding:"16px" }}>
              <div style={{ fontSize:9, color:c.textSecondary, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:6 }}>AVG PAIN</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span className="mono" style={{ fontSize:32, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:parseFloat(avgPain)<=3?c.green:parseFloat(avgPain)<=6?c.yellow:c.red, lineHeight:1 }}>{avgPain}</span>
                {painDelta !== null && (
                  <span style={{ fontSize:13, fontWeight:700, color:parseFloat(painDelta)<0?c.green:c.red }}>{parseFloat(painDelta)>0?"+":""}{painDelta}</span>
                )}
              </div>
              <div style={{ fontSize:10, color:c.textMuted, marginTop:2 }}>out of 10</div>
            </div>
            <div className="card" style={{ margin:0, padding:"16px" }}>
              <div style={{ fontSize:9, color:c.textSecondary, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:6 }}>CONSISTENCY</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span className="mono" style={{ fontSize:32, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:consistency>=70?c.green:consistency>=40?c.yellow:c.red, lineHeight:1 }}>{consistency}%</span>
                {consistencyDelta > 0 && <span style={{ fontSize:13, fontWeight:700, color:c.green }}>+{consistencyDelta}%</span>}
              </div>
              <div style={{ fontSize:10, color:c.textMuted, marginTop:2 }}>30-day activity</div>
            </div>
          </div>

          {/* 14-day sparkline */}
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Morning Baseline Pain</div>
                <div style={{ fontSize:12, color:c.textSecondary, marginTop:2 }}>Last 14 Days</div>
              </div>
              {painDelta !== null && (
                <span style={{ fontSize:12, fontWeight:700, color:parseFloat(painDelta)<0?c.green:c.red, background:(parseFloat(painDelta)<0?c.green:c.red)+"15", padding:"4px 10px", borderRadius:20 }}>
                  {parseFloat(painDelta)<0?"↓":"↑"} {Math.abs(painDelta)*10}%
                </span>
              )}
            </div>
            {recentPain.length >= 2 ? (
              <>
                <Sparkline data={recentPain.map(p=>p.value)} color={c.green} height={80} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:10, color:c.textMuted }}>
                  <span>14 days ago</span><span>Today</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", color:c.textSecondary, padding:"20px 0", fontSize:13 }}>Log at least 2 check-ins to see your trend.</div>
            )}
          </div>

          {/* Stats pills */}
          <div className="card">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background:c.surfaceAlt, borderRadius:12, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:c.textSecondary, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:6 }}>SESSIONS</div>
                <div className="mono" style={{ fontSize:28, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:c.blue }}>{sessionHistory.length}</div>
                <div style={{ fontSize:10, color:c.textMuted }}>total</div>
              </div>
              <div style={{ background:c.surfaceAlt, borderRadius:12, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:c.textSecondary, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:6 }}>COLLAGEN DAYS</div>
                <div className="mono" style={{ fontSize:28, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:c.green }}>{painLog.length}</div>
                <div style={{ fontSize:10, color:c.textMuted }}>logged</div>
              </div>
            </div>
          </div>

          {/* Training vs rest pain */}
          {trainAvg && restAvg && (
            <div className="card">
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>Training vs Rest Day Pain</div>
              <div style={{ fontSize:12, color:c.textSecondary, marginBottom:16 }}>Average pain score comparison</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[{ label:"TRAINING DAYS", value:trainAvg, color:c.blue },{ label:"REST DAYS", value:restAvg, color:c.purple }].map((s,i)=>(
                  <div key={i} style={{ background:c.surfaceAlt, borderRadius:12, padding:"14px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:c.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:6 }}>{s.label}</div>
                    <div className="mono" style={{ fontSize:28, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:c.textMuted }}>avg /10</div>
                  </div>
                ))}
              </div>
              {parseFloat(trainAvg)<parseFloat(restAvg) && (
                <div style={{ marginTop:12, fontSize:12, color:c.green, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="bolt" size={13} color={c.green} />Training days show lower pain — keep loading!
                </div>
              )}
            </div>
          )}

          {/* Intensity sparkline */}
          {intensityData.length > 1 && (
            <div className="card">
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:2 }}>Intensity Progression</div>
              <div style={{ fontSize:12, color:c.textSecondary, marginBottom:14 }}>MVC % across last {intensityData.length} sessions</div>
              <Sparkline data={intensityData} color={c.blue} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:10, color:c.textSecondary, fontWeight:500 }}>
                <span>EARLIEST</span>
                <span style={{ color:c.blue }}>{intensityData[intensityData.length-1] > intensityData[0] ? `+${intensityData[intensityData.length-1]-intensityData[0]}% increase` : "stable"}</span>
                <span>LATEST</span>
              </div>
            </div>
          )}

          {/* Monthly calendar */}
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Monthly Outlook</div>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.green, letterSpacing:1 }}>{monthName}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
              {["M","T","W","T","F","S","S"].map((d,i)=>(
                <div key={i} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:c.textMuted, paddingBottom:4 }}>{d}</div>
              ))}
              {/* Offset for first day — convert Sun=0 to Mon=0 */}
              {Array.from({ length: (firstDay + 6) % 7 }).map((_,i)=>(
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_,i)=>{
                const day = i + 1;
                const d = new Date(year, month, day);
                const lbl = d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
                const isToday = day === now.getDate();
                const isSession = sessionDates.has(lbl);
                const isRest    = restDates.has(lbl) && !isSession;
                return (
                  <div key={day} style={{ aspectRatio:"1", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background: isSession ? c.green : isRest ? c.purple+"33" : "transparent", border: isToday ? `1.5px solid ${c.green}` : "1px solid transparent", position:"relative" }}>
                    <span style={{ fontSize:10, fontWeight: isToday||isSession ? 700 : 400, color: isSession ? "#000" : isToday ? c.green : c.textSecondary }}>{day}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:8 }}>
              {[{color:c.green,label:"Workout"},{color:c.purple+"99",label:"Rest"}].map((l,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:l.color }} />
                  <span style={{ fontSize:10, color:c.textSecondary }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onExport} style={{ width:"100%", background:c.card, border:`1px solid ${c.surfaceBorder}`, borderRadius:14, padding:"14px", fontSize:13, fontWeight:600, color:c.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
            <Icon name="download" size={16} color={c.textSecondary} />
            Export Data as CSV
          </button>
        </>
      )}

      {tab === "history" && (
        <>
          {sessionHistory.length===0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 20px" }}>
              <Icon name="history" size={32} color={c.textMuted} />
              <div style={{ fontSize:14, color:c.textSecondary, marginTop:12 }}>No sessions yet.</div>
              <div style={{ fontSize:12, color:c.textMuted, marginTop:4 }}>Complete your first workout to see history here.</div>
            </div>
          ) : (
            sessionHistory.slice().reverse().map((s,i)=>(
              <div key={i} className="card" style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:s.notes?12:0 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{s.date}</div>
                    <div style={{ fontSize:12, color:c.textSecondary, marginTop:2 }}>{s.exercises} exercises · {s.totalSets} sets · ~{s.duration} min</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div className="mono" style={{ fontSize:20, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.blue }}>{s.intensity}%</div>
                    <div style={{ fontSize:9, color:c.textSecondary, fontWeight:600, letterSpacing:1.5 }}>MVC</div>
                  </div>
                </div>
                {s.notes && (
                  <div style={{ background:c.surfaceAlt, borderRadius:10, padding:"10px 12px", fontSize:12, color:c.textSecondary, lineHeight:1.55, display:"flex", gap:8, alignItems:"flex-start" }}>
                    <Icon name="note" size={13} color={c.textMuted} />
                    <span>{s.notes}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

// ── PROTOCOLS SCREEN ──────────────────────────────────────────────────────────
function ProtocolsScreen({ stage, weeksInStage, avgPain, onAdvanceStage }) {
  const c = useTheme();
  const [active, setActive] = useState(null);

  const stageOrder = ["A","B","C","M"];
  const currentIdx = stageOrder.indexOf(stage);

  const protocols = [
    { id:0, stage:"A", title:"Phase 1: Isometrics",          weeks:"Weeks 1–6",  goal:"Tendon Stress Relaxation",    color:c.green,  description:"Build base tendon tolerance with sustained isometric holds at 70% MVC. Focus on pain management and neuromuscular activation.", exercises:[{name:"Wall Squats",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"},{name:"Spanish Squat",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"},{name:"Leg Extensions",sets:4,reps:"45s hold",rest:"60s",intensity:"65% MVC"},{name:"Quad Sets",sets:3,reps:"5s × 10",rest:"30s",intensity:"Bodyweight"},{name:"Calf Raises",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"}] },
    { id:1, stage:"B", title:"Phase 2: Heavy Slow Resistance",weeks:"Weeks 5–12", goal:"Hypertrophy & Remodelling",    color:c.blue,   description:"Introduce slow eccentric-concentric movements at 3-0-3 tempo to build tendon stiffness and cross-sectional area.", exercises:[{name:"Bulgarian Split Squat",sets:4,reps:"8 reps",rest:"3 min",intensity:"3-0-3 tempo"},{name:"Eccentric Heel Drops",sets:3,reps:"10 reps",rest:"2 min",intensity:"Slow"},{name:"Leg Press (Single)",sets:3,reps:"12 reps",rest:"2 min",intensity:"Moderate"},{name:"Spanish Squat",sets:4,reps:"45s hold",rest:"60s",intensity:"75% MVC"}] },
    { id:2, stage:"C", title:"Phase 3: Plyometrics",          weeks:"Weeks 13+",  goal:"Energy Storage Capacity",     color:c.orange, description:"Develop tendon energy storage through progressive plyometric loading and reactive drills.", exercises:[{name:"Depth Jump (Low)",sets:3,reps:"6 reps",rest:"3 min",intensity:"Min. height"},{name:"Split Squat Jump",sets:3,reps:"8 reps",rest:"3 min",intensity:"Bodyweight"},{name:"Single-Leg Hop",sets:4,reps:"10m",rest:"3 min",intensity:"Controlled"},{name:"Box Jump",sets:3,reps:"5 reps",rest:"3 min",intensity:"Low box"}] },
    { id:3, stage:"M", title:"Maintenance",                   weeks:"Ongoing",    goal:"Tendon Health & Bulletproofing",color:c.purple, description:"Sustain tendon health with 2–3× weekly loading. Prevent deconditioning and maintain tissue quality long-term.", exercises:[{name:"Wall Squats",sets:3,reps:"45s hold",rest:"60s",intensity:"80% MVC"},{name:"Bulgarian Split Squat",sets:3,reps:"10 reps",rest:"2 min",intensity:"Progressive"},{name:"Calf Raise (Single)",sets:3,reps:"15 reps",rest:"90s",intensity:"Slow"},{name:"Spanish Squat",sets:3,reps:"45s hold",rest:"60s",intensity:"Max load"}] },
  ];

  const criteria = STAGE_CRITERIA[stage];
  const readyToProgress = criteria?.nextStage && weeksInStage >= criteria.minWeeks && avgPain <= criteria.maxAvgPain;

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 0 100px" }}>

      {/* Hero banner */}
      <div style={{ margin:"0 0 20px", background:"linear-gradient(135deg,#1a0800 0%,#2d1200 100%)", padding:"28px 20px 24px", borderBottom:`1px solid ${c.cardBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:c.orange, marginBottom:6 }}>SCIENTIFIC MASTERCLASS</div>
        <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:c.orange, marginBottom:8, letterSpacing:-0.5 }}>The Baar Protocol</div>
        <div style={{ fontSize:13, color:"#c9b08a", lineHeight:1.6, marginBottom:16 }}>15g Collagen + Vitamin C timing. Consume 60 minutes prior to exercise for optimal tendon synthesis.</div>
        <a href="https://pubmed.ncbi.nlm.nih.gov/28253282/" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:8, background:c.orange, color:"#000", border:"none", borderRadius:50, padding:"12px 24px", fontSize:13, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", textDecoration:"none", letterSpacing:0.3 }}>
          READ SCIENCE ↗
        </a>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Stage advancement banner */}
        {readyToProgress && (
          <div className="slide-up" style={{ background:c.green+"11", border:`1px solid ${c.green}44`, borderRadius:16, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.green, marginBottom:4 }}>Ready to advance to Phase {stageOrder.indexOf(criteria.nextStage)+1}?</div>
            <div style={{ fontSize:12, color:c.textSecondary, marginBottom:14, lineHeight:1.5 }}>You've completed {weeksInStage} weeks in Stage {stage} with avg pain {avgPain}/10 — criteria met!</div>
            <button onClick={()=>onAdvanceStage(criteria.nextStage)} style={{ background:c.green, color:"#000", border:"none", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
              Advance to Stage {criteria.nextStage}
            </button>
          </div>
        )}

        <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:c.textSecondary, marginBottom:12 }}>REHABILITATION PHASES · FOLLOW THE PRESCRIBED LOADING PROGRESSION</div>

        {protocols.map((p, idx) => {
          const isActive   = stage === p.stage;
          const isPast     = currentIdx > idx;
          const isFuture   = currentIdx < idx;
          const isExpanded = active === p.id;
          const progressPct = isActive ? Math.min(100, Math.round((weeksInStage / 6) * 100)) : isPast ? 100 : 0;

          return (
            <div key={p.id} className="card" style={{ marginBottom:10, cursor: isFuture ? "default" : "pointer", border:`1px solid ${isExpanded ? p.color+"55" : isActive ? p.color+"33" : c.cardBorder}`, opacity: isFuture ? 0.55 : 1, transition:"all 0.2s" }}
              onClick={()=>{ if (!isFuture) setActive(isExpanded ? null : p.id); }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {/* Icon */}
                <div style={{ width:44, height:44, borderRadius:12, background: isPast ? p.color+"22" : isActive ? p.color+"18" : c.badgeBg, border:`1px solid ${isActive||isPast ? p.color+"44" : c.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {isPast
                    ? <Icon name="check" size={20} color={p.color} />
                    : isFuture
                      ? <Icon name="lock" size={17} color={c.textMuted} />
                      : <Icon name="bolt" size={20} color={p.color} />
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{p.title}</div>
                  <div style={{ fontSize:11, color:c.textSecondary, marginTop:1 }}>{p.weeks} · Goal: {p.goal}</div>
                  {/* Progress bar for active stage */}
                  {isActive && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:4, background:c.badgeBg, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${progressPct}%`, background:p.color, borderRadius:2, transition:"width 0.6s ease" }} />
                      </div>
                      <div style={{ fontSize:9, color:p.color, fontWeight:600, marginTop:3 }}>{progressPct}% complete</div>
                    </div>
                  )}
                </div>
                {isActive && <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:p.color, background:p.color+"18", padding:"3px 8px", borderRadius:10, letterSpacing:1, flexShrink:0 }}>ACTIVE</span>}
                {isFuture && <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.textMuted, background:c.badgeBg, padding:"3px 8px", borderRadius:10, letterSpacing:1, flexShrink:0 }}>LOCKED</span>}
                {!isFuture && <div style={{ transform:isExpanded?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}><Icon name="chevron" size={17} color={c.textSecondary} /></div>}
              </div>

              {isExpanded && (
                <div className="fade-in-fast" style={{ marginTop:16, borderTop:`1px solid ${c.cardBorder}`, paddingTop:16 }}>
                  <p style={{ fontSize:13, color:c.textSecondary, lineHeight:1.65, marginBottom:14 }}>{p.description}</p>
                  {p.exercises.map((ex,i)=>(
                    <div key={i} style={{ background:c.surfaceAlt, borderRadius:10, padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>{ex.name}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        {[["Sets",ex.sets],["Reps/Time",ex.reps],["Rest",ex.rest],["Intensity",ex.intensity]].map(([k,v])=>(
                          <div key={k}>
                            <div style={{ fontSize:9, color:c.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:2 }}>{k}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:p.color }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PROFILE / SETTINGS SCREEN ─────────────────────────────────────────────────
function ProfileScreen({ stage, weeksInStage, setStage, setWeeksInStage, settings, setSettings, sessionHistory, painLog, streak, isDark, setIsDark }) {
  const c = useTheme();
  const [settingsOpen, setSettingsOpen]     = useState(null); // "workout" | "notifications" | "medical" | "equipment"
  const [localSettings, setLocalSettings]   = useState(settings);
  const [notifs, setNotifs]                 = useState(true);
  const [morning, setMorning]               = useState(true);

  const stageLabels = { A:"Isometric Loading", B:"Heavy Slow Resistance", C:"Plyometric Phase", M:"Maintenance" };
  const collagenDays = painLog.length;
  const saveSettings = () => { setSettings(localSettings); setSettingsOpen(null); };

  const settingRows = [
    { id:"notifications", icon:"bell",       label:"Notification Preferences" },
    { id:"medical",       icon:"warn",        label:"Medical Disclaimer" },
    { id:"equipment",     icon:"workout",     label:"Weight & Equipment" },
  ];

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>

      {/* Avatar + name */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, paddingBottom:24 }}>
        <div style={{ width:88, height:88, borderRadius:"50%", background:`linear-gradient(135deg,${c.green}33,${c.blue}22)`, border:`3px solid ${c.green}55`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, overflow:"hidden" }}>
          <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:c.green }}>AS</div>
        </div>
        <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>Adam Simon</div>
        <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:2, color:c.green }}>PHASE: {stageLabels[stage]?.toUpperCase()}</div>
      </div>

      {/* Streak card */}
      <div className="card" style={{ background:c.streakBg, border:`1px solid ${c.green}33`, marginBottom:12, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:-20, right:-10, opacity:0.06 }}><Icon name="fire" size={100} color={c.green} /></div>
        <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:c.green, marginBottom:6 }}>DAILY STREAK</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:28, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:c.streakText, lineHeight:1.1 }}>{streak}-Day Streak<br/>Active</div>
          <div style={{ width:44, height:44, borderRadius:"50%", background:c.green, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="bolt" size={22} color="#000" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        {[{ label:"WORKOUTS", value:sessionHistory.length, color:c.textPrimary },
          { label:"COLLAGEN DAYS", value:collagenDays, color:c.textPrimary }].map((s,i)=>(
          <div key={i} className="card" style={{ margin:0, padding:"14px 16px" }}>
            <div style={{ fontSize:9, color:c.textSecondary, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:s.color, lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recovery Stage */}
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:12 }}>Recovery Stage</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {["A","B","C","M"].map(s=>(
            <button key={s} onClick={()=>setStage(s)} style={{ padding:"11px 0", borderRadius:10, border:`1px solid ${stage===s?c.green:c.cardBorder}`, background:stage===s?c.green+"15":c.surfaceAlt, color:stage===s?c.green:c.textSecondary, fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", transition:"all 0.2s" }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${c.cardBorder}` }}>
          <span style={{ fontSize:13, color:c.textSecondary }}>Weeks in current stage</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setWeeksInStage(w=>Math.max(1,w-1))} style={{ width:28, height:28, borderRadius:6, background:c.badgeBg, border:`1px solid ${c.surfaceBorder}`, color:c.textPrimary, fontSize:16, cursor:"pointer" }}>−</button>
            <span style={{ fontSize:18, fontWeight:700, fontFamily:"'Outfit',sans-serif", minWidth:24, textAlign:"center" }}>{weeksInStage}</span>
            <button onClick={()=>setWeeksInStage(w=>w+1)} style={{ width:28, height:28, borderRadius:6, background:c.badgeBg, border:`1px solid ${c.surfaceBorder}`, color:c.textPrimary, fontSize:16, cursor:"pointer" }}>+</button>
          </div>
        </div>
      </div>

      {/* Workout settings (inline) */}
      <div className="card" style={{ marginBottom:12 }}>
        <div onClick={()=>setSettingsOpen(settingsOpen==="workout"?null:"workout")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:settingsOpen==="workout"?16:0, cursor:"pointer" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Icon name="workout" size={18} color={c.textSecondary} />
            <span style={{ fontSize:14, fontWeight:600 }}>Workout Settings</span>
          </div>
          <div style={{ transform:settingsOpen==="workout"?"rotate(180deg)":"none", transition:"transform 0.2s" }}>
            <Icon name="chevron" size={16} color={c.textSecondary} />
          </div>
        </div>
        {settingsOpen === "workout" && (
          <div className="fade-in-fast" style={{ marginTop:16 }}>
            {[{ label:"Hold Duration", key:"holdSecs", min:20, max:120, step:5, unit:"s" },
              { label:"Rest Duration", key:"restSecs", min:30, max:180, step:5, unit:"s" },
              { label:"Sets per Exercise", key:"totalSets", min:2, max:8, step:1, unit:"sets" }].map(s=>(
              <div key={s.key} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{s.label}</span>
                  <span style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.blue }}>{localSettings[s.key]}{s.unit}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={localSettings[s.key]}
                  onChange={e=>setLocalSettings(p=>({...p,[s.key]:parseInt(e.target.value)}))}
                  style={{ width:"100%" }} />
              </div>
            ))}
            <button onClick={saveSettings} style={{ width:"100%", background:c.green, color:"#000", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>Save Settings</button>
          </div>
        )}
      </div>

      {/* Settings list rows */}
      <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:c.textSecondary, marginBottom:8, paddingLeft:4 }}>SETTINGS</div>
      <div className="card" style={{ padding:0, overflow:"hidden", marginBottom:12 }}>

        {/* Notification Preferences */}
        <div onClick={()=>setSettingsOpen(settingsOpen==="notifications"?null:"notifications")} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderBottom:`1px solid ${c.cardBorder}`, cursor:"pointer" }}>
          <Icon name="bell" size={18} color={c.textSecondary} />
          <span style={{ flex:1, fontSize:14, fontWeight:500 }}>Notification Preferences</span>
          <Icon name="chevron" size={14} color={c.textSecondary} />
        </div>
        {settingsOpen === "notifications" && (
          <div className="fade-in-fast" style={{ padding:"12px 16px", borderBottom:`1px solid ${c.cardBorder}`, background:c.surfaceAlt }}>
            {[{ label:"Daily Reminders", sub:"Session reminders", value:notifs, set:setNotifs },
              { label:"Morning Check-In", sub:"8:00 AM reminder", value:morning, set:setMorning }].map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:i<1?`1px solid ${c.cardBorder}`:"none" }}>
                <div><div style={{ fontSize:13, fontWeight:500 }}>{s.label}</div><div style={{ fontSize:11, color:c.textSecondary }}>{s.sub}</div></div>
                <div onClick={()=>s.set(v=>!v)} style={{ width:42, height:24, borderRadius:12, background:s.value?c.green:c.badgeBg, border:`1px solid ${s.value?c.green:c.cardBorder}`, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:s.value?20:2, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Medical Disclaimer */}
        <div onClick={()=>setSettingsOpen(settingsOpen==="medical"?null:"medical")} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderBottom:`1px solid ${c.cardBorder}`, cursor:"pointer" }}>
          <Icon name="warn" size={18} color={c.textSecondary} />
          <span style={{ flex:1, fontSize:14, fontWeight:500 }}>Medical Disclaimer</span>
          <Icon name="chevron" size={14} color={c.textSecondary} />
        </div>
        {settingsOpen === "medical" && (
          <div className="fade-in-fast" style={{ padding:"14px 16px", borderBottom:`1px solid ${c.cardBorder}`, background:c.surfaceAlt }}>
            <p style={{ fontSize:12, color:c.textSecondary, lineHeight:1.7, margin:0 }}>
              This app is for informational purposes only and does not constitute medical advice. If your tendon pain has persisted for many months or years, you may be in the degenerative phase of the injury. At this stage, corrective exercises alone may not be enough — consult a doctor or sports physical therapist for hands-on guidance before proceeding.
            </p>
          </div>
        )}

        {/* Weight & Equipment */}
        <div onClick={()=>setSettingsOpen(settingsOpen==="equipment"?null:"equipment")} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
          <Icon name="workout" size={18} color={c.textSecondary} />
          <span style={{ flex:1, fontSize:14, fontWeight:500 }}>Weight &amp; Equipment</span>
          <Icon name="chevron" size={14} color={c.textSecondary} />
        </div>
        {settingsOpen === "equipment" && (
          <div className="fade-in-fast" style={{ padding:"14px 16px", background:c.surfaceAlt }}>
            <p style={{ fontSize:12, color:c.textSecondary, lineHeight:1.7, margin:0 }}>
              Use a resistance band or wall for Spanish Squats. For weighted exercises, start at bodyweight and add 2–5kg each week as tolerated. A decline board (15–25°) improves tendon isolation for heel drops.
            </p>
          </div>
        )}
      </div>

      {/* Theme toggle row */}
      <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:c.textSecondary, marginBottom:8, paddingLeft:4 }}>APPEARANCE</div>
      <div className="card" style={{ padding:"14px 16px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Icon name={isDark?"moon":"sun"} size={18} color={c.textSecondary} />
            <span style={{ fontSize:14, fontWeight:500 }}>Theme</span>
          </div>
          <div style={{ display:"flex", background:c.badgeBg, borderRadius:20, padding:3, border:`1px solid ${c.cardBorder}` }}>
            {["DARK","LIGHT"].map(t=>(
              <button key={t} onClick={()=>setIsDark(t==="DARK")} style={{ padding:"5px 14px", borderRadius:16, border:"none", background:(t==="DARK"&&isDark)||(t==="LIGHT"&&!isDark)?c.green:"transparent", color:(t==="DARK"&&isDark)||(t==="LIGHT"&&!isDark)?"#000":c.textSecondary, fontSize:11, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer", transition:"all 0.2s" }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button style={{ width:"100%", background:c.red+"12", border:`1.5px solid ${c.red}44`, borderRadius:14, padding:"15px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c.red, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <Icon name="exit" size={16} color={c.red} />
        Sign Out
      </button>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]       = useState("today");
  const [workoutActive, setWorkoutActive] = useState(false);
  const [isDark, setIsDark]             = useLocalStorage("ryk_darkMode", true);

  const c = isDark ? THEMES.dark : THEMES.light;
  // Keep module-level alias in sync so any stray references still work
  colors = c;

  // ── Persisted state ──
  const [painLog, setPainLog]           = useLocalStorage("ryk_painLog", []);
  const [sessionHistory, setSessionHistory] = useLocalStorage("ryk_sessions", []);
  const [stage, setStage]               = useLocalStorage("ryk_stage", "A");
  const [weeksInStage, setWeeksInStage] = useLocalStorage("ryk_weeks", 1);
  const [settings, setSettings]         = useLocalStorage("ryk_settings", DEFAULT_SETTINGS);
  const [intensity, setIntensity]       = useLocalStorage("ryk_intensity", 70);
  const [appStartDate]                  = useLocalStorage("ryk_startDate", new Date().toISOString());
  const [stageStartDate, setStageStartDate] = useLocalStorage("ryk_stageStart", new Date().toISOString());

  const streak       = calcStreak(sessionHistory, painLog);
  const weeksElapsed = Math.max(1, Math.floor((Date.now() - new Date(stageStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
  const avgPain      = painLog.length
    ? parseFloat((painLog.slice(-7).reduce((a,b) => a + b.value, 0) / Math.min(painLog.length, 7)).toFixed(1))
    : 0;

  // ── Full-screen warning state ──
  const recentPainVals = painLog.slice(-3).map(p => p.value);
  const painSpikeDetected = recentPainVals.length === 3
    && recentPainVals.every((v,i) => i===0 || v >= recentPainVals[i-1])
    && recentPainVals[2] > recentPainVals[0];
  const painIncrease = painSpikeDetected ? recentPainVals[2] - recentPainVals[0] : 0;
  const [warningDismissed, setWarningDismissed] = useLocalStorage("ryk_warnDismissed", "");
  const todayWarnKey = new Date().toLocaleDateString("en-GB");
  const showWarningScreen = painSpikeDetected && warningDismissed !== todayWarnKey;

  const handleAdjustIntensity = () => {
    setIntensity(prev => Math.max(40, Math.round(prev * 0.85)));
    setWarningDismissed(todayWarnKey);
  };
  const handleKeepPlan = () => setWarningDismissed(todayWarnKey);

  const handleSessionComplete = (session) => {
    setSessionHistory(prev => [...prev, { ...session, id: prev.length + 1 }]);
    setIntensity(session.intensity);
    setWorkoutActive(false);
  };
  const handleAdvanceStage = (newStage) => {
    setStage(newStage); setWeeksInStage(1);
    setStageStartDate(new Date().toISOString()); setActiveTab("protocols");
  };
  const handleSetStage = (s) => { setStage(s); setStageStartDate(new Date().toISOString()); };
  const handleExport   = () => exportCSV(painLog, sessionHistory);

  const tabs = [
    { id:"today",     label:"TODAY",     icon:"today"     },
    { id:"trends",    label:"TRENDS",    icon:"trends"    },
    { id:"protocols", label:"PROTOCOLS", icon:"protocols" },
    { id:"profile",   label:"PROFILE",   icon:"profile"   },
  ];

  return (
    <ThemeContext.Provider value={c}>
      <style>{makeStyles(c)}</style>
      <div style={{ maxWidth:420, margin:"0 auto", minHeight:"100vh", background:c.bg, display:"flex", flexDirection:"column", transition:"background 0.3s ease" }}>

        <div style={{ padding:"52px 20px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:4, color:c.textPrimary }}>REBUILD YOUR KNEE</div>
          <button onClick={() => setIsDark(d => !d)} style={{ width:36, height:36, borderRadius:10, background:c.card, border:`1px solid ${c.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s" }}>
            <Icon name={isDark ? "sun" : "moon"} size={17} color={c.textSecondary} />
          </button>
        </div>

        <div style={{ flex:1, overflow:"hidden" }}>
          {activeTab==="today"     && <TodayScreen painLog={painLog} setPainLog={setPainLog} sessionHistory={sessionHistory} streak={streak} onStartWorkout={()=>setWorkoutActive(true)} settings={settings} stage={stage} />}
          {activeTab==="trends"    && <TrendsScreen painLog={painLog} sessionHistory={sessionHistory} onExport={handleExport} />}
          {activeTab==="protocols" && <ProtocolsScreen stage={stage} weeksInStage={weeksElapsed} avgPain={avgPain} onAdvanceStage={handleAdvanceStage} />}
          {activeTab==="profile"   && <ProfileScreen stage={stage} weeksInStage={weeksElapsed} setStage={handleSetStage} setWeeksInStage={setWeeksInStage} settings={settings} setSettings={setSettings} sessionHistory={sessionHistory} painLog={painLog} streak={streak} isDark={isDark} setIsDark={setIsDark} />}
        </div>

        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:c.navBg, borderTop:`1px solid ${c.cardBorder}`, display:"flex", zIndex:100, transition:"background 0.3s ease" }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1, padding:"12px 0 11px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <Icon name={t.icon} size={21} color={active ? c.green : c.textSecondary} />
                <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, color:active ? c.green : c.textSecondary }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-screen pain spike WARNING */}
      {showWarningScreen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"#0d0000", display:"flex", flexDirection:"column", maxWidth:420, margin:"0 auto", overflowY:"auto" }}>
          {/* Back arrow */}
          <div style={{ padding:"52px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={handleKeepPlan} style={{ width:36, height:36, borderRadius:10, background:"#1a0000", border:"1px solid #3a0000", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <Icon name="arrow" size={18} color="#888" style={{ transform:"rotate(180deg)" }} />
            </button>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:4, color:"#888" }}>REBUILD YOUR KNEE</div>
          </div>

          {/* WARNING headline */}
          <div style={{ padding:"32px 24px 0", textAlign:"center" }}>
            <div style={{ fontSize:52, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:"#ff2222", letterSpacing:-1, lineHeight:1, marginBottom:16 }}>WARNING</div>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:4, color:"#ff6644", marginBottom:20 }}>TENDON FATIGUE DETECTED</div>
            <p style={{ fontSize:14, color:"#c0a0a0", lineHeight:1.65, maxWidth:320, margin:"0 auto 28px" }}>
              Your 24-hour pain score increased by{" "}
              <span style={{ color:"#ff4444", fontWeight:800 }}>{painIncrease} POINT{painIncrease!==1?"S":""}</span>.{" "}
              This indicates the previous load was too high for current tendon capacity.
            </p>
          </div>

          {/* Recovery plan card with image */}
          <div style={{ margin:"0 20px 24px", background:"#1a0800", border:"1px solid #3a1500", borderRadius:16, overflow:"hidden" }}>
            {/* Grayscale image placeholder — man stretching */}
            <div style={{ height:160, background:"linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:64, opacity:0.15 }}>🧎</div>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 60%,#1a0800 100%)" }} />
            </div>
            <div style={{ padding:"16px" }}>
              <div style={{ fontSize:10, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:3, color:"#ff8844", marginBottom:6 }}>TODAY'S ADJUSTMENT</div>
              <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:4, color:"#f2f2f2" }}>Active Recovery Plan</div>
              <div style={{ fontSize:13, color:"#a08080", marginBottom:14 }}>2 sets of 30s light wall sits</div>
              <div style={{ background:"#0d0000", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:2, color:"#ff6644", marginBottom:6 }}>INFO</div>
                <p style={{ fontSize:12, color:"#a08080", lineHeight:1.65, margin:0 }}>
                  Based on Collagen Blueprint's reactive loading model. Reducing intensity allows for cellular reorganization and matrix repair.
                </p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ padding:"0 20px 52px", display:"flex", flexDirection:"column", gap:12 }}>
            <button onClick={handleAdjustIntensity} style={{ width:"100%", background:"#B2FF00", color:"#000", border:"none", borderRadius:50, padding:"18px", fontSize:15, fontWeight:900, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              ADJUST NEXT WORKOUT (−15%)
              <Icon name="trends" size={18} color="#000" />
            </button>
            <button onClick={handleKeepPlan} style={{ width:"100%", background:"#1a0800", border:"1px solid #3a1500", borderRadius:50, padding:"17px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:"#a08080", cursor:"pointer" }}>
              KEEP CURRENT PLAN ANYWAY
            </button>
          </div>
        </div>
      )}

      {workoutActive && (
        <WorkoutScreen
          onExit={() => setWorkoutActive(false)}
          onComplete={handleSessionComplete}
          settings={settings}
          intensity={intensity}
          stage={stage}
        />
      )}
    </ThemeContext.Provider>
  );
}

// ── useLocalStorage hook ──────────────────────────────────────────────────────
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setStored = useCallback((newValue) => {
    setValue(prev => {
      const next = typeof newValue === "function" ? newValue(prev) : newValue;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, setStored];
}

// ── Streak calculator ─────────────────────────────────────────────────────────
function calcStreak(sessionHistory, painLog) {
  const activeDates = new Set();
  sessionHistory.forEach(s => { if (s.date) activeDates.add(s.date); });
  painLog.forEach(p => { if (p.restDay && p.date) activeDates.add(p.date); });
  if (activeDates.size === 0) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const fullLabel = d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    if (activeDates.has(fullLabel)) { streak++; }
    else if (i === 0) { continue; }
    else { break; }
  }
  return streak;
}