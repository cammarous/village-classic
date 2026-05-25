import { useState, useEffect } from "react";

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
const TRIP_DATE = new Date("2026-09-03T16:00:00");
const PAR = 72;
const BUFFER = 3;

const LOGO_URL = "https://drive.google.com/thumbnail?id=1TeG2PH0241YAFjNfGuOotE9jD0-eXW5n&sz=w200";

const PLAYER_PHOTOS = {
  "Ian": "https://drive.google.com/thumbnail?id=14KI-eayI064_lE9nudlF98E8IPX96-q5&sz=w200",
  "Ben": "https://drive.google.com/thumbnail?id=1rUEsrVtW5rkUb8Bx09CSwKkOKZxBYfQM&sz=w200",
  "John": "https://drive.google.com/thumbnail?id=1bxRrvDRYcxMPM7qL_Vn1uD8rQw0TSpDB&sz=w200",
  "Brian": "https://drive.google.com/thumbnail?id=1dD23vAJ0B645R-qPM8n66_6ku8YTXRQY&sz=w200",
  "Sam": "https://drive.google.com/thumbnail?id=1-yxLTEP16FFED3QW5q6OJZw-f70V7ONU&sz=w200",
  "Mason": "https://drive.google.com/thumbnail?id=1TvzuoSDHPDjbdc9oFCZWo7EIyWO7c61g&sz=w200",
};

const TEAM_CHAMPIONS_PHOTO = "https://drive.google.com/thumbnail?id=1pb678efseT4cltOfWh-RPbWNcReY36bJ&sz=w800";

const COURSES = [
  {
    name: "Coral Canyon Golf Course",
    day: "Friday, September 4th",
    location: "Washington, Utah",
    par: 72,
    yards: "7,200",
    website: "https://coralcanyongolf.com",
    description: "Designed by Keith Foster, Coral Canyon sits in the heart of 'Color Country' just north of St. George. The 7,200-yard layout winds through dramatic desert washes and red rock outcroppings with 40-mile views on several fairways. Consistently ranked among Utah's best public courses, the par-3 sixth hole — nestled among red rock formations — is the signature. Fairways are forgiving, but the desert washes and strategic bunkering demand respect.",
    highlights: ["40-mile panoramic views", "Signature par-3 6th hole", "55 strategic sand bunkers", "Golfweek Top 4 in Utah"],
    image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80",
  },
  {
    name: "Sand Hollow Resort",
    day: "Saturday, September 5th",
    location: "Hurricane, Utah",
    par: 72,
    yards: "7,000+",
    website: "https://sandhollowresort.com",
    description: "Consistently ranked #1 in Utah by Golfweek and a Top 100 Resort Course nationally, Sand Hollow is the marquee round of the trip. Designed by John Fought, the front nine rolls through sage and orange-tinted bunkers before the back nine delivers one of the most dramatic stretches in the country. Holes 11–15 play along the edges of jagged canyon cliffs with views of Zion National Park in the distance. Bring your A-game — and your camera.",
    highlights: ["#1 course in Utah (Golfweek)", "Top 100 Resort Course nationally", "Canyon cliffside holes 11–15", "Views of Zion National Park"],
    image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80",
  },
  {
    name: "Copper Rock Golf Course",
    day: "Sunday, September 6th — Championship Round",
    location: "Hurricane, Utah",
    par: 72,
    yards: "6,901",
    website: "https://www.golfstgeorgenow.com/golf-course/copper-rock-golf-course",
    description: "Opened in 2020, Copper Rock is the newest gem in Southern Utah. The adventurous 6,901-yard layout forges across native sagebrush dunes against a backdrop of rustic sandstone formations with sweeping views of the Pine Valley Mountains, Hurricane Cliffs, and Zion National Park. The front nine offers risk-reward short par-4s and a stout par-5 with a 75-yard-long green. The back nine rolls up and over two hills for dramatic long views. The 9th and 18th greens share a putting surface — separated by a nasty bunker — making for an unforgettable finish.",
    highlights: ["Shared 9th/18th green with center bunker", "Native sagebrush dunes layout", "Views of Hurricane Cliffs & Zion", "Championship Sunday — 1v1 Matchplay"],
    image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80",
  },
];

const SCHEDULE = [
  {
    day: "Thursday", date: "September 3rd", icon: "🏠",
    events: [
      { time: "4:00 PM", event: "Airbnb Check-In / Arrival", note: "" },
      { time: "Evening", event: "Live Team Draft", note: "Captains set Day 1 matchups" },
      { time: "Evening", event: "Baseball", note: "First point of the trip — 1pt" },
      { time: "Evening", event: "Dinner", note: "" },
    ]
  },
  {
    day: "Friday", date: "September 4th", icon: "⛳",
    course: "Coral Canyon Golf Course",
    events: [
      { time: "Breakfast", event: "On Your Own", note: "" },
      { time: "8:30 AM", event: "Morning Round", note: "Individual Competition · 2v2 Matchplay" },
      { time: "Midday", event: "Lunch at Course", note: "Captains set afternoon matchups" },
      { time: "2:40 PM", event: "Afternoon Round", note: "Fun Format · 2v2 Scramble / Alt Shot" },
      { time: "Evening", event: "Dinner at Home", note: "" },
    ]
  },
  {
    day: "Saturday", date: "September 5th", icon: "🏌️",
    course: "Sand Hollow Resort",
    events: [
      { time: "Breakfast", event: "On Your Own", note: "" },
      { time: "7:40 AM", event: "Morning Round", note: "Individual Competition · 2v2 Matchplay" },
      { time: "Midday", event: "Lunch at Course", note: "Captains set afternoon matchups" },
      { time: "3:00 PM", event: "Afternoon Round", note: "Fun Format · 2v2 Scramble / Alt Shot" },
      { time: "Evening", event: "Dinner", note: "Captains make singles pairings" },
    ]
  },
  {
    day: "Sunday", date: "September 6th", icon: "🏆",
    course: "Copper Rock Golf Course",
    events: [
      { time: "9:36 AM", event: "Championship Round", note: "Individual Championship · 1v1 Matchplay" },
      { time: "Post-Round", event: "Championship Award Ceremony", note: "" },
      { time: "Afternoon", event: "Group Hang at Airbnb", note: "" },
    ]
  },
  {
    day: "Monday", date: "September 7th", icon: "✈️",
    events: [
      { time: "10:00 AM", event: "Airbnb Checkout", note: "" },
      { time: "TBD", event: "Depart", note: "St. George or Las Vegas Airport" },
    ]
  },
];

const POINTS = [
  { event: "Baseball (Thursday)", format: "TBD", pts: 1, day: "Thu" },
  { event: "Coral Canyon — 2v2 Matchplay", format: "1pt per match (4 total)", pts: 4, day: "Fri AM" },
  { event: "Coral Canyon — 2v2 Scramble/Alt Shot", format: "1pt per match (4 total)", pts: 4, day: "Fri PM" },
  { event: "Sand Hollow — 2v2 Matchplay", format: "1pt per match (4 total)", pts: 4, day: "Sat AM" },
  { event: "Sand Hollow — 2v2 Scramble/Alt Shot", format: "1pt per match (4 total)", pts: 4, day: "Sat PM" },
  { event: "Copper Rock — 1v1 Singles", format: "1pt per match (8 total)", pts: 8, day: "Sun" },
];

const PACKING_LIST = [
  { category: "Golf Gear", items: ["Golf Clubs", "Golf Shoes", "Golf Balls", "Golf Gloves", "3 Days of Golf Outfits", "Hats"] },
  { category: "Clothing", items: ["Evening / Dinner Outfits", "Lounging / Room Clothes", "Swimsuit", "Casual Shoes", "Belts", "Jackets", "Socks", "Underwear"] },
  { category: "Toiletries", items: ["Deodorant", "Toothpaste", "Towel (pool and shower)"] },
  { category: "Travel", items: ["Flight Info", "ID / Passport", "Phone Charger"] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  return lines.map(line => {
    const cols = []; let current = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { cols.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    cols.push(current.trim());
    return cols;
  });
}
function parsePlayers(csv) {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  return rows.slice(1).filter(r => r[0]?.trim()).map((r, i) => ({
    id: i + 1, name: r[0].trim(), handicap: parseFloat(r[1]) || 0,
    rounds: r.slice(2).map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0),
  }));
}
function parseArticles(csv) {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  return rows.slice(1).filter(r => r[0]?.trim()).map((r, i) => ({
    id: i + 1, title: r[0]?.trim() || "", date: r[1]?.trim() || "",
    author: r[2]?.trim() || "Commissioner", body: r[3]?.trim() || "",
  }));
}
function target(h) { return PAR + h + BUFFER; }
function avgScore(rounds) { return rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : null; }
function avgVsTarget(rounds, h) { const a = avgScore(rounds); return a !== null ? a - target(h) : null; }
function getRanked(players) {
  return [...players].filter(p => p.rounds.length > 0)
    .sort((a, b) => avgVsTarget(a.rounds, a.handicap) - avgVsTarget(b.rounds, b.handicap));
}
function getRecentRounds(players, count = 5) {
  const all = [];
  players.forEach(p => p.rounds.forEach((score, i) => all.push({ player: p, score, roundNum: i + 1 })));
  return all.slice(-count).reverse();
}
function getFirstName(name) { return name.split(" ")[0]; }
function getPhotoUrl(name) { return PLAYER_PHOTOS[getFirstName(name)] || null; }
function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function useCountdown() {
  const [t, setT] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = TRIP_DATE - new Date();
      if (diff <= 0) return setT({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setT({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
    };
    calc(); const id = setInterval(calc, 1000); return () => clearInterval(id);
  }, []);
  return t;
}

// ── Components ────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }) {
  const [imgError, setImgError] = useState(false);
  const photo = getPhotoUrl(name);
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#8B3A0F", "#5C2D0A", "#A0522D", "#6B3A1F", "#7A3B1E", "#4A2010"];
  const idx = ((ini.charCodeAt(0) || 0) + (ini.charCodeAt(1) || 0)) % palette.length;
  if (photo && !imgError) {
    return <img src={photo} onError={() => setImgError(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: "50%", background: palette[idx], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.35, fontFamily: "'Playfair Display',serif", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }}>{ini}</div>;
}

function ScoreBadge({ val, size = "md" }) {
  if (val === null) return <span style={{ color: "#a08060" }}>—</span>;
  const color = val < 0 ? "#4CAF50" : val === 0 ? "#FFC107" : "#ef5350";
  const label = val === 0 ? "E" : val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: size === "lg" ? "4px 14px" : "2px 9px", fontWeight: 700, fontSize: size === "lg" ? 20 : 13, fontFamily: "monospace", letterSpacing: 1 }}>{label}</span>;
}

function Medal({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return <span style={{ color: "#a08060", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>#{rank}</span>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #e86a2f", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#a08060", fontSize: 14 }}>Loading live data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const countdown = useCountdown();

  async function loadData() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/sheet");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { playersCSV, articlesCSV } = await res.json();
      setPlayers(parsePlayers(playersCSV));
      setArticles(parseArticles(articlesCSV));
      setLastUpdated(new Date());
    } catch (e) { setError(e.message || "Unknown error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { const id = setInterval(loadData, 5 * 60 * 1000); return () => clearInterval(id); }, []);

  const ranked = getRanked(players);
  const totalRounds = players.reduce((a, p) => a + p.rounds.length, 0);
  const s = styles;

  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "draftboard", label: "Draft Board", icon: "🏆" },
    { key: "players", label: "Players", icon: "👤" },
    { key: "itinerary", label: "Itinerary", icon: "📅" },
    { key: "points", label: "Points", icon: "🏅" },
    { key: "tripdetails", label: "Trip Details", icon: "🗺️" },
    { key: "news", label: "News", icon: "📰" },
    { key: "history", label: "History", icon: "🏛️" },
  ];

  function navigate(key) { setPage(key); setSelectedPlayer(null); setSelectedArticle(null); setMenuOpen(false); }

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button:hover{opacity:0.88;}
        .pc:hover{border-color:rgba(232,106,47,0.4)!important;background:rgba(232,106,47,0.08)!important;}
        .lr:hover{background:rgba(232,106,47,0.06)!important;}
        .ac:hover{border-color:rgba(232,106,47,0.3)!important;}
        .nav-item:hover{background:rgba(232,106,47,0.12)!important;color:#e86a2f!important;}
        textarea{font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:#1a0e06;} ::-webkit-scrollbar-thumb{background:#5c2d0a;border-radius:3px;}
      `}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("home")}>
            <img src={LOGO_URL} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
            <div>
              <div style={s.logoName}>The Village Classic</div>
              <div style={s.logoSub}>Golf Trip · St. George, Utah · September 2026</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdated && <div style={{ color: "#a08060", fontSize: 11 }}>Updated {lastUpdated.toLocaleTimeString()}</div>}
            <button style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={loadData}>↻</button>
            <button style={s.hamburger} onClick={() => setMenuOpen(m => !m)}>
              <div style={{ ...s.hamburgerLine, ...(menuOpen ? { transform: "rotate(45deg) translate(5px,5px)" } : {}) }} />
              <div style={{ ...s.hamburgerLine, ...(menuOpen ? { opacity: 0 } : {}) }} />
              <div style={{ ...s.hamburgerLine, ...(menuOpen ? { transform: "rotate(-45deg) translate(5px,-5px)" } : {}) }} />
            </button>
          </div>
        </div>
        {/* Desktop nav */}
        <div style={s.desktopNav}>
          {navItems.map(n => (
            <button key={n.key} className="nav-item" style={{ ...s.navBtn, ...(page === n.key ? s.navActive : {}) }} onClick={() => navigate(n.key)}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div style={s.mobileMenu}>
            {navItems.map(n => (
              <button key={n.key} style={{ ...s.mobileMenuItem, ...(page === n.key ? s.mobileMenuItemActive : {}) }} onClick={() => navigate(n.key)}>
                <span style={{ fontSize: 18 }}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.main}>
        {loading && <Spinner />}
        {!loading && error && (
          <div style={{ background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: "#ef5350", fontWeight: 600, marginBottom: 8 }}>Couldn't load sheet data</div>
            <div style={{ color: "#a08060", fontSize: 13, marginBottom: 20 }}>{error}</div>
            <button style={s.btnPrimary} onClick={loadData}>Try Again</button>
          </div>
        )}
        {!loading && !error && (
          <>
            {/* ── HOME ─────────────────────────────────────────────────── */}
            {page === "home" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {/* Hero */}
                <div style={s.heroCard}>
                  <img src={LOGO_URL} style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", marginBottom: 16, border: "3px solid rgba(255,255,255,0.2)" }} onError={e => e.target.style.display = "none"} />
                  <div style={s.heroLabel}>⛳ St. George, Utah</div>
                  <div style={s.heroTitle}>The Village Classic 2026</div>
                  <div style={s.heroSub}>September 3–7 · Coral Canyon · Sand Hollow · Copper Rock</div>
                  <div style={s.countdownRow}>
                    {[["days", "Days"], ["hours", "Hrs"], ["minutes", "Min"], ["seconds", "Sec"]].map(([k, l]) => (
                      <div key={k} style={s.countdownBox}>
                        <div style={s.countdownNum}>{String(countdown[k] ?? 0).padStart(2, "0")}</div>
                        <div style={s.countdownLabel}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: "#c4956a", fontSize: 13 }}>
                    {players.length} players · {totalRounds} rounds logged · {articles.length} dispatches
                  </div>
                </div>

                {/* Teams callout */}
                <div style={s.teamsCard}>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#f5e6d0" }}>The Teams</div>
                    <div style={{ color: "#a08060", fontSize: 13, marginTop: 4 }}>Captains set. Draft on Thursday night.</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                    {[{ name: "Team John", captain: "John Mullin", color: "#c1440e" }, { name: "Team Brian", captain: "Brian Dalidowicz", color: "#1d4e89" }].map(team => (
                      <div key={team.name} style={{ flex: 1, minWidth: 180, background: team.color + "22", border: `2px solid ${team.color}55`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>🏴</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "#f5e6d0" }}>{team.name}</div>
                        <div style={{ color: "#a08060", fontSize: 12, marginTop: 4 }}>Captain: {team.captain}</div>
                        <div style={{ color: "#a08060", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>Roster TBD after draft</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    <button style={{ ...s.btnGhost, fontSize: 12 }} onClick={() => navigate("points")}>View Full Points System →</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Top 5 */}
                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>🏆 Draft Board — Top 5</span>
                      <button style={s.homeSectionLink} onClick={() => navigate("draftboard")}>Full standings →</button>
                    </div>
                    {ranked.length === 0
                      ? <div style={{ color: "#a08060", fontSize: 13, fontStyle: "italic" }}>No rounds logged yet.</div>
                      : ranked.slice(0, 5).map((p, i) => (
                        <div key={p.id} className="lr" style={s.miniRow} onClick={() => { setSelectedPlayer(p); navigate("players"); }}>
                          <div style={{ width: 26, textAlign: "center", flexShrink: 0 }}><Medal rank={i + 1} /></div>
                          <Avatar name={p.name} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f5e6d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#a08060" }}>HCP {p.handicap} · {p.rounds.length} rds</div>
                          </div>
                          <ScoreBadge val={avgVsTarget(p.rounds, p.handicap)} />
                        </div>
                      ))
                    }
                  </div>
                  {/* Recent Rounds */}
                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>🕐 Recent Rounds</span>
                      <button style={s.homeSectionLink} onClick={() => navigate("players")}>All players →</button>
                    </div>
                    {getRecentRounds(players, 5).length === 0
                      ? <div style={{ color: "#a08060", fontSize: 13, fontStyle: "italic" }}>No rounds logged yet.</div>
                      : getRecentRounds(players, 5).map(({ player: p, score, roundNum }, i) => {
                        const tgt = target(p.handicap); const diff = score - tgt;
                        const color = diff < 0 ? "#4CAF50" : diff === 0 ? "#FFC107" : "#ef5350";
                        return (
                          <div key={i} style={{ ...s.miniRow, cursor: "default" }}>
                            <Avatar name={p.name} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#f5e6d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: "#a08060" }}>Round {roundNum} · target {tgt}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5e6d0", fontFamily: "monospace" }}>{score}</div>
                              <div style={{ fontSize: 11, color, fontFamily: "monospace" }}>{diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}</div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* Itinerary Snippet */}
                <div style={s.homeSection}>
                  <div style={s.homeSectionHeader}>
                    <span style={s.homeSectionTitle}>📅 Trip Schedule</span>
                    <button style={s.homeSectionLink} onClick={() => navigate("itinerary")}>Full itinerary →</button>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {SCHEDULE.map((day, i) => (
                      <div key={i} style={{ flex: 1, minWidth: 130, background: "rgba(139,58,15,0.12)", border: "1px solid rgba(232,106,47,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{day.icon}</div>
                        <div style={{ fontWeight: 700, color: "#f5e6d0", fontSize: 13 }}>{day.day}</div>
                        <div style={{ color: "#a08060", fontSize: 11, marginBottom: 6 }}>{day.date}</div>
                        {day.course && <div style={{ color: "#e86a2f", fontSize: 11, fontWeight: 600 }}>{day.course.split(" ").slice(0, 2).join(" ")}</div>}
                        {!day.course && <div style={{ color: "#a08060", fontSize: 11, fontStyle: "italic" }}>{day.events[0].event}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Article */}
                {articles.length > 0 && (
                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>📰 Latest Dispatch</span>
                      <button style={s.homeSectionLink} onClick={() => navigate("news")}>All articles →</button>
                    </div>
                    <div className="ac" style={{ ...s.articleCard, cursor: "pointer", marginBottom: 12 }} onClick={() => { setSelectedArticle(articles[0]); navigate("news"); }}>
                      <div style={s.articleMeta}>{formatDate(articles[0].date)} · By {articles[0].author}</div>
                      <div style={{ ...s.articleTitle, fontSize: 20 }}>{articles[0].title}</div>
                      <div style={{ color: "#a08060", fontSize: 14, marginTop: 10, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{articles[0].body}</div>
                      <div style={{ color: "#e86a2f", fontSize: 13, marginTop: 12, fontWeight: 600 }}>Read more →</div>
                    </div>
                    {articles.length > 1 && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {articles.slice(1, 3).map(a => (
                          <div key={a.id} className="ac" style={{ ...s.articleCard, flex: 1, minWidth: 180, cursor: "pointer" }} onClick={() => { setSelectedArticle(a); navigate("news"); }}>
                            <div style={s.articleMeta}>{formatDate(a.date)}</div>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: "#f5e6d0", marginTop: 6, lineHeight: 1.3 }}>{a.title}</div>
                            <div style={{ color: "#e86a2f", fontSize: 12, marginTop: 8, fontWeight: 600 }}>Read →</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── DRAFT BOARD ───────────────────────────────────────────── */}
            {page === "draftboard" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Draft Board</div>
                    <div style={s.pageSub}>Preseason standings — avg score vs personal target (72 + HCP + 3)</div>
                  </div>
                </div>
                {ranked.length === 0
                  ? <div style={{ color: "#a08060", fontStyle: "italic", padding: 20 }}>No rounds logged yet.</div>
                  : <div style={s.card}>
                    {ranked.map((p, i) => {
                      const rel = avgVsTarget(p.rounds, p.handicap); const avg = avgScore(p.rounds);
                      return (
                        <div key={p.id} className="lr"
                          style={{ ...s.leaderRow, ...(i === 0 ? { background: "rgba(193,68,14,0.08)" } : {}), ...(i !== ranked.length - 1 ? { borderBottom: "1px solid rgba(139,58,15,0.3)" } : {}) }}
                          onClick={() => { setSelectedPlayer(p); navigate("players"); }}>
                          <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}><Medal rank={i + 1} /></div>
                          <Avatar name={p.name} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={s.playerName}>{p.name}</div>
                            <div style={s.playerMeta}>HCP {p.handicap} · Target {target(p.handicap)} · {p.rounds.length} rounds · Avg {avg ? avg.toFixed(1) : "—"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ScoreBadge val={rel} />
                            <span style={{ color: "#a08060", fontSize: 18 }}>›</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
                <div style={s.legend}><span style={{ color: "#4CAF50" }}>■</span> Under target &nbsp;<span style={{ color: "#FFC107" }}>■</span> On target &nbsp;<span style={{ color: "#ef5350" }}>■</span> Over target</div>
              </div>
            )}

            {/* ── PLAYERS LIST ──────────────────────────────────────────── */}
            {page === "players" && !selectedPlayer && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Players</div>
                    <div style={s.pageSub}>{players.length} members heading to St. George</div>
                  </div>
                </div>
                <div style={s.playerGrid}>
                  {players.map(p => {
                    const rel = avgVsTarget(p.rounds, p.handicap);
                    const rank = ranked.findIndex(r => r.id === p.id) + 1;
                    return (
                      <div key={p.id} className="pc" style={s.playerCard} onClick={() => setSelectedPlayer(p)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <Avatar name={p.name} size={46} />
                          <div>
                            <div style={s.playerName}>{p.name}</div>
                            <div style={s.playerMeta}>HCP {p.handicap} · Target {target(p.handicap)}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><div style={s.statLabelSm}>Vs Target</div><ScoreBadge val={rel} /></div>
                          <div style={{ textAlign: "right" }}><div style={s.statLabelSm}>Rounds</div><div style={{ color: "#f5e6d0", fontWeight: 700 }}>{p.rounds.length}</div></div>
                          {rank > 0 && <div style={{ textAlign: "right" }}><div style={s.statLabelSm}>Rank</div><div style={{ color: "#f5e6d0", fontWeight: 700 }}>#{rank}</div></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PLAYER PROFILE ────────────────────────────────────────── */}
            {page === "players" && selectedPlayer && (() => {
              const p = players.find(pl => pl.id === selectedPlayer.id) || selectedPlayer;
              const rel = avgVsTarget(p.rounds, p.handicap);
              const avg = avgScore(p.rounds);
              const best = p.rounds.length ? Math.min(...p.rounds) : null;
              const worst = p.rounds.length ? Math.max(...p.rounds) : null;
              const rank = ranked.findIndex(pl => pl.id === p.id) + 1;
              const tgt = target(p.handicap);
              return (
                <div>
                  <button style={s.backBtn} onClick={() => setSelectedPlayer(null)}>← Back to Players</button>
                  <div style={s.profileCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                      <Avatar name={p.name} size={80} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Playfair Display',serif" }}>{p.name}</div>
                        <div style={{ color: "#a08060", marginTop: 4 }}>{rank > 0 ? `Rank #${rank} · ` : ""}Target: {tgt} · {p.rounds.length} round{p.rounds.length !== 1 ? "s" : ""} logged</div>
                      </div>
                    </div>
                    <div style={s.statsGrid}>
                      {[
                        { label: "Handicap", val: p.handicap },
                        { label: "Target Score", val: tgt },
                        { label: "Avg Score", val: avg ? avg.toFixed(1) : "—" },
                        { label: "Vs Target", val: <ScoreBadge val={rel} size="lg" /> },
                        { label: "Best Round", val: best ?? "—" },
                        { label: "Worst Round", val: worst ?? "—" },
                      ].map(stat => (
                        <div key={stat.label} style={s.statBox}>
                          <div style={s.statLabel}>{stat.label}</div>
                          <div style={s.statVal}>{stat.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 28 }}>
                      <div style={{ color: "#d4956a", fontWeight: 600, fontFamily: "'Playfair Display',serif", fontSize: 17, marginBottom: 14 }}>Round History</div>
                      {p.rounds.length === 0
                        ? <div style={{ color: "#a08060", fontStyle: "italic" }}>No rounds logged yet.</div>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {p.rounds.map((score, i) => {
                            const diff = score - tgt; const color = diff < 0 ? "#4CAF50" : diff === 0 ? "#FFC107" : "#ef5350";
                            return (
                              <div key={i} style={{ background: "rgba(139,58,15,0.15)", border: `1px solid ${color}44`, borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 80 }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#f5e6d0", fontFamily: "monospace" }}>{score}</div>
                                <div style={{ fontSize: 12, color, marginTop: 3, fontFamily: "monospace" }}>{diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff} vs tgt</div>
                                <div style={{ fontSize: 10, color: "#a08060", marginTop: 2 }}>Round {i + 1}</div>
                              </div>
                            );
                          })}
                        </div>
                      }
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── ITINERARY ─────────────────────────────────────────────── */}
            {page === "itinerary" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Trip Itinerary</div>
                    <div style={s.pageSub}>September 3–7, 2026 · St. George, Utah</div>
                  </div>
                </div>
                {/* Schedule */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
                  {SCHEDULE.map((day, di) => (
                    <div key={di} style={s.card}>
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(139,58,15,0.3)", display: "flex", alignItems: "center", gap: 12, background: "rgba(139,58,15,0.1)" }}>
                        <span style={{ fontSize: 24 }}>{day.icon}</span>
                        <div>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f5e6d0" }}>{day.day} · {day.date}</div>
                          {day.course && <div style={{ color: "#e86a2f", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{day.course}</div>}
                        </div>
                      </div>
                      <div style={{ padding: "12px 20px" }}>
                        {day.events.map((ev, ei) => (
                          <div key={ei} style={{ display: "flex", gap: 16, padding: "8px 0", borderBottom: ei !== day.events.length - 1 ? "1px solid rgba(139,58,15,0.15)" : "none" }}>
                            <div style={{ minWidth: 80, color: "#e86a2f", fontSize: 12, fontWeight: 600, fontFamily: "monospace", paddingTop: 2 }}>{ev.time}</div>
                            <div>
                              <div style={{ color: "#f5e6d0", fontWeight: 600, fontSize: 14 }}>{ev.event}</div>
                              {ev.note && <div style={{ color: "#a08060", fontSize: 12, marginTop: 2 }}>{ev.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Course Details */}
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#f5e6d0", marginBottom: 20 }}>The Courses</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {COURSES.map((c, i) => (
                    <div key={i} style={s.courseCard}>
                      <div style={{ height: 200, background: `linear-gradient(135deg, #8B3A0F, #c1440e)`, borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                        <img src={c.image} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} onError={e => e.target.style.display = "none"} />
                        <div style={{ position: "relative", textAlign: "center" }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{c.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>{c.location} · Par {c.par} · {c.yards} yards</div>
                        </div>
                      </div>
                      <div style={{ padding: 24 }}>
                        <div style={{ color: "#e86a2f", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{c.day}</div>
                        <p style={{ color: "#c4956a", lineHeight: 1.8, fontSize: 14, marginBottom: 16 }}>{c.description}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                          {c.highlights.map((h, hi) => (
                            <span key={hi} style={{ background: "rgba(193,68,14,0.15)", border: "1px solid rgba(232,106,47,0.25)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#d4956a" }}>⭐ {h}</span>
                          ))}
                        </div>
                        <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ color: "#e86a2f", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Visit Official Website →</a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map */}
                <div style={{ marginTop: 40 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#f5e6d0", marginBottom: 16 }}>Course Locations</div>
                </div>
              </div>
            )}

            {/* ── POINTS TRACKER ────────────────────────────────────────── */}
            {page === "points" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Points Tracker</div>
                    <div style={s.pageSub}>25 total points available · Team John vs Team Brian</div>
                  </div>
                </div>
                {/* Teams */}
                <div style={s.teamsCard}>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                    {[{ name: "Team John", captain: "John Mullin", color: "#c1440e", pts: "—" }, { name: "Team Brian", captain: "Brian Dalidowicz", color: "#1d4e89", pts: "—" }].map(team => (
                      <div key={team.name} style={{ flex: 1, minWidth: 200, background: team.color + "22", border: `2px solid ${team.color}55`, borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginBottom: 4 }}>{team.name}</div>
                        <div style={{ color: "#a08060", fontSize: 13, marginBottom: 12 }}>Captain: {team.captain}</div>
                        <div style={{ fontSize: 40, fontWeight: 700, color: team.color, fontFamily: "monospace" }}>{team.pts}</div>
                        <div style={{ color: "#a08060", fontSize: 11, marginTop: 4 }}>points · updated after each event</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Points breakdown */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#f5e6d0", marginBottom: 16 }}>Points Breakdown</div>
                  <div style={s.card}>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(139,58,15,0.3)", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12 }}>
                      <div style={{ color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Event</div>
                      <div style={{ color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Day</div>
                      <div style={{ color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Pts</div>
                    </div>
                    {POINTS.map((pt, i) => (
                      <div key={i} style={{ padding: "14px 20px", borderBottom: i !== POINTS.length - 1 ? "1px solid rgba(139,58,15,0.2)" : "none", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#f5e6d0", fontWeight: 600, fontSize: 14 }}>{pt.event}</div>
                          <div style={{ color: "#a08060", fontSize: 12, marginTop: 2 }}>{pt.format}</div>
                        </div>
                        <div style={{ background: "rgba(193,68,14,0.15)", border: "1px solid rgba(232,106,47,0.2)", borderRadius: 6, padding: "2px 10px", color: "#e86a2f", fontSize: 12, fontWeight: 600, textAlign: "center" }}>{pt.day}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#f5e6d0", textAlign: "right", minWidth: 40 }}>{pt.pts}</div>
                      </div>
                    ))}
                    <div style={{ padding: "14px 20px", background: "rgba(193,68,14,0.1)", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "#f5e6d0" }}>Total Points Available</div>
                      <div />
                      <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 700, color: "#e86a2f", textAlign: "right" }}>25</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TRIP DETAILS ──────────────────────────────────────────── */}
            {page === "tripdetails" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Trip Details</div>
                    <div style={s.pageSub}>Everything you need to know before you go</div>
                  </div>
                </div>
                {/* Travel */}
                <div style={{ ...s.homeSection, marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f5e6d0", marginBottom: 14 }}>✈️ Getting There</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[{ airport: "St. George Regional Airport (SGU)", note: "Closest — 15 min to courses", icon: "🟢" }, { airport: "Las Vegas Airport (LAS)", note: "~2 hr drive — more flight options", icon: "🔵" }].map(a => (
                      <div key={a.airport} style={{ flex: 1, minWidth: 200, background: "rgba(139,58,15,0.12)", border: "1px solid rgba(232,106,47,0.2)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{a.icon}</div>
                        <div style={{ color: "#f5e6d0", fontWeight: 600, fontSize: 14 }}>{a.airport}</div>
                        <div style={{ color: "#a08060", fontSize: 12, marginTop: 4 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Packing List */}
                <div style={s.homeSection}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f5e6d0", marginBottom: 14 }}>🧳 Packing List</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                    {PACKING_LIST.map(cat => (
                      <div key={cat.category} style={{ background: "rgba(139,58,15,0.1)", border: "1px solid rgba(232,106,47,0.15)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ color: "#e86a2f", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{cat.category}</div>
                        {cat.items.map(item => (
                          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(139,58,15,0.15)" }}>
                            <span style={{ color: "#e86a2f", fontSize: 10 }}>●</span>
                            <span style={{ color: "#c4956a", fontSize: 13 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── NEWS ──────────────────────────────────────────────────── */}
            {page === "news" && !selectedArticle && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>League News</div>
                    <div style={s.pageSub}>Commissioner's dispatches from the fairway</div>
                  </div>
                </div>
                {articles.length === 0
                  ? <div style={{ color: "#a08060", fontStyle: "italic", padding: 20 }}>No articles yet.</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {articles.map(a => (
                      <div key={a.id} className="ac" style={{ ...s.articleCard, cursor: "pointer" }} onClick={() => setSelectedArticle(a)}>
                        <div style={s.articleMeta}>{formatDate(a.date)} · By {a.author}</div>
                        <div style={s.articleTitle}>{a.title}</div>
                        <div style={{ color: "#a08060", fontSize: 14, marginTop: 8, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body}</div>
                        <div style={{ color: "#e86a2f", fontSize: 13, marginTop: 10, fontWeight: 600 }}>Read more →</div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
            {page === "news" && selectedArticle && (
              <div>
                <button style={s.backBtn} onClick={() => setSelectedArticle(null)}>← Back to News</button>
                <div style={s.profileCard}>
                  <div style={s.articleMeta}>{formatDate(selectedArticle.date)} · By {selectedArticle.author}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Playfair Display',serif", lineHeight: 1.25, marginTop: 10, marginBottom: 24 }}>{selectedArticle.title}</div>
                  {selectedArticle.body.split("\n").map((para, i) => para.trim() && (
                    <p key={i} style={{ color: "#c4956a", lineHeight: 1.85, fontSize: 15, marginBottom: 16 }}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORY ───────────────────────────────────────────────── */}
            {page === "history" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>History</div>
                    <div style={s.pageSub}>The Village Classic through the years</div>
                  </div>
                </div>
                {/* 2025 Champions */}
                <div style={{ ...s.profileCard, marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginBottom: 4 }}>🏆 2025 Champions</div>
                  <div style={{ color: "#a08060", fontSize: 13, marginBottom: 20 }}>The defending champions. Details coming soon.</div>
                  <img src={TEAM_CHAMPIONS_PHOTO} style={{ width: "100%", maxWidth: 600, borderRadius: 12, objectFit: "cover", border: "2px solid rgba(232,106,47,0.2)" }} onError={e => e.target.style.display = "none"} />
                </div>
                {/* Placeholder years */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {["2024", "2023", "2022"].map(year => (
                    <div key={year} style={{ ...s.articleCard, opacity: 0.6 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f5e6d0" }}>📖 {year} Village Classic</div>
                      <div style={{ color: "#a08060", fontSize: 13, marginTop: 6, fontStyle: "italic" }}>History and results coming soon...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { minHeight: "100vh", background: "linear-gradient(150deg,#1a0e06 0%,#2a1506 40%,#1a0e06 100%)", fontFamily: "'DM Sans',sans-serif", color: "#f5e6d0" },
  header: { borderBottom: "1px solid rgba(139,58,15,0.4)", background: "rgba(20,10,3,0.95)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1000, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  logoName: { fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#f5e6d0" },
  logoSub: { fontSize: 10, color: "#a08060", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 1 },
  desktopNav: { maxWidth: 1000, margin: "0 auto", padding: "0 20px 8px", display: "flex", gap: 2, flexWrap: "wrap" },
  navBtn: { background: "transparent", border: "1px solid transparent", borderRadius: 8, color: "#a08060", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" },
  navActive: { background: "rgba(193,68,14,0.15)", border: "1px solid rgba(232,106,47,0.35)", color: "#e86a2f" },
  hamburger: { display: "flex", flexDirection: "column", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 4 },
  hamburgerLine: { width: 22, height: 2, background: "#a08060", borderRadius: 2, transition: "all 0.2s" },
  mobileMenu: { background: "rgba(20,10,3,0.98)", borderTop: "1px solid rgba(139,58,15,0.3)", padding: "8px 0" },
  mobileMenuItem: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 24px", background: "transparent", border: "none", color: "#c4956a", fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" },
  mobileMenuItemActive: { background: "rgba(193,68,14,0.15)", color: "#e86a2f" },
  main: { maxWidth: 1000, margin: "0 auto", padding: "32px 20px 70px" },
  heroCard: { background: "linear-gradient(135deg,rgba(139,58,15,0.4) 0%,rgba(193,68,14,0.3) 100%)", border: "1px solid rgba(232,106,47,0.2)", borderRadius: 20, padding: "40px 32px", textAlign: "center" },
  heroLabel: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#e86a2f", marginBottom: 10, fontWeight: 600 },
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: "#f5e6d0", marginBottom: 8 },
  heroSub: { color: "#a08060", fontSize: 14, marginBottom: 28, fontStyle: "italic" },
  countdownRow: { display: "flex", gap: 16, justifyContent: "center", marginBottom: 22, flexWrap: "wrap" },
  countdownBox: { background: "rgba(0,0,0,0.35)", border: "1px solid rgba(139,58,15,0.4)", borderRadius: 12, padding: "14px 22px", minWidth: 72 },
  countdownNum: { fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: "#f5e6d0", lineHeight: 1 },
  countdownLabel: { fontSize: 10, color: "#a08060", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 6 },
  teamsCard: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(232,106,47,0.2)", borderRadius: 16, padding: 20 },
  homeSection: { background: "rgba(139,58,15,0.08)", border: "1px solid rgba(139,58,15,0.3)", borderRadius: 16, padding: 20 },
  homeSectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  homeSectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: "#f5e6d0" },
  homeSectionLink: { background: "transparent", border: "none", color: "#e86a2f", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" },
  miniRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" },
  pageTitle: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#f5e6d0" },
  pageSub: { color: "#a08060", fontSize: 13, marginTop: 4 },
  card: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(139,58,15,0.35)", borderRadius: 16, overflow: "hidden" },
  courseCard: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(139,58,15,0.35)", borderRadius: 14, overflow: "hidden" },
  leaderRow: { display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", transition: "background 0.15s" },
  playerName: { fontWeight: 600, color: "#f5e6d0", fontSize: 15 },
  playerMeta: { color: "#a08060", fontSize: 12, marginTop: 2 },
  legend: { color: "#a08060", fontSize: 12, marginTop: 14, textAlign: "center" },
  playerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 },
  playerCard: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(139,58,15,0.3)", borderRadius: 14, padding: 18, cursor: "pointer", transition: "all 0.15s" },
  statLabelSm: { color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  profileCard: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(139,58,15,0.3)", borderRadius: 16, padding: 28 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12 },
  statBox: { background: "rgba(139,58,15,0.15)", borderRadius: 10, padding: "14px 16px" },
  statLabel: { color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Playfair Display',serif" },
  articleCard: { background: "rgba(139,58,15,0.1)", border: "1px solid rgba(139,58,15,0.3)", borderRadius: 14, padding: "22px 24px", transition: "border-color 0.15s" },
  articleMeta: { color: "#a08060", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  articleTitle: { fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginTop: 8, lineHeight: 1.3 },
  backBtn: { background: "transparent", border: "none", color: "#e86a2f", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20, padding: 0, fontFamily: "'DM Sans',sans-serif" },
  btnPrimary: { background: "linear-gradient(135deg,#8B3A0F,#c1440e)", border: "none", borderRadius: 8, color: "#fff", padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" },
  btnGhost: { background: "transparent", border: "1px solid rgba(139,58,15,0.4)", borderRadius: 8, color: "#a08060", padding: "9px 18px", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
};
