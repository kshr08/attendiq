import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";

const COURSES = {
  CS101: { name: "Data Structures",    icon: "⬡" },
  CS203: { name: "Operating Systems",  icon: "⚙" },
  CS305: { name: "Computer Networks",  icon: "◈" },
  CS401: { name: "Database Systems",   icon: "▦" },
  CS502: { name: "Machine Learning",   icon: "◎" },
};

const T = {
  bg: "#080b12", surface: "#0e1420", card: "#121a2a",
  border: "#1e2d45", borderHover: "#2a4060",
  accent: "#00d4ff", accentDim: "#00d4ff18", accentBorder: "#00d4ff44",
  gold: "#ffc947", goldDim: "#ffc94718", goldBorder: "#ffc94744",
  green: "#00e5a0", greenDim: "#00e5a018",
  red: "#ff4d6d", redDim: "#ff4d6d18",
  text: "#e2eaf5", muted: "#4a6080", sub: "#8aa0bc",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  input, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes gridMove { from { transform:translateY(0); } to { transform:translateY(40px); } }
  .fade-up   { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-2 { animation: fadeUp 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-3 { animation: fadeUp 0.4s 0.16s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-up-4 { animation: fadeUp 0.4s 0.24s cubic-bezier(0.16,1,0.3,1) both; }
  .course-card {
    background: ${T.card}; border: 1px solid ${T.border};
    border-radius: 12px; padding: 20px; cursor: pointer;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .course-card:hover { border-color: ${T.borderHover}; transform: translateY(-2px); box-shadow: 0 8px 30px #00000050; }
  .course-card.sel-accent { border-color: ${T.accent}; background: ${T.accentDim}; box-shadow: 0 0 20px ${T.accentBorder}; }
  .course-card.sel-gold   { border-color: ${T.gold};   background: ${T.goldDim};   box-shadow: 0 0 20px ${T.goldBorder}; }
  .course-card.no-notes   { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .opt-btn {
    display: block; width: 100%; text-align: left;
    border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;
    font-size: 13px; cursor: pointer; transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }
  .opt-btn:hover:not(:disabled) { border-color: ${T.accentBorder} !important; }
  .primary-btn {
    background: ${T.accent}; color: ${T.bg}; border: none;
    border-radius: 8px; padding: 13px 20px; font-size: 13px;
    font-weight: 700; letter-spacing: 0.08em; cursor: pointer;
    transition: all 0.2s; font-family: 'Syne', sans-serif;
  }
  .primary-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .primary-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none !important; }
  .ghost-btn {
    background: transparent; color: ${T.sub}; border: 1px solid ${T.border};
    border-radius: 8px; padding: 9px 16px; font-size: 11px;
    letter-spacing: 0.08em; cursor: pointer; transition: all 0.2s;
    font-family: 'JetBrains Mono', monospace;
  }
  .ghost-btn:hover { border-color: ${T.borderHover}; color: ${T.text}; }
  .checkbox-card {
    background: ${T.card}; border: 1px solid ${T.border};
    border-radius: 10px; padding: 14px 16px; cursor: pointer;
    transition: all 0.2s; display: flex; align-items: center; gap: 12px;
  }
  .checkbox-card:hover { border-color: ${T.borderHover}; }
  .checkbox-card.checked-accent { border-color: ${T.accent}; background: ${T.accentDim}; }
  .checkbox-card.checked-gold   { border-color: ${T.gold};   background: ${T.goldDim}; }
`;

function Label({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: "0.15em", color: T.muted, textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>;
}
function Spinner({ size = 14, color = T.accent }) {
  return <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${T.border}`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" }} />;
}
function GridBg() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.border}22 1px,transparent 1px),linear-gradient(90deg,${T.border}22 1px,transparent 1px)`, backgroundSize: "40px 40px", animation: "gridMove 8s linear infinite", opacity: 0.5 }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 0%,${T.accentDim},transparent)` }} />
    </div>
  );
}
function TopBar({ user, onLogout }) {
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accentDim, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◈</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif" }}>AttendIQ</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user.avatar && <img src={user.avatar} style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.border}` }} />}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: user.role === "teacher" ? T.gold : T.accent, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{user.role}</div>
          </div>
        </div>
        <button className="ghost-btn" onClick={onLogout}>LOGOUT</button>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: 24 }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.accentDim, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>◈</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>AttendIQ</span>
          </div>
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace" }}>SMART ATTENDANCE SYSTEM</p>
        </div>

        <div className="fade-up-2" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "36px 28px", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>Welcome</h2>
          <p style={{ fontSize: 12, color: T.sub, marginBottom: 32, fontFamily: "'JetBrains Mono', monospace" }}>Sign in with your college Gmail account</p>

          <a href={`${import.meta.env.VITE_API_URL || ""}/auth/google`} style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", padding: "13px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.card, color: T.text, fontFamily: "'Syne', sans-serif",
              fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.2s",
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
              onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </a>

          <p style={{ fontSize: 11, color: T.muted, marginTop: 20, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
            Use your college Gmail address.<br />Your role will be set up on first login.
          </p>
        </div>
      </div>
    </div>
  );
}

function OnboardingPage({ user, onComplete }) {
  const [step, setStep] = useState("role"); 
  const [role, setRole] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleItem = (code) => {
    setSelected(s => s.includes(code) ? s.filter(c => c !== code) : [...s, code]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const body = { role };
    if (role === "teacher") body.subjects = selected;
    if (role === "student") body.courses = selected;
    const res = await fetch(`${API}/api/onboard`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    onComplete(data.user);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: 24 }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 520 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
          {user.avatar && <img src={user.avatar} style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${T.accent}`, marginBottom: 14 }} />}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif" }}>Hey, {user.name.split(" ")[0]}!</h1>
          <p style={{ fontSize: 12, color: T.sub, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>Let's set up your account — just takes a second</p>
        </div>

        {step === "role" && (
          <div className="fade-up-2">
            <Label>I am a...</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {[["teacher", "👨‍🏫", "I teach classes", T.gold], ["student", "🎓", "I attend classes", T.accent]].map(([r, icon, desc, color]) => (
                <div key={r} className={`course-card ${role === r ? (r === "teacher" ? "sel-gold" : "sel-accent") : ""}`} onClick={() => setRole(r)}
                  style={{ textAlign: "center", padding: "28px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif", textTransform: "capitalize" }}>{r}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{desc}</div>
                  {role === r && <div style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />}
                </div>
              ))}
            </div>
            <button className="primary-btn" style={{ width: "100%" }} disabled={!role} onClick={() => setStep(role === "teacher" ? "subjects" : "courses")}>
              CONTINUE →
            </button>
          </div>
        )}

        {(step === "subjects" || step === "courses") && (
          <div className="fade-up-2">
            <Label>{step === "subjects" ? "Subjects you teach" : "Courses you're enrolled in"}</Label>
            <p style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
              {step === "subjects" ? "Select all subjects you teach. You can add more later." : "Select all courses you're taking this semester."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {Object.entries(COURSES).map(([code, course]) => {
                const checked = selected.includes(code);
                const cls = checked ? (step === "subjects" ? "checked-gold" : "checked-accent") : "";
                return (
                  <div key={code} className={`checkbox-card ${cls}`} onClick={() => toggleItem(code)}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? (step === "subjects" ? T.gold : T.accent) : T.border}`, background: checked ? (step === "subjects" ? T.gold : T.accent) : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      {checked && <span style={{ fontSize: 11, color: T.bg, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>{course.name}</div>
                      <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{code}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ghost-btn" onClick={() => { setStep("role"); setSelected([]); }}>← BACK</button>
              <button className="primary-btn" style={{ flex: 1, background: step === "subjects" ? T.gold : T.accent }} disabled={selected.length === 0 || loading} onClick={handleSubmit}>
                {loading ? <><Spinner />SAVING...</> : "FINISH SETUP →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherSubjectPicker({ user, onSelect, onAddSubject }) {
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddSubject = async () => {
    if (!newSubject) return;
    setLoading(true);
    await fetch(`${API}/api/teacher/add-subject`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ courseCode: newSubject }) });
    setLoading(false);
    onAddSubject(newSubject);
    setAdding(false);
    setNewSubject(null);
  };

  const availableToAdd = Object.keys(COURSES).filter(c => !user.subjects.includes(c));

  return (
    <div style={{ padding: "40px 24px", maxWidth: 680, margin: "0 auto" }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
          Welcome back, {user.name.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: T.sub, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>Which subject are you teaching today?</p>
      </div>

      <div className="fade-up-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {user.subjects.map((code, i) => {
          const course = COURSES[code];
          if (!course) return null;
          return (
            <div key={code} className={`course-card ${selected === code ? "sel-gold" : ""}`} style={{ animationDelay: `${i * 0.07}s` }} onClick={() => setSelected(code)}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{course.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{course.name}</div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{code}</div>
              {selected === code && <div style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: "50%", background: T.gold, boxShadow: `0 0 8px ${T.gold}` }} />}
            </div>
          );
        })}

        {availableToAdd.length > 0 && (
          <div className="course-card" style={{ border: `1px dashed ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}
            onClick={() => setAdding(true)}>
            <div style={{ fontSize: 28, color: T.muted }}>+</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>Add Subject</div>
          </div>
        )}
      </div>

      {adding && (
        <div className="fade-up-2" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px", marginBottom: 20 }}>
          <Label>Select a subject to add</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
            {availableToAdd.map(code => (
              <div key={code} className={`checkbox-card ${newSubject === code ? "checked-gold" : ""}`} onClick={() => setNewSubject(code)}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${newSubject === code ? T.gold : T.border}`, background: newSubject === code ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {newSubject === code && <span style={{ fontSize: 10, color: T.bg, fontWeight: 700 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>{COURSES[code].name}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{code}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ghost-btn" onClick={() => { setAdding(false); setNewSubject(null); }}>CANCEL</button>
            <button className="primary-btn" style={{ flex: 1, background: T.gold }} disabled={!newSubject || loading} onClick={handleAddSubject}>
              {loading ? <><Spinner />ADDING...</> : "ADD SUBJECT"}
            </button>
          </div>
        </div>
      )}

      <div className="fade-up-3">
        <button className="primary-btn" style={{ width: "100%", background: selected ? T.gold : undefined }} disabled={!selected} onClick={() => onSelect(selected)}>
          OPEN DASHBOARD{selected ? ` — ${COURSES[selected]?.name}` : ""} →
        </button>
      </div>
    </div>
  );
}

function AttendanceDateView({ attendance, course }) {
  const [openDates, setOpenDates] = useState({});

  const toggleDate = (dateKey) => setOpenDates(o => ({ ...o, [dateKey]: !o[dateKey] }));

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const grouped = attendance.reduce((acc, r) => {
    const key = new Date(r.date).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  if (attendance.length === 0) return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 22px", textAlign: "center" }}>
      <p style={{ fontSize: 12, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>No quiz submissions yet.</p>
    </div>
  );

  return (
    <div>
      {sortedDates.map((dateKey, i) => {
        const records = grouped[dateKey];
        const presentCount = records.filter(r => r.present).length;
        const isOpen = openDates[dateKey] !== false; 
        const isToday = new Date(dateKey).toDateString() === new Date().toDateString();

        return (
          <div key={dateKey} style={{ marginBottom: 12, animation: `fadeUp 0.3s ${i * 0.06}s both` }}>
            <div onClick={() => toggleDate(dateKey)}
              style={{ background: T.card, border: `1px solid ${isToday ? T.accentBorder : T.border}`, borderRadius: isOpen ? "12px 12px 0 0" : 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isToday && <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, boxShadow: `0 0 6px ${T.accent}` }} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif" }}>{formatDateLabel(dateKey)}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    {new Date(dateKey).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: T.greenDim, color: T.green, border: `1px solid ${T.green}`, fontFamily: "'JetBrains Mono', monospace" }}>
                    {presentCount} P
                  </span>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: T.redDim, color: T.red, border: `1px solid ${T.red}`, fontFamily: "'JetBrains Mono', monospace" }}>
                    {records.length - presentCount} A
                  </span>
                </div>
                <span style={{ color: T.muted, fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ background: T.surface, border: `1px solid ${isToday ? T.accentBorder : T.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Student", "Email", "Score", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 18px", fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${T.border}22` }}>
                        <td style={{ padding: "11px 18px", color: T.text }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {r.studentId?.avatar && <img src={r.studentId.avatar} style={{ width: 22, height: 22, borderRadius: "50%" }} />}
                            {r.studentId?.name}
                          </div>
                        </td>
                        <td style={{ padding: "11px 18px", color: T.sub }}>{r.studentId?.email}</td>
                        <td style={{ padding: "11px 18px", color: T.text }}>{r.score}/5</td>
                        <td style={{ padding: "11px 18px" }}>
                          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: r.present ? T.greenDim : T.redDim, color: r.present ? T.green : T.red, border: `1px solid ${r.present ? T.green : T.red}` }}>
                            {r.present ? "PRESENT" : "ABSENT"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeacherDashboard({ user, courseCode, onChangeSubject }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimit, setTimeLimit] = useState(5);
  const [saved, setSaved] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const course = COURSES[courseCode];

  useEffect(() => {
    fetch(`${API}/api/notes/${courseCode}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.notes) {
          setNotes(d.notes.content || "");
          setMaxAttempts(d.notes.maxAttempts || 1);
          setTimeLimit(d.notes.timeLimit || 5);
        }
      });
    fetch(`${API}/api/attendance/${courseCode}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.records) setAttendance(d.records); });
  }, [courseCode]);

  const saveNotes = async () => {
    await fetch(`${API}/api/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ courseCode, content: notes, maxAttempts, timeLimit }) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const presentCount = attendance.filter(r => r.present).length;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>
      <div className="fade-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{course.icon}</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif" }}>{course.name}</h1>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`, fontFamily: "'JetBrains Mono', monospace" }}>{courseCode}</span>
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>TODAY'S SESSION · {user.name}</div>
        </div>
        <button className="ghost-btn" onClick={onChangeSubject}>⟳ CHANGE SUBJECT</button>
      </div>

      <div className="fade-up-2" style={{ display: "flex", gap: 4, marginBottom: 24, background: T.card, padding: 4, borderRadius: 10, width: "fit-content", border: `1px solid ${T.border}` }}>
        {[["notes","NOTES"],["attendance","ATTENDANCE"]].map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val)}
            style={{ padding: "8px 20px", borderRadius: 7, border: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s",
              background: activeTab === val ? T.accent : "transparent", color: activeTab === val ? T.bg : T.muted }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "notes" && (
        <div className="fade-up" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "22px" }}>
          <Label>Today's Class Notes for {course.name}</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={`Describe what you taught today in ${course.name}...`}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "14px", resize: "vertical", minHeight: 180, outline: "none", lineHeight: 1.8 }}
            onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
          {notes && /quantitative|numerical|calculation|compute|solve|math|numeric/i.test(notes) && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 7, background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔢</span>
              <span style={{ fontSize: 11, color: T.gold, fontFamily: "'JetBrains Mono', monospace" }}>Quantitative mode detected — AI will include numerical/calculation questions.</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", marginBottom: 8 }}>MAX ATTEMPTS (per day)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setMaxAttempts(a => Math.max(1, a - 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Syne', sans-serif", minWidth: 32, textAlign: "center" }}>{maxAttempts}</span>
                <button onClick={() => setMaxAttempts(a => Math.min(5, a + 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                <span style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{maxAttempts === 1 ? "attempt" : "attempts"}</span>
              </div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", marginBottom: 8 }}>TIME LIMIT (minutes)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setTimeLimit(t => Math.max(1, t - 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.gold, fontFamily: "'Syne', sans-serif", minWidth: 32, textAlign: "center" }}>{timeLimit}</span>
                <button onClick={() => setTimeLimit(t => Math.min(30, t + 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                <span style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>min</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              💡 Mention <span style={{ color: T.sub }}>"quantitative"</span> in notes for calculation-based questions.
            </span>
            <button className="primary-btn" style={{ padding: "9px 22px", fontSize: 11, background: saved ? T.green : T.accent }} onClick={saveNotes}>
              {saved ? "✓ SAVED" : "SAVE NOTES"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="fade-up">
          <AttendanceDateView attendance={attendance} course={course} />
        </div>
      )}
    </div>
  );
}

function CourseSelection({ user, onSelect }) {
  const [notesAvailable, setNotesAvailable] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all(user.courses.map(code =>
      fetch(`${API}/api/notes/${code}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => ({ code, hasNotes: !!(d.notes?.content) }))
    )).then(results => {
      const map = {};
      results.forEach(r => { map[r.code] = r.hasNotes; });
      setNotesAvailable(map);
    });
  }, []);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 680, margin: "0 auto" }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
          Hey, {user.name.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: T.sub, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>Select a course to take today's attendance quiz</p>
      </div>
      <div className="fade-up-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        {user.courses.map((code, i) => {
          const course = COURSES[code];
          if (!course) return null;
          const hasNotes = notesAvailable[code];
          return (
            <div key={code} className={`course-card ${selected === code ? "sel-accent" : ""} ${!hasNotes ? "no-notes" : ""}`}
              style={{ animationDelay: `${i * 0.08}s` }} onClick={() => hasNotes && setSelected(code)}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{course.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{course.name}</div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>{code}</div>
              {!hasNotes && <div style={{ marginTop: 8, fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>No notes yet</div>}
              {hasNotes && selected === code && <div style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: "50%", background: T.accent, boxShadow: `0 0 8px ${T.accent}` }} />}
            </div>
          );
        })}
      </div>
      <div className="fade-up-3">
        <button className="primary-btn" style={{ width: "100%" }} disabled={!selected} onClick={() => onSelect(selected)}>
          START QUIZ{selected ? ` — ${COURSES[selected]?.name}` : ""} →
        </button>
      </div>
    </div>
  );
}

function QuizView({ user, courseCode, onBack, onComplete }) {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");
  const [attemptInfo, setAttemptInfo] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(null);
  const course = COURSES[courseCode];
  const pass = score !== null && score >= 3;

  useEffect(() => {
    fetch(`${API}/api/attempts/${courseCode}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setAttemptInfo(d);
        if (d.remaining === 0) setPhase("blocked");
        else setPhase("info");
      })
      .catch(() => { setError("Failed to load quiz info."); setPhase("info"); });
  }, []);

  const startQuiz = async () => {
    setPhase("loading");
    try {
      const notesRes = await fetch(`${API}/api/notes/${courseCode}`, { credentials: "include" });
      const notesData = await notesRes.json();
      if (!notesData.notes?.content) { setError("No notes available."); setPhase("info"); return; }
      const genRes = await fetch(`${API}/api/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ courseCode, courseName: course.name, notes: notesData.notes.content }),
      });
      const genData = await genRes.json();
      if (genData.error) { setError(genData.error); setPhase("info"); return; }
      setQuestions(genData.questions);
      setTimeLeft((attemptInfo?.timeLimit || 5) * 60); 
      setPhase("quiz");
    } catch { setError("Failed to generate questions."); setPhase("info"); }
  };

  useEffect(() => {
    if (phase !== "quiz" || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  const handleSubmit = async (autoSubmit = false) => {
    let correct = 0;
    questions.forEach((q, i) => { if (selected[i] === q.answer) correct++; });
    setScore(correct);
    setPhase("result");
    const res = await fetch(`${API}/api/attendance`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ courseCode, score: correct }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    if (data.remaining !== undefined) {
      setAttemptInfo(a => ({ ...a, remaining: data.remaining, used: data.attemptsUsed, finalPresent: data.finalPresent, isLastAttempt: data.isLastAttempt }));
    }
    onComplete(courseCode, correct);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const timerColor = timeLeft <= 30 ? T.red : timeLeft <= 60 ? T.gold : T.green;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 680, margin: "0 auto" }}>
      <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button className="ghost-btn" onClick={onBack} disabled={phase === "quiz"} style={{ opacity: phase === "quiz" ? 0.3 : 1 }}>← BACK</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, fontFamily: "'Syne', sans-serif" }}>{course.name}</h2>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{courseCode} · ATTENDANCE QUIZ</div>
        </div>
        {phase === "quiz" && timeLeft !== null && (
          <div style={{ background: T.card, border: `2px solid ${timerColor}`, borderRadius: 10, padding: "8px 16px", textAlign: "center", minWidth: 80, boxShadow: `0 0 12px ${timerColor}44` }}>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>TIME LEFT</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: timerColor, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>{formatTime(timeLeft)}</div>
          </div>
        )}
      </div>

      {phase === "loading" && (
        <div className="fade-up-2" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>{course.icon}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Spinner size={16} /><span style={{ fontSize: 12, color: T.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>PREPARING YOUR QUESTIONS...</span>
          </div>
        </div>
      )}

      {phase === "blocked" && (
        <div className="fade-up-2" style={{ background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 14, padding: "36px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.red, fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>No Attempts Remaining</div>
          <p style={{ fontSize: 12, color: T.sub, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
            You have used all <strong style={{ color: T.text }}>{attemptInfo?.max}</strong> attempt{attemptInfo?.max > 1 ? "s" : ""} allowed for this quiz.<br />You have been marked <strong style={{ color: T.red }}>Absent</strong>. Contact your teacher if needed.
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {Array.from({ length: attemptInfo?.max || 1 }).map((_, i) => (
              <div key={i} style={{ width: 28, height: 8, borderRadius: 4, background: T.red }} />
            ))}
          </div>
        </div>
      )}

      {phase === "info" && (
        <div className="fade-up-2" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "32px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{course.icon}</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Syne', sans-serif" }}>Ready to take the quiz?</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Questions", value: "5", color: T.accent, icon: "❓" },
              { label: "Time Limit", value: `${attemptInfo?.timeLimit || 5} min`, color: T.gold, icon: "⏱" },
              { label: "Attempts Left", value: `${attemptInfo?.remaining ?? "—"} / ${attemptInfo?.max ?? "—"}`, color: attemptInfo?.remaining > 0 ? T.green : T.red, icon: "🔁" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Syne', sans-serif" }}>{value}</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: T.sub, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
              • Score <strong style={{ color: T.text }}>3 or above</strong> out of 5 to be marked <span style={{ color: T.green }}>Present</span><br />
              • Timer starts when you click Start<br />
              • Quiz auto-submits when time runs out<br />
              • You cannot go back once started
            </p>
          </div>

          {error && <p style={{ color: T.red, fontSize: 12, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</p>}
          <button className="primary-btn" style={{ width: "100%" }} onClick={startQuiz}>
            START QUIZ →
          </button>
        </div>
      )}

      {phase === "quiz" && questions.length > 0 && (
        <>
          {questions.map((q, i) => (
            <div key={i} className="fade-up" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px", marginBottom: 14, animationDelay: `${i * 0.05}s` }}>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", marginBottom: 8 }}>Q{i+1} / 5</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif", marginBottom: 14, lineHeight: 1.5 }}>{q.question}</div>
              {q.options.map((opt, j) => {
                const isSel = selected[i] === j;
                return (
                  <button key={j} className="opt-btn"
                    style={{ background: isSel ? T.accentDim : T.surface, border: `1px solid ${isSel ? T.accent : T.border}`, color: isSel ? T.accent : T.sub }}
                    onClick={() => setSelected(s => ({ ...s, [i]: j }))}>
                    <span style={{ opacity: 0.5, marginRight: 10 }}>{["A","B","C","D"][j]}.</span>{opt}
                  </button>
                );
              })}
            </div>
          ))}
          <button className="primary-btn" style={{ width: "100%" }}
            disabled={Object.keys(selected).length < questions.length}
            onClick={() => handleSubmit(false)}>
            SUBMIT QUIZ →
          </button>
        </>
      )}

      {phase === "result" && (
        <div className="fade-up">
          <div style={{ background: pass ? T.greenDim : T.redDim, border: `1px solid ${pass ? T.green : T.red}`, borderRadius: 12, padding: "36px 24px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: pass ? T.green : T.red, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>{score} / 5</div>
            <div style={{ fontSize: 12, color: pass ? T.green : T.red, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", marginTop: 8 }}>
              {pass ? "✓ ATTENDANCE MARKED — PRESENT" : attemptInfo?.remaining === 0 ? "✗ ALL ATTEMPTS USED — MARKED ABSENT" : "✗ NOT PASSED — TRY AGAIN"}
            </div>
          </div>

          {!pass && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>ATTEMPTS</span>
                <span style={{ fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: T.accent }}>{attemptInfo?.used}</span> / {attemptInfo?.max} used
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: attemptInfo?.max || 1 }).map((_, i) => (
                  <div key={i} style={{ width: 28, height: 8, borderRadius: 4, background: i < (attemptInfo?.used || 0) ? T.red : T.border, transition: "background 0.3s" }} />
                ))}
              </div>
              {attemptInfo?.remaining > 0 ? (
                <p style={{ fontSize: 11, color: T.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 10 }}>
                  You have <span style={{ color: T.green, fontWeight: 700 }}>{attemptInfo.remaining}</span> attempt{attemptInfo.remaining > 1 ? "s" : ""} remaining. Go back to try again.
                </p>
              ) : (
                <p style={{ fontSize: 11, color: T.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 10 }}>
                  No attempts remaining. You have been marked <strong>Absent</strong> for this quiz.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [user, setUser]                 = useState(undefined); 
  const [page, setPage]                 = useState("courses");
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");

    if (authStatus) window.history.replaceState({}, "", "/");

    fetch(`${API}/auth/me`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setUser(d.user || null);
        if (d.user) {
          if (!d.user.role || authStatus === "new") {
            setPage("onboarding");
          }
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL || ""}/auth/logout`, { credentials: "include" });
    setUser(null);
    setPage("courses");
  };

  const handleAddSubject = (code) => {
    setUser(u => ({ ...u, subjects: [...(u.subjects || []), code] }));
  };

  if (user === undefined) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <Spinner size={32} />
      </div>
    </>
  );

  if (!user) return <><style>{GLOBAL_CSS}</style><LoginPage /></>;

  if (!user.role || page === "onboarding") return (
    <>
      <style>{GLOBAL_CSS}</style>
      <OnboardingPage user={user} onComplete={(u) => { setUser(u); setPage("courses"); window.history.replaceState({}, "", "/"); }} />
    </>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Syne', sans-serif", color: T.text }}>
        <TopBar user={user} onLogout={handleLogout} />

        {user.role === "teacher" && page === "courses" && (
          <TeacherSubjectPicker user={user} onSelect={code => { setActiveCourse(code); setPage("dashboard"); }} onAddSubject={handleAddSubject} />
        )}
        {user.role === "teacher" && page === "dashboard" && (
          <TeacherDashboard user={user} courseCode={activeCourse} onChangeSubject={() => { setActiveCourse(null); setPage("courses"); }} />
        )}

        {user.role === "student" && page === "courses" && (
          <CourseSelection user={user} onSelect={code => { setActiveCourse(code); setPage("quiz"); }} />
        )}
        {user.role === "student" && page === "quiz" && (
          <QuizView user={user} courseCode={activeCourse} onBack={() => setPage("courses")} onComplete={() => {}} />
        )}
      </div>
    </>
  );
}
