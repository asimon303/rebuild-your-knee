import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const WORKOUT_EXERCISES = [
  { name: "Wall Squats",          cue: "Back flat, knees at 90°, breathe steady" },
  { name: "Calf Raises",          cue: "Slow and controlled, full range of motion" },
  { name: "Leg Press Hold",       cue: "Press through your heel, engage the quad" },
  { name: "Spanish Squat",        cue: "Knees out, torso upright, hold the tension" },
  { name: "Eccentric Heel Drops", cue: "Lower slowly over 3 seconds, control the descent" },
];

const STAGE_CRITERIA = {
  A: { minWeeks: 4, maxAvgPain: 3, nextStage: "B" },
  B: { minWeeks: 4, maxAvgPain: 3, nextStage: "C" },
  C: { minWeeks: 4, maxAvgPain: 3, nextStage: "M" },
  M: { minWeeks: 999, maxAvgPain: 10, nextStage: null },
};

const DEFAULT_SETTINGS = { holdSecs: 45, restSecs: 60, totalSets: 4 };

const colors = {
  bg: "#0a0a0a", card: "#141414", cardBorder: "#222",
  green: "#B2FF00", blue: "#3b82f6", yellow: "#eab308",
  red: "#ef4444", orange: "#f97316", purple: "#a855f7",
  textPrimary: "#f2f2f2", textSecondary: "#777", textMuted: "#3a3a3a",
  navBg: "#0d0d0d",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Geist:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${colors.bg}; font-family: 'Geist', sans-serif; color: ${colors.textPrimary}; }
  :root { color-scheme: dark; }
  /* Outfit for all bold/display text — geometric like Futura Bold */
  button { font-family: 'Outfit', sans-serif !important; }
  .outfit { font-family: 'Outfit', sans-serif; }
  input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
  input[type=range]::-webkit-slider-track { height: 4px; background: #2a2a2a; border-radius: 2px; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%; background: ${colors.blue}; margin-top: -7px; }
  textarea { font-family: 'Geist', sans-serif; resize: none; outline: none; }
  .scroll-area { overflow-y: auto; scrollbar-width: none; }
  .scroll-area::-webkit-scrollbar { display: none; }
  @keyframes fadeIn       { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeInFast   { from { opacity:0; transform:translateY(4px);  } to { opacity:1; transform:translateY(0); } }
  @keyframes slideInRight { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
  @keyframes pulse        { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.35); } 50% { box-shadow:0 0 0 14px rgba(34,197,94,0); } }
  @keyframes completePop  { 0% { transform:scale(0.75); opacity:0; } 65% { transform:scale(1.06); } 100% { transform:scale(1); opacity:1; } }
  @keyframes slideUp      { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fade-in        { animation: fadeIn 0.35s ease forwards; }
  .fade-in-fast   { animation: fadeInFast 0.2s ease forwards; }
  .slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
  .pulse-green    { animation: pulse 2s infinite; }
  .complete-pop   { animation: completePop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .slide-up       { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
  .card { background:${colors.card}; border:1px solid ${colors.cardBorder}; border-radius:18px; padding:20px; margin-bottom:12px; }
  .mono { font-family:'JetBrains Mono',monospace; }
  .outfit { font-family:'Outfit',sans-serif; }
  button { font-family:'Outfit',sans-serif; }
  h1,h2,h3 { font-family:'Outfit',sans-serif; }
  .btn-primary { background:${colors.green}; color:#000; border:none; border-radius:14px; padding:15px 36px; font-size:15px; font-weight:700; cursor:pointer; letter-spacing:0.3px; display:inline-flex; align-items:center; gap:10px; transition:opacity 0.15s; }
  .btn-primary:active { opacity:0.8; }
  .btn-icon { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:12px; padding:12px 14px; cursor:pointer; display:inline-flex; align-items:center; }
`;

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
  };
  return map[name] || null;
};

// ── Custom Pain Slider ────────────────────────────────────────────────────────
function PainSlider({ value, onChange }) {
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
        <div style={{ position:"absolute", left:`calc(${pct}% - 14px)`, width:28, height:28, borderRadius:"50%", background:"#fff", border:"3px solid #0a0a0a", boxShadow:`0 0 0 2px ${thumbColor},0 4px 12px rgba(0,0,0,0.7)`, transition:"box-shadow 0.15s ease", cursor:"grab", zIndex:2 }} />
      </div>
    </div>
  );
}

// ── Circular Timer ────────────────────────────────────────────────────────────
function CircularTimer({ seconds, total, label, color = colors.green }) {
  const r = 68, circ = 2 * Math.PI * r;
  const offset = circ * (1 - seconds / total);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <div style={{ display:"flex", justifyContent:"center", margin:"10px 0" }}>
      <svg width="166" height="166" viewBox="0 0 166 166">
        <circle cx="83" cy="83" r={r} fill="none" stroke="#1a1a1a" strokeWidth="7" />
        <circle cx="83" cy="83" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 83 83)" style={{ transition:"stroke-dashoffset 0.6s ease" }} />
        <text x="83" y="77" textAnchor="middle" fill={colors.textPrimary} fontFamily="'JetBrains Mono',monospace" fontSize="28" fontWeight="700">{mins}:{secs}</text>
        <text x="83" y="98" textAnchor="middle" fill={color} fontFamily="'Geist',sans-serif" fontSize="11" fontWeight="600" letterSpacing="3">{label}</text>
      </svg>
    </div>
  );
}

// ── Charts ────────────────────────────────────────────────────────────────────
function BarChart({ data, color = colors.green }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:64 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", borderRadius:4, height:`${(d.value/max)*52}px`, background:d.highlight?color:"#1e1e1e", border:`1px solid ${d.highlight?color:"#2a2a2a"}`, transition:"height 0.4s ease", minHeight:4 }} />
          <span style={{ fontSize:9, color:colors.textMuted, fontWeight:500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color = colors.green, height = 52 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data)||1, min = Math.min(...data);
  const w = 280, h = height;
  const pts = data.map((v,i) => { const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*(h-12)-6; return `${x},${y}`; }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v,i) => { const x=(i/(data.length-1))*w; const y=h-((v-min)/(max-min||1))*(h-12)-6; return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />; })}
    </svg>
  );
}

// ── WORKOUT SCREEN ────────────────────────────────────────────────────────────
function WorkoutScreen({ onExit, onComplete, settings, intensity: initIntensity }) {
  const { holdSecs, restSecs, totalSets } = settings;
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
  const ringColor    = isHold ? colors.green : isRest ? colors.blue : colors.green;
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

  const handleStart    = () => { setPhase("hold"); setTimeLeft(holdSecs); setIsRunning(true); };
  const handlePause    = () => setIsRunning(r => !r);
  const handleResetSet = () => { clearInterval(timerRef.current); setIsRunning(false); setPhase("idle"); setTimeLeft(holdSecs); };
  const handleNextEx   = () => {
    if (isLastEx) { setPhase("sessionDone"); }
    else { setExIdx(i=>i+1); setCompletedSets(0); setPhase("idle"); setTimeLeft(holdSecs); setIsRunning(false); }
  };
  const handleFinish = () => {
    const elapsed = Math.round((Date.now()-sessionStartTime)/60000);
    onComplete({ date: new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}), exercises: WORKOUT_EXERCISES.length, totalSets: WORKOUT_EXERCISES.length * totalSets, intensity, duration: elapsed, notes: sessionNote });
  };

  // ── Session Complete ──
  if (isSessionDone) {
    const elapsed = Math.round((Date.now()-sessionStartTime)/60000);
    return (
      <div className="fade-in" style={{ position:"fixed", inset:0, background:colors.bg, zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", overflowY:"auto" }}>
        <div className="complete-pop" style={{ width:80, height:80, borderRadius:"50%", background:colors.green+"18", border:`2px solid ${colors.green}44`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
          <Icon name="bolt" size={36} color={colors.green} />
        </div>
        <div style={{ fontSize:30, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>Session Complete</div>
        <div style={{ fontSize:14, color:colors.textSecondary, marginBottom:28 }}>Great work. Tendons loaded. 💪</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, width:"100%", maxWidth:360, marginBottom:24 }}>
          {[{ label:"EXERCISES", value:WORKOUT_EXERCISES.length, unit:"done" }, { label:"TOTAL SETS", value:WORKOUT_EXERCISES.length*totalSets, unit:"sets" }, { label:"DURATION", value:`~${elapsed}`, unit:"mins" }].map((s,i) => (
            <div key={i} style={{ background:colors.card, border:`1px solid ${colors.cardBorder}`, borderRadius:14, padding:"13px 8px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:4 }}>{s.label}</div>
              <div className="mono" style={{ fontSize:20, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.green }}>{s.value}</div>
              <div style={{ fontSize:10, color:colors.textMuted, marginTop:1 }}>{s.unit}</div>
            </div>
          ))}
        </div>

        {/* Session note */}
        <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
          <div style={{ fontSize:12, color:colors.textSecondary, fontWeight:600, marginBottom:8, letterSpacing:0.5 }}>SESSION NOTES (optional)</div>
          <textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="How did it feel? Any tightness, wins, observations…" rows={3}
            style={{ width:"100%", background:"#141414", border:`1px solid ${colors.cardBorder}`, borderRadius:12, padding:"12px 14px", fontSize:13, color:colors.textPrimary, lineHeight:1.5 }} />
        </div>

        <div style={{ width:"100%", maxWidth:360, marginBottom:24 }}>
          {WORKOUT_EXERCISES.map((ex,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<WORKOUT_EXERCISES.length-1?`1px solid ${colors.cardBorder}`:"none" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:colors.green+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name="check" size={12} color={colors.green} />
              </div>
              <span style={{ fontSize:14, fontWeight:500 }}>{ex.name}</span>
              <span style={{ marginLeft:"auto", fontSize:12, color:colors.textSecondary }}>{totalSets} sets</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={handleFinish} style={{ width:"100%", maxWidth:360, justifyContent:"center" }}>
          Save & Return
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
              <span style={{ color:colors.green }}>{holdHeadlines[headlineIdx].split(" ").slice(0,-1).join(" ")} </span>
              <span style={{ color:colors.green, fontStyle:"italic" }}>{holdHeadlines[headlineIdx].split(" ").slice(-1)[0]}</span>
            </div>
          )}
          {isRest && (
            <div style={{ fontSize:26, fontWeight:900, fontFamily:"'Outfit',sans-serif", letterSpacing:-0.5, color:colors.blue }}>{restHeadlines[headlineIdx]}</div>
          )}
          {isExDone && (
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Outfit',sans-serif", color:colors.green }}>EXERCISE DONE 🔥</div>
          )}
        </div>

        {/* Exercise label */}
        <div style={{ fontSize:10, color:colors.textSecondary, fontWeight:600, letterSpacing:2, marginBottom:4 }}>EXERCISE {exIdx+1} OF {WORKOUT_EXERCISES.length}</div>
        <div key={exIdx} className="slide-in-right" style={{ fontSize:24, fontWeight:800, fontFamily:"'Outfit',sans-serif", lineHeight:1.1, marginBottom:14 }}>{exercise.name}</div>

        {/* Progress segments */}
        <div style={{ display:"flex", gap:6 }}>
          {WORKOUT_EXERCISES.map((_,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<exIdx?colors.green:i===exIdx?(isExDone?colors.green:colors.green+"55"):"#222", transition:"background 0.4s ease" }} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
        {isExDone ? (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", width:"100%" }}>
            <div className="complete-pop" style={{ width:90, height:90, borderRadius:"50%", background:colors.green+"18", border:`2px solid ${colors.green}55`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, boxShadow:`0 0 40px ${colors.green}33` }}>
              <Icon name="check" size={40} color={colors.green} />
            </div>
            <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>{exercise.name}</div>
            <div style={{ fontSize:13, color:colors.green, fontWeight:600, marginBottom:24, letterSpacing:1 }}>{totalSets} SETS COMPLETE</div>
            {!isLastEx && (
              <div style={{ background:"#111", border:`1px solid #222`, borderRadius:16, padding:"14px 20px", marginBottom:24, width:"100%", maxWidth:320 }}>
                <div style={{ fontSize:10, color:colors.textSecondary, fontWeight:600, letterSpacing:2, marginBottom:5 }}>NEXT UP</div>
                <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{WORKOUT_EXERCISES[exIdx+1].name}</div>
                <div style={{ fontSize:12, color:colors.textSecondary, marginTop:3 }}>{WORKOUT_EXERCISES[exIdx+1].cue}</div>
              </div>
            )}
            <button onClick={handleNextEx} style={{ width:"100%", maxWidth:340, background:colors.green, color:"#000", border:"none", borderRadius:50, padding:"17px", fontSize:16, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {isLastEx ? "Finish Session" : `Start ${WORKOUT_EXERCISES[exIdx+1].name}`}
              <Icon name="arrow" size={18} color="#000" />
            </button>
          </div>
        ) : (
          <>
            {/* Set tiles — solid fill when done */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:10, color:colors.textSecondary, fontWeight:600, letterSpacing:2.5, marginBottom:12 }}>SETS COMPLETED</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                {Array.from({ length: totalSets }).map((_,i) => {
                  const done   = i < completedSets;
                  const active = (isHold||isRest) && i===completedSets;
                  return (
                    <div key={i} style={{
                      width:58, height:58, borderRadius:16,
                      background: done ? colors.green : active ? ringColor+"18" : "#111",
                      border: `1.5px solid ${done ? colors.green : active ? ringColor : "#2a2a2a"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all 0.35s ease",
                      boxShadow: done ? `0 0 16px ${colors.green}44` : active ? `0 0 12px ${ringColor}33` : "none",
                    }}>
                      <span className="mono" style={{ fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", color: done ? "#000" : active ? ringColor : colors.textSecondary }}>
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
                <span className="mono" style={{ fontSize:52, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:isIdle?"#2a2a2a":colors.textPrimary, lineHeight:1, transition:"color 0.3s", letterSpacing:-1 }}>{mins}:{secs}</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:isIdle?"#2a2a2a":ringColor, letterSpacing:4, transition:"color 0.3s" }}>
                  {isIdle?"READY":isHold?"HOLD":"REST"}
                </span>
              </div>
            </div>

            {/* Cue text */}
            <div style={{ fontSize:13, color:colors.textSecondary, textAlign:"center", marginBottom:24, padding:"0 20px", lineHeight:1.55 }}>
              {isIdle ? `Set ${completedSets+1} of ${totalSets} — ${exercise.cue}`
                      : isHold ? `Set ${completedSets+1} of ${totalSets} — hold it steady`
                                : `Recover · Set ${completedSets+1} of ${totalSets} coming up`}
            </div>

            {/* Action button — full-width pill */}
            {isIdle && (
              <button onClick={handleStart} style={{ width:"100%", maxWidth:340, background:colors.green, color:"#000", border:"none", borderRadius:50, padding:"17px", fontSize:16, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 0 24px ${colors.green}44` }}>
                <Icon name="play" size={17} color="#000" />
                {completedSets===0 ? "Start Hold" : `Start Set ${completedSets+1}`}
              </button>
            )}
            {isHold && (
              <div style={{ width:"100%", maxWidth:340, display:"flex", gap:10 }}>
                <button onClick={handlePause} style={{ flex:1, background:isRunning?"#111":colors.green, color:isRunning?colors.textSecondary:"#000", border:`1.5px solid ${isRunning?"#333":colors.green}`, borderRadius:50, padding:"16px", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" }}>
                  <Icon name={isRunning?"pause":"play"} size={16} color={isRunning?colors.textSecondary:"#000"} />
                  {isRunning?"PAUSE":"RESUME"}
                </button>
                <button onClick={handleResetSet} style={{ background:"#111", border:"1.5px solid #333", borderRadius:50, padding:"16px 18px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <Icon name="reset" size={17} color={colors.textSecondary} />
                </button>
              </div>
            )}
            {isRest && (
              <button disabled style={{ width:"100%", maxWidth:340, background:colors.blue+"22", color:colors.blue, border:`1.5px solid ${colors.blue}55`, borderRadius:50, padding:"17px", fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"default", letterSpacing:0.5 }}>
                Resting...
              </button>
            )}
          </>
        )}
      </div>

      {/* End Workout */}
      <div style={{ padding:"0 24px 40px", flexShrink:0 }}>
        {showExit ? (
          <div className="fade-in-fast" style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:18, padding:"18px", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:3 }}>End this workout?</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:16 }}>Your progress won't be saved</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowExit(false)} style={{ flex:1, background:"#1a1a1a", border:"1px solid #333", borderRadius:50, padding:"12px", fontSize:14, fontWeight:600, color:colors.textSecondary, cursor:"pointer" }}>Keep Going</button>
              <button onClick={onExit} style={{ flex:1, background:colors.red+"15", border:`1.5px solid ${colors.red}66`, borderRadius:50, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.red, cursor:"pointer" }}>End Workout</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowExit(true)} style={{ width:"100%", background:"transparent", border:`1.5px solid ${colors.red}66`, borderRadius:50, padding:"16px", fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.red, cursor:"pointer", letterSpacing:0.3 }}>
            End Workout
          </button>
        )}
      </div>
    </div>
  );
}

// ── TODAY SCREEN ──────────────────────────────────────────────────────────────
function TodayScreen({ painLog, setPainLog, sessionHistory, streak, onStartWorkout, settings, stage }) {
  const [painValue, setPainValue]   = useState(painLog[painLog.length-1]?.value ?? 2);
  const [checkedIn, setCheckedIn]   = useState(false);
  const [nutTimer, setNutTimer]     = useState(3600);
  const [nutRunning, setNutRunning] = useState(false);
  const [supplements, setSupplements] = useState([false,false]);
  const nutRef = useRef(null);
  const supps = ["15g Collagen Peptides","225mg Vitamin C"];

  useEffect(() => {
    if (nutRunning&&nutTimer>0) nutRef.current=setInterval(()=>setNutTimer(t=>t-1),1000);
    else clearInterval(nutRef.current);
    return ()=>clearInterval(nutRef.current);
  }, [nutRunning,nutTimer]);

  const painColor = painValue<=3?colors.green:painValue<=6?colors.yellow:colors.red;

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
    setPainLog([...painLog,{ value:painValue, label:lbl, date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) }].slice(-30));
  };

  const handleRestDay = () => {
    setPainLog([...painLog,{ value:painValue, label:"Rest", date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"}), restDay:true }].slice(-30));
    setCheckedIn(true);
  };

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>

      {/* Overload prompt */}
      {showOverload && (
        <div className="slide-up" style={{ background:"#1a1a0a", border:`1px solid ${colors.yellow}33`, borderRadius:14, padding:"14px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"flex-start" }}>
          <Icon name="up" size={18} color={colors.yellow} />
          <div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.yellow, marginBottom:2 }}>Ready to progress?</div>
            <div style={{ fontSize:12, color:colors.textSecondary, lineHeight:1.5 }}>4 sessions at {lastFour[0]?.intensity}% with no pain spike. Consider increasing intensity by 5–10%.</div>
          </div>
        </div>
      )}

      {/* Pain spike warning */}
      {painSpike && (
        <div className="slide-up" style={{ background:"#1a0a0a", border:`1px solid ${colors.red}33`, borderRadius:14, padding:"14px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"flex-start" }}>
          <Icon name="warn" size={18} color={colors.red} />
          <div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.red, marginBottom:2 }}>Pain trending up</div>
            <div style={{ fontSize:12, color:colors.textSecondary, lineHeight:1.5 }}>Your last 3 check-ins show increasing pain. Consider reducing intensity or taking a rest day.</div>
          </div>
        </div>
      )}

      {/* 24-HR Check-In */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"#1a1a1a", border:`1px solid ${colors.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="pain" size={17} color={painColor} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>24-HR Check-In</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginTop:1 }}>Morning baseline</div>
          </div>
        </div>
        <PainSlider value={painValue} onChange={setPainValue} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:800, fontFamily:"'Outfit',sans-serif", letterSpacing:0.5, marginBottom:14, marginTop:4 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}><span style={{ color:"#B2FF00" }}>NO PAIN</span><span style={{ color:colors.textSecondary, fontSize:12 }}>0</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center" }}><span style={{ color:"#ffb300" }}>MODERATE</span><span style={{ color:colors.textSecondary, fontSize:12 }}>5</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" }}><span style={{ color:"#e91e8c" }}>SEVERE</span><span style={{ color:colors.textSecondary, fontSize:12 }}>10</span></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0c0c0c", borderRadius:12, padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:checkedIn?colors.green:"#1e1e1e", border:`1px solid ${checkedIn?colors.green:"#2a2a2a"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s", flexShrink:0 }}>
              {checkedIn && <Icon name="check" size={13} color="#000" />}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:checkedIn?colors.textPrimary:colors.textSecondary, lineHeight:1.2 }}>
                {checkedIn ? `Logged — ${painValue<=3?"Low":painValue<=6?"Moderate":"Severe"} pain` : "Ready for today's protocol"}
              </div>
              {checkedIn && <div style={{ fontSize:11, color:colors.textSecondary, marginTop:1 }}>{painValue}/10</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, fontWeight:600, color:"#555", background:"#1a1a1a", padding:"4px 10px", borderRadius:20, letterSpacing:0.5 }}>STAGE: {stage}</span>
            {!checkedIn && (
              <button onClick={handleLogCheckIn} style={{ background:colors.green, color:"#000", border:"none", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>LOG</button>
            )}
          </div>
        </div>
        {/* Rest Day */}
        {!checkedIn && (
          <button onClick={handleRestDay} style={{ width:"100%", marginTop:10, background:"transparent", border:`1px solid #222`, borderRadius:10, padding:"10px", fontSize:12, fontWeight:600, color:colors.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            <Icon name="moon" size={14} color={colors.textSecondary} />
            Log as Rest Day
          </button>
        )}
      </div>

      {/* Pre-Workout Nutrition */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"#1a1a1a", border:`1px solid ${colors.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="nutrition" size={17} color={colors.green} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Pre-Workout Nutrition</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginTop:1 }}>60-min absorption window</div>
          </div>
        </div>
        <CircularTimer seconds={nutTimer} total={3600} label="PROTOCOL" color={colors.green} />
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:14 }}>
          <button onClick={()=>setNutRunning(r=>!r)} style={{ background:nutRunning?"#1a1a1a":colors.green, color:nutRunning?colors.textSecondary:"#000", border:`1px solid ${nutRunning?"#2a2a2a":colors.green}`, borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
            <Icon name={nutRunning?"pause":"play"} size={13} color={nutRunning?colors.textSecondary:"#000"} />
            {nutRunning?"PAUSE":"START"}
          </button>
          <button onClick={()=>{setNutTimer(3600);setNutRunning(false);}} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, padding:"9px 14px", cursor:"pointer", display:"flex", alignItems:"center" }}>
            <Icon name="reset" size={15} color={colors.textSecondary} />
          </button>
        </div>
        {supps.map((s,i)=>(
          <div key={i} onClick={()=>setSupplements(p=>p.map((v,j)=>j===i?!v:v))} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 13px", borderRadius:10, background:"#0e0e0e", border:`1px solid ${supplements[i]?colors.green+"33":"#1e1e1e"}`, marginBottom:8, cursor:"pointer", transition:"border-color 0.2s" }}>
            <div style={{ width:19, height:19, borderRadius:5, border:`1.5px solid ${supplements[i]?colors.green:"#333"}`, background:supplements[i]?colors.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 }}>
              {supplements[i]&&<Icon name="check" size={11} color="#000" />}
            </div>
            <span style={{ fontSize:13, fontWeight:500, color:colors.textSecondary, textDecoration:supplements[i]?"line-through":"none" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Today's Workout */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:colors.green+"18", border:`1px solid ${colors.green}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="workout" size={17} color={colors.green} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Today's Workout</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginTop:1 }}>{WORKOUT_EXERCISES.length} exercises · {settings.totalSets} × {settings.holdSecs}s</div>
          </div>
        </div>
        {WORKOUT_EXERCISES.map((ex,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:i<WORKOUT_EXERCISES.length-1?`1px solid #1a1a1a`:"none" }}>
            <div style={{ width:20, height:20, borderRadius:5, background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:"#555" }}>{i+1}</span>
            </div>
            <span style={{ fontSize:13, fontWeight:500 }}>{ex.name}</span>
            <span style={{ marginLeft:"auto", fontSize:11, color:"#444", fontWeight:500 }}>{settings.totalSets} × {settings.holdSecs}s</span>
          </div>
        ))}
        <button onClick={onStartWorkout} style={{ width:"100%", marginTop:18, background:colors.green, color:"#000", border:"none", borderRadius:50, padding:"16px", fontSize:15, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 0 20px ${colors.green}33` }}>
          <Icon name="play" size={17} color="#000" />
          Ready to Workout
        </button>
      </div>

      {/* Streak */}
      <div className="card" style={{ background:"linear-gradient(135deg,#141414 0%,#0c1a0f 100%)", border:`1px solid ${colors.green}18`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:-24, right:-10, opacity:0.04 }}><Icon name="fire" size={130} color={colors.green} /></div>
        <div style={{ fontSize:10, color:colors.green, fontWeight:600, letterSpacing:3, marginBottom:8 }}>DAILY STREAK</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:30, fontWeight:800, fontFamily:"'Outfit',sans-serif", lineHeight:1.15 }}>{streak}-Day Streak<br />Active</div>
          <div style={{ width:46, height:46, borderRadius:"50%", background:colors.green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon name="bolt" size={22} color="#000" /></div>
        </div>
      </div>
    </div>
  );
}

// ── TRENDS SCREEN ─────────────────────────────────────────────────────────────
function TrendsScreen({ painLog, sessionHistory, onExport }) {
  const [tab, setTab] = useState("pain"); // pain | history
  const weekDays = ["M","T","W","T","F","S","S"];

  const recentPain = painLog.slice(-7);
  const avgPain    = recentPain.length ? (recentPain.reduce((a,b)=>a+b.value,0)/recentPain.length).toFixed(1) : "—";
  const painData   = recentPain.map((p,i)=>({ value:p.value, label:weekDays[i%7], highlight:i===recentPain.length-1, restDay:p.restDay }));
  const completionData = Array.from({length:7},(_,i)=>i<sessionHistory.length);
  const intensityData  = sessionHistory.slice(-10).map(s=>s.intensity);

  // Pain insights
  const trainDays = sessionHistory.slice(-7).map(s=>s.date);
  const trainPain = painLog.filter(p=>trainDays.includes(p.date)).map(p=>p.value);
  const restPain  = painLog.filter(p=>!trainDays.includes(p.date)&&!p.restDay).map(p=>p.value);
  const trainAvg  = trainPain.length ? (trainPain.reduce((a,b)=>a+b,0)/trainPain.length).toFixed(1) : null;
  const restAvg   = restPain.length  ? (restPain.reduce((a,b)=>a+b,0)/restPain.length).toFixed(1)  : null;

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>

      {/* Tab toggle */}
      <div style={{ display:"flex", background:"#141414", border:"1px solid #222", borderRadius:12, padding:3, marginBottom:14 }}>
        {[{id:"pain",label:"Pain & Progress"},{id:"history",label:"Session History"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:tab===t.id?"#2a2a2a":"transparent", color:tab===t.id?colors.textPrimary:colors.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pain" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            {[{ label:"AVG PAIN", value:avgPain, unit:"/10", color:parseFloat(avgPain)<=3?colors.green:colors.yellow },
              { label:"SESSIONS", value:sessionHistory.length, unit:"total", color:colors.blue },
              { label:"THIS WEEK", value:Math.min(sessionHistory.length,7), unit:"/7", color:colors.green }].map((s,i)=>(
              <div key={i} className="card" style={{ margin:0, textAlign:"center", padding:"13px 8px" }}>
                <div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:5 }}>{s.label}</div>
                <div className="mono" style={{ fontSize:22, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:colors.textMuted, marginTop:1 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div><div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Pain Level</div><div style={{ fontSize:12, color:colors.textSecondary, marginTop:2 }}>7-day morning baseline</div></div>
              <span style={{ fontSize:11, color:colors.green, fontWeight:600 }}>↓ trending</span>
            </div>
            <BarChart data={painData.length ? painData : [{value:0,label:"—",highlight:false}]} color={colors.green} />
          </div>

          {/* Training vs rest day pain */}
          {trainAvg && restAvg && (
            <div className="card">
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>Training vs Rest Day Pain</div>
              <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:16 }}>Average pain score comparison</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[{ label:"TRAINING DAYS", value:trainAvg, color:colors.blue },{ label:"REST DAYS", value:restAvg, color:colors.purple }].map((s,i)=>(
                  <div key={i} style={{ background:"#0e0e0e", borderRadius:12, padding:"14px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:6 }}>{s.label}</div>
                    <div className="mono" style={{ fontSize:28, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:colors.textMuted }}>avg /10</div>
                  </div>
                ))}
              </div>
              {parseFloat(trainAvg)<parseFloat(restAvg) && (
                <div style={{ marginTop:12, fontSize:12, color:colors.green, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="bolt" size={13} color={colors.green} />
                  Training days show lower pain — keep loading!
                </div>
              )}
            </div>
          )}

          {/* Intensity trend */}
          {intensityData.length > 1 && (
            <div className="card">
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:2 }}>Intensity Progression</div>
              <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:14 }}>MVC % across last {intensityData.length} sessions</div>
              <Sparkline data={intensityData} color={colors.blue} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:10, color:colors.textSecondary, fontWeight:500 }}>
                <span>EARLIEST</span>
                <span style={{ color:colors.blue }}>
                  {intensityData[intensityData.length-1] > intensityData[0] ? `+${intensityData[intensityData.length-1]-intensityData[0]}% increase` : "stable"}
                </span>
                <span>LATEST</span>
              </div>
            </div>
          )}

          <div className="card">
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:2 }}>Weekly Completion</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:16 }}>Sessions this week</div>
            <div style={{ display:"flex", gap:8 }}>
              {weekDays.map((d,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ width:"100%", aspectRatio:"1", borderRadius:8, background:completionData[i]?colors.green+"18":"#1a1a1a", border:`1px solid ${completionData[i]?colors.green+"44":"#222"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {completionData[i] && <Icon name="check" size={13} color={colors.green} />}
                  </div>
                  <span style={{ fontSize:9, color:colors.textSecondary, fontWeight:500 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pain log */}
          <div className="card">
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:2 }}>Pain Log</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:14 }}>All recorded check-ins</div>
            {painLog.length===0 ? (
              <div style={{ textAlign:"center", color:colors.textSecondary, padding:"20px 0", fontSize:13 }}>No check-ins yet.</div>
            ) : (
              painLog.slice(-10).reverse().map((p,i)=>{
                const c=p.restDay?colors.purple:p.value<=3?colors.green:p.value<=6?colors.yellow:colors.red;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom:i<Math.min(9,painLog.length-1)?`1px solid ${colors.cardBorder}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:c, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:colors.textSecondary }}>{p.date || `Check-in ${painLog.length-i}`}</span>
                      {p.restDay && <span style={{ fontSize:10, color:colors.purple, fontWeight:600, background:colors.purple+"15", padding:"2px 7px", borderRadius:10 }}>REST</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {!p.restDay && <span style={{ fontSize:11, color:c, fontWeight:600 }}>{p.label}</span>}
                      {!p.restDay && <span className="mono" style={{ fontSize:18, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:c }}>{p.value}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Export */}
          <button onClick={onExport} style={{ width:"100%", background:"#141414", border:"1px solid #222", borderRadius:14, padding:"14px", fontSize:13, fontWeight:600, color:colors.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
            <Icon name="download" size={16} color={colors.textSecondary} />
            Export Data as CSV
          </button>
        </>
      )}

      {tab === "history" && (
        <>
          {sessionHistory.length===0 ? (
            <div className="card" style={{ textAlign:"center", padding:"40px 20px" }}>
              <Icon name="history" size={32} color={colors.textMuted} />
              <div style={{ fontSize:14, color:colors.textSecondary, marginTop:12 }}>No sessions yet.</div>
              <div style={{ fontSize:12, color:colors.textMuted, marginTop:4 }}>Complete your first workout to see history here.</div>
            </div>
          ) : (
            sessionHistory.slice().reverse().map((s,i)=>(
              <div key={i} className="card" style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:s.notes?12:0 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{s.date}</div>
                    <div style={{ fontSize:12, color:colors.textSecondary, marginTop:2 }}>{s.exercises} exercises · {s.totalSets} sets · ~{s.duration} min</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div className="mono" style={{ fontSize:20, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.blue }}>{s.intensity}%</div>
                    <div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5 }}>MVC</div>
                  </div>
                </div>
                {s.notes && (
                  <div style={{ background:"#0e0e0e", borderRadius:10, padding:"10px 12px", fontSize:12, color:colors.textSecondary, lineHeight:1.55, display:"flex", gap:8, alignItems:"flex-start" }}>
                    <Icon name="note" size={13} color={colors.textMuted} />
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
  const [active, setActive] = useState(null);
  const protocols = [
    { id:0, stage:"A", title:"Foundation Protocol", subtitle:"Weeks 1–4 · Isometric Loading", color:colors.green, description:"Build base tendon tolerance with sustained isometric holds. Focus on pain-free loading and neuromuscular activation.", exercises:[{name:"Wall Squats",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"},{name:"Calf Raises",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"},{name:"Leg Press Hold",sets:4,reps:"45s hold",rest:"60s",intensity:"65% MVC"},{name:"Spanish Squat",sets:4,reps:"45s hold",rest:"60s",intensity:"70% MVC"},{name:"Eccentric Heel Drops",sets:4,reps:"45s hold",rest:"60s",intensity:"Bodyweight"}] },
    { id:1, stage:"B", title:"Strength Phase", subtitle:"Weeks 5–8 · Isotonic Loading", color:colors.blue, description:"Introduce slow eccentric-concentric movements to build tendon stiffness and cross-sectional area.", exercises:[{name:"Decline Squat (Slow)",sets:4,reps:"8 reps",rest:"3 min",intensity:"3-0-3 tempo"},{name:"Step-Down (Eccentric)",sets:3,reps:"10 reps",rest:"2 min",intensity:"Bodyweight"},{name:"Leg Press (Single)",sets:3,reps:"12 reps",rest:"2 min",intensity:"Moderate"}] },
    { id:2, stage:"C", title:"Power & Plyometrics", subtitle:"Weeks 9–12 · Energy Storage", color:colors.orange, description:"Develop energy storage capacity through progressive loading and reactive drills.", exercises:[{name:"Depth Jump (Low)",sets:3,reps:"6 reps",rest:"3 min",intensity:"Min. height"},{name:"Split Squat Jump",sets:3,reps:"8 reps",rest:"3 min",intensity:"Bodyweight"},{name:"Single-Leg Hop",sets:4,reps:"10m",rest:"3 min",intensity:"Controlled"}] },
    { id:3, stage:"M", title:"Maintenance", subtitle:"Ongoing · Tendon Health", color:colors.purple, description:"Sustain tendon health with 2–3× weekly loading. Prevent deconditioning and maintain tissue quality.", exercises:[{name:"Wall Squats",sets:3,reps:"45s hold",rest:"60s",intensity:"80% MVC"},{name:"Decline Squat",sets:3,reps:"10 reps",rest:"2 min",intensity:"Moderate"},{name:"Calf Raise (Single)",sets:3,reps:"15 reps",rest:"90s",intensity:"Slow"}] },
  ];

  const criteria = STAGE_CRITERIA[stage];
  const readyToProgress = criteria?.nextStage && weeksInStage >= criteria.minWeeks && avgPain <= criteria.maxAvgPain;

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>
      <p style={{ fontSize:13, color:colors.textSecondary, lineHeight:1.7, marginBottom:14 }}>Evidence-based tendon loading protocols. Progress through stages as pain decreases and strength improves.</p>

      {/* Stage progression gate */}
      {readyToProgress && (
        <div className="slide-up" style={{ background:"#0a1a0a", border:`1px solid ${colors.green}44`, borderRadius:16, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.green, marginBottom:4 }}>Ready to advance to Stage {criteria.nextStage}?</div>
          <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:14, lineHeight:1.5 }}>You've completed {weeksInStage} weeks in Stage {stage} with an avg pain of {avgPain}/10 — criteria met!</div>
          <button onClick={()=>onAdvanceStage(criteria.nextStage)} style={{ background:colors.green, color:"#000", border:"none", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
            Advance to Stage {criteria.nextStage}
          </button>
        </div>
      )}

      {protocols.map(p=>(
        <div key={p.id} className="card" onClick={()=>setActive(active===p.id?null:p.id)} style={{ cursor:"pointer", border:`1px solid ${active===p.id?p.color+"44":stage===p.stage?p.color+"22":colors.cardBorder}`, transition:"border-color 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:p.color+"12", border:`1px solid ${p.color}28`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:20, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:p.color }}>{p.stage}</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{p.title}</div>
              <div style={{ fontSize:12, color:colors.textSecondary, marginTop:2 }}>{p.subtitle}</div>
            </div>
            {stage===p.stage && <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:p.color, background:p.color+"15", padding:"3px 8px", borderRadius:10, letterSpacing:1 }}>ACTIVE</span>}
            <div style={{ transform:active===p.id?"rotate(180deg)":"none", transition:"transform 0.2s" }}><Icon name="chevron" size={17} color={colors.textSecondary} /></div>
          </div>
          {active===p.id && (
            <div className="fade-in-fast" style={{ marginTop:16, borderTop:`1px solid ${colors.cardBorder}`, paddingTop:16 }}>
              <p style={{ fontSize:13, color:colors.textSecondary, lineHeight:1.65, marginBottom:14 }}>{p.description}</p>
              {p.exercises.map((ex,i)=>(
                <div key={i} style={{ background:"#0e0e0e", borderRadius:10, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:10 }}>{ex.name}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[["Sets",ex.sets],["Reps/Time",ex.reps],["Rest",ex.rest],["Intensity",ex.intensity]].map(([k,v])=>(
                      <div key={k}><div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:2 }}>{k}</div><div style={{ fontSize:13, fontWeight:600, color:p.color }}>{v}</div></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── PROFILE / SETTINGS SCREEN ─────────────────────────────────────────────────
function ProfileScreen({ stage, weeksInStage, setStage, setWeeksInStage, settings, setSettings, sessionHistory }) {
  const [name, setName]     = useState("Alex Carter");
  const [editing, setEditing] = useState(false);
  const [notifs, setNotifs] = useState(true);
  const [morning, setMorning] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const achievements = [
    { icon:"bolt",   label:"14-Day Streak",  earned:true,  color:colors.green },
    { icon:"trophy", label:"First Protocol", earned:true,  color:colors.yellow },
    { icon:"fire",   label:"30-Day Warrior", earned:sessionHistory.length>=30, color:colors.orange },
    { icon:"knee",   label:"Pain-Free Week", earned:false, color:colors.blue },
    { icon:"star",   label:"10 Sessions",    earned:sessionHistory.length>=10, color:colors.purple },
    { icon:"history",label:"Stage Graduate", earned:stage!=="A", color:colors.blue },
  ];

  const saveSettings = () => { setSettings(localSettings); setSettingsOpen(false); };

  return (
    <div className="scroll-area fade-in" style={{ padding:"0 16px 100px" }}>
      <div className="card" style={{ textAlign:"center" }}>
        <div style={{ width:70, height:70, borderRadius:"50%", background:`linear-gradient(135deg,${colors.green}18,${colors.blue}18)`, border:`1.5px solid ${colors.green}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:24, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:colors.green }}>
          {name.split(" ").map(n=>n[0]).join("")}
        </div>
        {editing ? <input value={name} onChange={e=>setName(e.target.value)} style={{ background:"#0e0e0e", border:`1px solid #222`, color:colors.textPrimary, borderRadius:8, padding:"8px 12px", fontSize:16, textAlign:"center", width:"100%", marginBottom:10, fontFamily:"'Geist',sans-serif", fontWeight:600 }} />
                 : <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>{name}</div>}
        <div style={{ fontSize:12, color:colors.textSecondary, marginBottom:14 }}>Stage {stage} · Week {weeksInStage} · {sessionHistory.length} sessions</div>
        <button onClick={()=>setEditing(e=>!e)} style={{ background:editing?colors.green:"#1a1a1a", color:editing?"#000":colors.textSecondary, border:`1px solid ${editing?colors.green:"#2a2a2a"}`, borderRadius:8, padding:"8px 20px", fontSize:12, fontWeight:600, letterSpacing:0.5, cursor:"pointer" }}>
          {editing?"SAVE":"EDIT PROFILE"}
        </button>
      </div>

      {/* Recovery Stage */}
      <div className="card">
        <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:14 }}>Recovery Stage</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {["A","B","C","M"].map(s=>(
            <button key={s} onClick={()=>setStage(s)} style={{ padding:"12px 0", borderRadius:10, border:`1px solid ${stage===s?colors.green:"#1e1e1e"}`, background:stage===s?colors.green+"12":"#0e0e0e", color:stage===s?colors.green:colors.textSecondary, fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", cursor:"pointer", transition:"all 0.2s" }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, color:colors.textSecondary }}>Weeks in current stage</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setWeeksInStage(w=>Math.max(1,w-1))} style={{ width:28, height:28, borderRadius:6, background:"#1a1a1a", border:"1px solid #222", color:colors.textPrimary, fontSize:16, cursor:"pointer" }}>−</button>
            <span className="mono" style={{ fontSize:18, fontWeight:700, fontFamily:"'Outfit',sans-serif", minWidth:24, textAlign:"center" }}>{weeksInStage}</span>
            <button onClick={()=>setWeeksInStage(w=>w+1)} style={{ width:28, height:28, borderRadius:6, background:"#1a1a1a", border:"1px solid #222", color:colors.textPrimary, fontSize:16, cursor:"pointer" }}>+</button>
          </div>
        </div>
      </div>

      {/* Workout Settings */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: settingsOpen?16:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Workout Settings</div>
            <div style={{ fontSize:12, color:colors.textSecondary, marginTop:2 }}>Hold time · Rest time · Sets</div>
          </div>
          <button onClick={()=>setSettingsOpen(o=>!o)} style={{ background:"#1a1a1a", border:"1px solid #222", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, color:colors.textSecondary, cursor:"pointer" }}>
            {settingsOpen?"Cancel":"Edit"}
          </button>
        </div>
        {settingsOpen && (
          <div className="fade-in-fast">
            {[{ label:"Hold Duration", key:"holdSecs", min:20, max:120, step:5, unit:"s" },
              { label:"Rest Duration", key:"restSecs", min:30, max:180, step:5, unit:"s" },
              { label:"Sets per Exercise", key:"totalSets", min:2, max:8, step:1, unit:"sets" }].map(s=>(
              <div key={s.key} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{s.label}</span>
                  <span className="mono" style={{ fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", color:colors.blue }}>{localSettings[s.key]}{s.unit}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={localSettings[s.key]}
                  onChange={e=>setLocalSettings(prev=>({...prev,[s.key]:parseInt(e.target.value)}))}
                  style={{ width:"100%" }} />
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:colors.textMuted, marginTop:3 }}>
                  <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                </div>
              </div>
            ))}
            <button onClick={saveSettings} style={{ width:"100%", background:colors.green, color:"#000", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Outfit',sans-serif", cursor:"pointer" }}>
              Save Settings
            </button>
          </div>
        )}
        {!settingsOpen && (
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            {[{ label:"HOLD", value:`${settings.holdSecs}s` },{ label:"REST", value:`${settings.restSecs}s` },{ label:"SETS", value:settings.totalSets }].map((s,i)=>(
              <div key={i} style={{ flex:1, background:"#0e0e0e", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:colors.textSecondary, fontWeight:600, letterSpacing:1.5, marginBottom:4 }}>{s.label}</div>
                <div className="mono" style={{ fontSize:18, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="card">
        <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:14 }}>Achievements</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {achievements.map((a,i)=>(
            <div key={i} style={{ background:"#0e0e0e", borderRadius:10, padding:"13px", display:"flex", alignItems:"center", gap:10, opacity:a.earned?1:0.3, border:`1px solid ${a.earned?a.color+"1a":"#1a1a1a"}` }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:a.earned?a.color+"12":"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name={a.icon} size={17} color={a.earned?a.color:colors.textSecondary} />
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:a.earned?colors.textPrimary:colors.textSecondary }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification settings */}
      <div className="card">
        <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Outfit',sans-serif", marginBottom:14 }}>Notifications</div>
        {[{ label:"Daily Reminders", sub:"Session reminders", value:notifs, set:setNotifs },
          { label:"Morning Check-In", sub:"8:00 AM reminder", value:morning, set:setMorning }].map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:i<1?`1px solid ${colors.cardBorder}`:"none" }}>
            <div><div style={{ fontSize:14, fontWeight:500 }}>{s.label}</div><div style={{ fontSize:11, color:colors.textSecondary, marginTop:2 }}>{s.sub}</div></div>
            <div onClick={()=>s.set(v=>!v)} style={{ width:42, height:24, borderRadius:12, background:s.value?colors.green:"#1a1a1a", border:`1px solid ${s.value?colors.green:"#2a2a2a"}`, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:s.value?20:2, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.5)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]         = useState("today");
  const [workoutActive, setWorkoutActive] = useState(false);
  const [painLog, setPainLog]             = useState([
    { value:3, label:"Low",      date:"01 Jan" },
    { value:4, label:"Moderate", date:"02 Jan" },
    { value:2, label:"Low",      date:"03 Jan" },
    { value:2, label:"Low",      date:"04 Jan" },
  ]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [stage, setStage]                 = useState("A");
  const [weeksInStage, setWeeksInStage]   = useState(3);
  const [settings, setSettings]           = useState(DEFAULT_SETTINGS);
  const [intensity, setIntensity]         = useState(70);
  const streak = sessionHistory.length + 14; // seeded base

  const avgPain = painLog.length
    ? parseFloat((painLog.slice(-7).reduce((a,b)=>a+b.value,0)/Math.min(painLog.length,7)).toFixed(1))
    : 0;

  const handleSessionComplete = (session) => {
    setSessionHistory(prev => [...prev, { ...session, id: prev.length + 1 }]);
    setIntensity(session.intensity);
    setWorkoutActive(false);
  };

  const handleAdvanceStage = (newStage) => {
    setStage(newStage);
    setWeeksInStage(1);
    setActiveTab("protocols");
  };

  const handleExport = () => exportCSV(painLog, sessionHistory);

  const tabs = [
    { id:"today",     label:"TODAY",     icon:"today"     },
    { id:"trends",    label:"TRENDS",    icon:"trends"    },
    { id:"protocols", label:"PROTOCOLS", icon:"protocols" },
    { id:"profile",   label:"PROFILE",   icon:"profile"   },
  ];

  return (
    <>
      <style>{styles}</style>
      <div style={{ maxWidth:420, margin:"0 auto", minHeight:"100vh", background:colors.bg, display:"flex", flexDirection:"column" }}>

        <div style={{ padding:"52px 20px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:4, color:colors.textPrimary }}>REBUILD YOUR KNEE</div>
          <div style={{ width:34, height:34, borderRadius:9, background:colors.card, border:`1px solid ${colors.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <Icon name="settings" size={16} color={colors.textSecondary} />
          </div>
        </div>

        <div style={{ flex:1, overflow:"hidden" }}>
          {activeTab==="today"     && <TodayScreen painLog={painLog} setPainLog={setPainLog} sessionHistory={sessionHistory} streak={streak} onStartWorkout={()=>setWorkoutActive(true)} settings={settings} stage={stage} />}
          {activeTab==="trends"    && <TrendsScreen painLog={painLog} sessionHistory={sessionHistory} onExport={handleExport} />}
          {activeTab==="protocols" && <ProtocolsScreen stage={stage} weeksInStage={weeksInStage} avgPain={avgPain} onAdvanceStage={handleAdvanceStage} />}
          {activeTab==="profile"   && <ProfileScreen stage={stage} weeksInStage={weeksInStage} setStage={setStage} setWeeksInStage={setWeeksInStage} settings={settings} setSettings={setSettings} sessionHistory={sessionHistory} />}
        </div>

        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:colors.navBg, borderTop:`1px solid ${colors.cardBorder}`, display:"flex", zIndex:100 }}>
          {tabs.map(t=>{
            const active = activeTab===t.id;
            return (
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flex:1, padding:"12px 0 11px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <Icon name={t.icon} size={21} color={active?colors.green:colors.textSecondary} />
                <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Outfit',sans-serif", letterSpacing:1.5, color:active?colors.green:colors.textSecondary }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {workoutActive && (
        <WorkoutScreen
          onExit={()=>setWorkoutActive(false)}
          onComplete={handleSessionComplete}
          settings={settings}
          intensity={intensity}
        />
      )}
    </>
  );
}
