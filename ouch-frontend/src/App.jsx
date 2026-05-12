import { useState, useEffect } from "react";
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_API_URL);

// ─── PALETTE ───────────────────────────────────────────────────────────────
const C = {
  orange: "#FF5733",
  teal: "#008080",
  bg: "#1A1A1A",
  card: "#242424",
  cardHover: "#2c2c2c",
  bone: "#F5F5F5",
  muted: "#888",
  border: "#333",
};

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${C.bg}; color: ${C.bone}; font-family: 'Barlow', sans-serif;
           min-height: 100dvh; overflow-x: hidden; }
    :root { --orange: ${C.orange}; --teal: ${C.teal}; }
    @keyframes pop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.35); }
      70%  { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-8px) rotate(-2deg); }
      40%     { transform: translateX(8px) rotate(2deg); }
      60%     { transform: translateX(-5px); }
      80%     { transform: translateX(5px); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes floatUp {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-80px) scale(1.4); }
    }
    @keyframes pulse {
      0%,100% { opacity: 1; }
      50%      { opacity: .5; }
    }
    .pop-anim   { animation: pop   .4s ease forwards; }
    .shake-anim { animation: shake .5s ease forwards; }
    .fade-up    { animation: fadeUp .35s ease both; }
    .float-label { position: absolute; pointer-events: none;
                   animation: floatUp .9s ease forwards; }
  `}</style>
);

// ─── HELPERS ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const CATEGORIES = ["Général", "Doigt", "Insulte", "Bras d'honneur", "Mauvaise foi", "Ta gueule", "Frappe"];
const AVATARS = ["🐯","🦊","🐸","🦁","🐙","🦄","🐼","🦋","🐺","🦖"];

const DEMO_ROOM = {
  id: "demo",
  name: "Les Dégénérés",
  code: "AX79L",
  members: [
    { userId: "u1", name: "Toi",   avatar: "🐯" },
    { userId: "u2", name: "Pote1", avatar: "🦊" },
    { userId: "u3", name: "Raph",  avatar: "🐸" },
    { userId: "u4", name: "Kev",   avatar: "🦁" },
  ],
  stats: {
    u1: { "Général": 3,  "Doigt": 0, "Insulte": 7,  "Bras d'honneur": 1,  "Mauvaise foi": 0,  "Ta gueule": 2, "Frappe": 1 },
    u2: { "Général": 12, "Doigt": 5, "Insulte": 45, "Bras d'honneur": 8,  "Mauvaise foi": 3,  "Ta gueule": 0, "Frappe": 0 },
    u3: { "Général": 6,  "Doigt": 0, "Insulte": 14, "Bras d'honneur": 22, "Mauvaise foi": 9,  "Ta gueule": 1, "Frappe": 0 },
    u4: { "Général": 8,  "Doigt": 3, "Insulte": 2,  "Bras d'honneur": 0,  "Mauvaise foi": 17, "Ta gueule": 3, "Frappe": 2 },
  },
  categories: CATEGORIES,
};

const totalScore = (stats, userId) => {
  if (!stats || !userId) return 0;
  const s = stats[userId];
  if (!s || typeof s !== "object") return 0;
  return Object.values(s).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
};

// ─── COMPOSANTS DE BASE ────────────────────────────────────────────────────
function Logo({ size = 48 }) {
  return (
    <svg width={size * 2.8} height={size} viewBox="0 0 140 50" aria-label="Ouch.">
      <polygon points="25,4 28,15 38,8 33,18 44,16 35,24 44,30 33,30 37,41 27,34 25,46 23,34 13,41 17,30 6,30 15,24 6,16 17,18 12,8 22,15"
        fill={C.orange} opacity=".9" />
      <text x="22" y="34" textAnchor="middle" fontSize="26" fontFamily="Bebas Neue" fill={C.bg} fontWeight="900">O</text>
      <rect x="15" y="21" width="14" height="5" rx="2" fill="#F5F5DC" opacity=".9" />
      <line x1="17" y1="23.5" x2="20" y2="23.5" stroke="#d4b896" strokeWidth=".8" />
      <line x1="22" y1="23.5" x2="25" y2="23.5" stroke="#d4b896" strokeWidth=".8" />
      <text x="43" y="37" fontSize="30" fontFamily="Bebas Neue" fill={C.bone} letterSpacing="1">UCH.</text>
    </svg>
  );
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled }) {
  const base = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 24px", borderRadius: 16, fontFamily: "Barlow", fontSize: 17,
    fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", transition: "all .18s ease", width: "100%",
    opacity: disabled ? .5 : 1,
  };
  const variants = {
    primary:   { background: C.orange, color: "#fff" },
    secondary: { background: C.card, color: C.bone, border: `1.5px solid ${C.border}` },
    teal:      { background: C.teal, color: "#fff" },
    ghost:     { background: "transparent", color: C.muted, border: `1.5px solid ${C.border}` },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.filter = "brightness(1.12)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "")}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "")}
    >{children}</button>
  );
}

function Input({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{label}</label>}
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        style={{
          background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12,
          padding: "13px 16px", color: C.bone, fontSize: 16, fontFamily: "Barlow",
          outline: "none", transition: "border-color .2s",
        }}
        onFocus={e => (e.target.style.borderColor = C.orange)}
        onBlur={e => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

function Screen({ children, style = {} }) {
  return (
    <div style={{
      minHeight: "100dvh", maxWidth: 430, margin: "0 auto",
      padding: "24px 20px 40px", display: "flex", flexDirection: "column",
      gap: 20, ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────

function PageLogin({ onLogin }) {
  const [name, setName] = useState("");
  const [avatarIdx, setAvatarIdx] = useState(0);
  return (
    <Screen style={{ justifyContent: "center" }}>
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 12 }}>
        <Logo size={52} />
        <p style={{ color: C.muted, marginTop: 10, fontSize: 15 }}>Le trash-talk entre potes, enfin organisé.</p>
      </div>
      <div className="fade-up" style={{ animationDelay: ".1s" }}>
        <p style={{ textAlign: "center", fontSize: 13, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Ton avatar</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          {AVATARS.map((a, i) => (
            <button key={i} onClick={() => setAvatarIdx(i)} style={{
              fontSize: 28, background: i === avatarIdx ? C.orange : C.card,
              border: i === avatarIdx ? `2px solid ${C.orange}` : `1.5px solid ${C.border}`,
              borderRadius: 12, width: 52, height: 52, cursor: "pointer",
              transform: i === avatarIdx ? "scale(1.15)" : "scale(1)", transition: "all .2s",
            }}>{a}</button>
          ))}
        </div>
      </div>
      <div className="fade-up" style={{ animationDelay: ".2s" }}>
        <Input label="Ton surnom" value={name} onChange={setName} placeholder="ex: KingSlayer" maxLength={20} />
      </div>
      <div className="fade-up" style={{ animationDelay: ".3s" }}>
        <Btn onClick={() => name.trim() && onLogin({ name: name.trim(), avatar: AVATARS[avatarIdx] })} disabled={!name.trim()}>
          Entrer dans l'arène 💥
        </Btn>
      </div>
      <p className="fade-up" style={{ textAlign: "center", fontSize: 12, color: C.muted, animationDelay: ".4s" }}>
        Aucun compte requis · 100% entre potes
      </p>
    </Screen>
  );
}

function PageHome({ user, onCreate, onJoin }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={32} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{user.avatar}</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</span>
        </div>
      </div>
      <div className="fade-up" style={{ marginTop: 20 }}>
        <h1 style={{ fontFamily: "Bebas Neue", fontSize: 42, lineHeight: 1, color: C.bone }}>
          PRÊT À<br /><span style={{ color: C.orange }}>EN PRENDRE ?</span>
        </h1>
      </div>
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12, animationDelay: ".1s" }}>
        <Btn onClick={onCreate}>🎮 Créer un salon</Btn>
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ height: 1, background: C.border }} />
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: C.bg, padding: "0 12px", fontSize: 13, color: C.muted }}>ou</span>
        </div>
        {!joining ? (
          <Btn variant="secondary" onClick={() => setJoining(true)}>🔗 Rejoindre avec un code</Btn>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Code du salon" value={code} onChange={setCode} placeholder="ex: AX79L" maxLength={6} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setJoining(false)} style={{ flex: 1 }}>Annuler</Btn>
              <Btn variant="teal" onClick={() => code.trim() && onJoin(code.trim().toUpperCase())} disabled={!code.trim()} style={{ flex: 2 }}>Rejoindre</Btn>
            </div>
          </div>
        )}
      </div>
      <div className="fade-up" style={{ marginTop: "auto", background: C.card, borderRadius: 16, padding: "16px 20px", border: `1.5px solid ${C.border}`, animationDelay: ".2s" }}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>👁️ Voir la démo avec des potes fictifs</p>
        <Btn variant="ghost" onClick={() => onJoin("DEMO")} style={{ padding: "10px 16px", fontSize: 14 }}>
          Charger "Les Dégénérés" →
        </Btn>
      </div>
    </Screen>
  );
}

function PageCreateRoom({ user, onCreated, onBack }) {
  const [roomName, setRoomName] = useState("");
  const [cats, setCats] = useState([...CATEGORIES]);
  const [newCat, setNewCat] = useState("");

  const toggleCat = (c) => setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const addCat = () => {
    if (newCat.trim() && !cats.includes(newCat.trim())) { setCats(prev => [...prev, newCat.trim()]); setNewCat(""); }
  };
  const create = () => {
    if (!roomName.trim()) return;
    onCreated({ name: roomName.trim(), categories: cats });
  };

  return (
    <Screen>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, width: "fit-content" }}>← Retour</button>
      <h2 style={{ fontFamily: "Bebas Neue", fontSize: 34, color: C.orange }}>NOUVEAU SALON</h2>
      <Input label="Nom du salon" value={roomName} onChange={setRoomName} placeholder="ex: Les Dégénérés" maxLength={30} />
      <div>
        <p style={{ fontSize: 13, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Catégories</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 13, fontFamily: "Barlow", fontWeight: 600, cursor: "pointer",
              background: cats.includes(c) ? C.orange : C.card, color: cats.includes(c) ? "#fff" : C.muted,
              border: `1.5px solid ${cats.includes(c) ? C.orange : C.border}`, transition: "all .15s",
            }}>{c}</button>
          ))}
          {cats.filter(c => !CATEGORIES.includes(c)).map(c => (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 13, fontFamily: "Barlow", fontWeight: 600, cursor: "pointer",
              background: C.teal, color: "#fff", border: `1.5px solid ${C.teal}`,
            }}>{c} ✕</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()}
            placeholder="+ Ajouter une catégorie" maxLength={20}
            style={{ flex: 1, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.bone, fontSize: 14, fontFamily: "Barlow", outline: "none" }} />
          <button onClick={addCat} style={{ background: C.teal, border: "none", borderRadius: 10, padding: "10px 16px", color: "#fff", fontSize: 20, cursor: "pointer" }}>+</button>
        </div>
      </div>
      <Btn onClick={create} disabled={!roomName.trim() || cats.length === 0} style={{ marginTop: "auto" }}>
        Créer & Inviter les potes 🚀
      </Btn>
    </Screen>
  );
}

function PageWaiting({ room, user, onStart, onBack }) {
  const [copied, setCopied] = useState(false);
  const code = room.inviteCode || room.code;
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Screen>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, width: "fit-content" }}>← Retour</button>
      <h2 style={{ fontFamily: "Bebas Neue", fontSize: 34 }}>{room.name}</h2>
      <div style={{ textAlign: "center", background: C.card, borderRadius: 20, padding: "28px 24px", border: `2px dashed ${C.orange}` }}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>CODE D'INVITATION</p>
        <p style={{ fontFamily: "Bebas Neue", fontSize: 56, color: C.orange, letterSpacing: 8 }}>{code}</p>
        <Btn variant="secondary" onClick={copy} style={{ marginTop: 16, padding: "10px 20px", fontSize: 14 }}>
          {copied ? "✅ Copié !" : "📋 Copier le code"}
        </Btn>
      </div>
      <div>
        <p style={{ fontSize: 13, color: C.muted, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>MEMBRES ({room.members.length})</p>
        {room.members.map(m => (
          <div key={m.userId || m._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.card, borderRadius: 12, marginBottom: 8, border: `1.5px solid ${C.border}` }}>
            <span style={{ fontSize: 24 }}>{m.avatar}</span>
            <span style={{ fontWeight: 700 }}>{m.name}</span>
            {m.name === user.name && <span style={{ marginLeft: "auto", fontSize: 12, color: C.orange, fontWeight: 600 }}>TOI</span>}
          </div>
        ))}
        <div style={{ padding: "12px 16px", borderRadius: 12, border: `1.5px dashed ${C.border}`, textAlign: "center", color: C.muted, fontSize: 14 }}>
          En attente d'autres potes… <span style={{ animation: "pulse 1.4s ease infinite", display: "inline-block" }}>⏳</span>
        </div>
      </div>
      <Btn onClick={onStart}>Lancer le duel 🔥</Btn>
    </Screen>
  );
}

function PageDuel({ room: initialRoom, user, myUserId, onStats, onBack }) {
  const [room, setRoom] = useState(initialRoom);
  const [selectedCat, setSelectedCat] = useState((initialRoom.categories || CATEGORIES)[0]);
  const [floatLabels, setFloatLabels] = useState([]);
  const [shaking, setShaking] = useState(null);
  const [popping, setPopping] = useState(null);

  useEffect(() => {
    socket.on("room_updated", (updatedRoom) => {
      setRoom(updatedRoom);
    });
    socket.on("punch_received", ({ targetId, stats }) => {
      setRoom(prev => ({ ...prev, stats }));
      setShaking(targetId);
      setPopping(targetId);
      setTimeout(() => setShaking(null), 500);
      setTimeout(() => setPopping(null), 400);
      const label = { id: Date.now() + Math.random(), text: selectedCat, targetId };
      setFloatLabels(p => [...p, label]);
      setTimeout(() => setFloatLabels(p => p.filter(l => l.id !== label.id)), 900);
    });
    return () => {
      socket.off("room_updated");
      socket.off("punch_received");
    };
  }, [selectedCat]);

  const punch = (targetUserId) => {
    if (!targetUserId || targetUserId === myUserId) return;
    socket.emit("punch", {
      code: room.inviteCode || room.code,
      targetId: targetUserId,
      category: selectedCat,
    });
  };

  const cats = room.categories || CATEGORIES;

  return (
    <Screen style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>← Quitter</button>
        <span style={{ fontFamily: "Bebas Neue", fontSize: 20, color: C.orange }}>{room.name}</span>
        <button onClick={onStats} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Stats 📊</button>
      </div>

      <div>
        <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Type d'insulte</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setSelectedCat(c)} style={{
              whiteSpace: "nowrap", padding: "8px 14px", borderRadius: 20, fontSize: 13,
              fontFamily: "Barlow", fontWeight: 700, cursor: "pointer",
              background: selectedCat === c ? C.orange : C.card,
              color: selectedCat === c ? "#fff" : C.muted,
              border: `1.5px solid ${selectedCat === c ? C.orange : C.border}`,
              transition: "all .15s", flexShrink: 0,
            }}>{c}</button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Touche quelqu'un 👇</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
        {room.members.map(m => {
          const memberId = m.userId || m.id;
          const total = totalScore(room.stats, memberId);
          const isMe = memberId === myUserId;
          const isShaking = shaking === memberId;
          const isPopping = popping === memberId;
          const myFloats = floatLabels.filter(l => l.targetId === memberId);

          return (
            <div key={memberId} style={{ position: "relative" }}>
              {myFloats.map(l => (
                <div key={l.id} className="float-label" style={{
                  top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  background: C.orange, color: "#fff", padding: "4px 10px",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 10, whiteSpace: "nowrap",
                }}>{l.text}</div>
              ))}
              <button
                onClick={() => punch(memberId)}
                disabled={isMe}
                className={isShaking ? "shake-anim" : ""}
                style={{
                  width: "100%", minHeight: 160,
                  background: isMe ? "#1e1e1e" : C.card,
                  border: `2px solid ${isMe ? C.border : (isPopping ? C.orange : C.border)}`,
                  borderRadius: 20, cursor: isMe ? "default" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 8, padding: 16,
                  transition: "border-color .2s, background .2s",
                  position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => !isMe && (e.currentTarget.style.background = C.cardHover)}
                onMouseLeave={e => (e.currentTarget.style.background = isMe ? "#1e1e1e" : C.card)}
              >
                {isPopping && (
                  <div style={{ position: "absolute", inset: 0, background: `${C.orange}22`, borderRadius: 18, pointerEvents: "none", animation: "pop .4s ease forwards" }} />
                )}
                <span style={{ fontSize: 42, animation: isPopping ? "pop .4s ease forwards" : "none" }}>{m.avatar}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: isMe ? C.muted : C.bone }}>{m.name}</span>
                {isMe && <span style={{ fontSize: 11, color: C.muted }}>C'est toi</span>}
                <div style={{ background: isMe ? C.border : (total > 20 ? C.orange : C.teal), borderRadius: 20, padding: "4px 12px", minWidth: 50, textAlign: "center" }}>
                  <span style={{ fontFamily: "Bebas Neue", fontSize: 22, color: "#fff", animation: isPopping ? "pop .4s ease forwards" : "none" }}>{total}</span>
                </div>
                {!isMe && room.stats[memberId] && (
                  <div style={{ width: "100%", marginTop: 4 }}>
                    {Object.entries(room.stats[memberId])
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 2)
                      .map(([cat, val]) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 2 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{cat}</span>
                          <span style={{ color: C.orange, fontWeight: 700 }}>{val}</span>
                        </div>
                      ))}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
        Catégorie active : <strong style={{ color: C.orange }}>{selectedCat}</strong>
      </p>
    </Screen>
  );
}

function PageStats({ room, onBack }) {
  const members = room.members.map(m => ({ ...m, _key: m.userId || m.id }));
  const sorted = [...members].sort((a, b) => totalScore(room.stats, b._key) - totalScore(room.stats, a._key));
  const maxScore = Math.max(...members.map(m => totalScore(room.stats, m._key)), 1);
  const allCats = room.categories || CATEGORIES;
  const [selected, setSelected] = useState(sorted[0]?._key);

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>← Retour</button>
        <h2 style={{ fontFamily: "Bebas Neue", fontSize: 28 }}>📊 CLASSEMENT</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((m, i) => {
          const score = totalScore(room.stats, m._key);
          const pct = (score / maxScore) * 100;
          const medal = ["🥇", "🥈", "🥉"][i] || "👤";
          return (
            <div key={m._key} onClick={() => setSelected(m._key)} style={{
              background: selected === m._key ? "#2a2a2a" : C.card, borderRadius: 16, padding: "14px 16px",
              border: `1.5px solid ${selected === m._key ? C.orange : C.border}`, cursor: "pointer", transition: "all .2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{medal}</span>
                <span style={{ fontSize: 22 }}>{m.avatar}</span>
                <span style={{ fontWeight: 700, flex: 1 }}>{m.name}</span>
                <span style={{ fontFamily: "Bebas Neue", fontSize: 28, color: i === 0 ? C.orange : C.teal }}>{score}</span>
              </div>
              <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: i === 0 ? C.orange : C.teal, width: `${pct}%`, transition: "width .6s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      {selected && (
        <div className="fade-up" style={{ background: C.card, borderRadius: 20, padding: "20px 18px", border: `1.5px solid ${C.border}` }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: C.bone }}>
            {members.find(m => m._key === selected)?.avatar} Détail de {members.find(m => m._key === selected)?.name}
          </p>
          {allCats.map(cat => {
            const val = room.stats[selected]?.[cat] || 0;
            const catMax = Math.max(...members.map(m => room.stats[m._key]?.[cat] || 0), 1);
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: val > 0 ? C.bone : C.muted }}>{cat}</span>
                  <span style={{ fontWeight: 700, color: val > 0 ? C.orange : C.muted }}>{val}</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.orange}, ${C.teal})`, width: `${(val / catMax) * 100}%`, transition: "width .5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Btn variant="ghost" onClick={onBack}>Retourner au duel 🥊</Btn>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);

  const [myUserId] = useState(() => {
    const stored = localStorage.getItem("ouch_user_id");
    if (stored) return stored;
    const newId = uid();
    localStorage.setItem("ouch_user_id", newId);
    return newId;
  });

  useEffect(() => {
    const keepAlive = setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {});
    }, 13 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  const handleLogin = (u) => { setUser(u); setPage("home"); };
  const handleCreate = () => setPage("create");

const handleCreated = async (r) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: r.name,
      categories: r.categories,
      userId: myUserId,
      userName: user.name,
      userAvatar: user.avatar,
    }),
  });
  const roomFromDB = await res.json();
  const stats = roomFromDB.stats || {};
  roomFromDB.members?.forEach(m => {
    const id = m.userId || m.id;
    if (!stats[id]) stats[id] = {};
  });
  setRoom({ ...roomFromDB, stats, code: roomFromDB.inviteCode });
  setPage("waiting");
};

const handleJoin = (code) => {
  if (code === "DEMO") {
    setRoom({ ...DEMO_ROOM });
    setPage("duel");
    return;
  }
  socket.emit("join_room", {
    code,
    userId: myUserId,
    userName: user?.name || "Toi",
    userAvatar: user?.avatar || "🐯",
  }, (response) => {
    if (response.error) return alert("Salon introuvable !");
    const room = response.room;
    // S'assurer que chaque membre a ses stats initialisées
    const stats = room.stats || {};
    room.members.forEach(m => {
      const id = m.userId || m.id;
      if (!stats[id]) stats[id] = {};
    });
    setRoom({ ...room, stats, code: room.inviteCode || room.code });
    setPage("duel");
  });
};

  const handleStart = () => {
    socket.emit("join_room", {
      code: room.inviteCode || room.code,
      userId: myUserId,
      userName: user?.name || "Toi",
      userAvatar: user?.avatar || "🐯",
    }, () => {});
    setPage("duel");
  };

  return (
    <>
      <GlobalStyle />
      {page === "login"   && <PageLogin onLogin={handleLogin} />}
      {page === "home"    && <PageHome user={user} onCreate={handleCreate} onJoin={handleJoin} />}
      {page === "create"  && <PageCreateRoom user={user} onCreated={handleCreated} onBack={() => setPage("home")} />}
      {page === "waiting" && room && <PageWaiting room={room} user={user} onStart={handleStart} onBack={() => setPage("home")} />}
      {page === "duel"    && room && <PageDuel room={room} user={user} myUserId={myUserId} onStats={() => setPage("stats")} onBack={() => setPage("home")} />}
      {page === "stats"   && room && <PageStats room={room} onBack={() => setPage("duel")} />}
    </>
  );
}