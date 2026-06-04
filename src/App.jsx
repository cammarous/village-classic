import { useState, useEffect, useRef } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────
const TRIP_DATE = new Date("2026-09-03T16:00:00");
const COLORS = {
  bg: "#1a0e06",
  bgCard: "#2a1506",
  bgCardLight: "#3a1f08",
  orange: "#c1440e",
  orangeLight: "#e86a2f",
  tan: "#d4956a",
  tanDark: "#c4956a",
  cream: "#f5e6d0",
  creamDim: "#c8a882",
  border: "#5a2e10",
};

const COURSES = [
  { name: "Coral Canyon Golf Course", day: "Friday", lat: 37.1568386, lng: -113.4478651, placeId: "ChIJkwGuoDlZyoARUI9eYuNjRMQ" },
  { name: "Sand Hollow Resort", day: "Saturday", lat: 37.1145306, lng: -113.4144024, placeId: "ChIJS6ViS41EyoARX9O5pS4qyjc" },
  { name: "Copper Rock Golf Course", day: "Sunday", lat: 37.1107265, lng: -113.3186842, placeId: "ChIJ2aUnrmH3yoAR664s0a5tBlU" },
];

const SCHEDULE = [
  { day: "Thu Sep 3", events: ["4:00 PM — Airbnb Check-in", "Live Team Draft", "Baseball (1pt)", "Dinner"] },
  { day: "Fri Sep 4", events: ["Coral Canyon Golf Course", "8:30 AM — 2v2 Matchplay (4pts)", "2:40 PM — 2v2 Scramble/Alt Shot (4pts)", "Dinner at Home"] },
  { day: "Sat Sep 5", events: ["Sand Hollow Resort", "7:40 AM — 2v2 Matchplay (4pts)", "3:00 PM — 2v2 Scramble/Alt Shot (4pts)", "Dinner"] },
  { day: "Sun Sep 6", events: ["Copper Rock Golf Course", "9:36 AM — Championship 1v1 Matchplay (8pts)", "Championship Award"] },
  { day: "Mon Sep 7", events: ["10:00 AM — Airbnb Checkout", "Depart"] },
];

const PACKING_LIST = [
  "Golf Clubs", "Golf Shoes", "Golf Balls", "Golf Gloves",
  "3 Days of Golf Outfits", "Evening / Dinner Outfits", "Belts", "Hats",
  "Lounging / Room Clothes", "Swimsuit", "Towel (pool + shower)",
  "Casual Shoes", "Jackets", "Deodorant", "Toothpaste", "Socks", "Underwear",
];

const TRIP_YEARS = ["2021", "2022", "2023", "2024", "2025", "2026"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTarget(handicap) {
  return 72 + handicap + 3;
}

function getAvgDiff(player) {
  if (!player.scores || player.scores.length === 0) return null;
  const target = getTarget(player.handicap);
  const diffs = player.scores.map((s) => s - target);
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

function formatDiff(diff) {
  if (diff === null) return "—";
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
}

function getTripHistory(player) {
  if (!player.years) return [];
  return TRIP_YEARS
    .map((yr) => {
      const val = player.years[yr] || "";
      if (!val) return null;
      let label, color, icon;
      if (yr === "2021") {
        label = "Attended"; icon = "⛳"; color = COLORS.creamDim;
      } else if (val === "W") {
        label = "Won"; icon = "🏆"; color = "#4caf50";
      } else if (val === "L") {
        label = "Lost"; icon = "📉"; color = "#e57373";
      } else if (val === "Attending") {
        label = "Attending"; icon = "✈️"; color = COLORS.tan;
      } else if (val === "Attended") {
        label = "Attended"; icon = "⛳"; color = COLORS.creamDim;
      } else {
        label = val; icon = "⛳"; color = COLORS.creamDim;
      }
      return { year: yr, label, icon, color, raw: val };
    })
    .filter(Boolean);
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = TRIP_DATE - now;
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function PlayerCard({ player, onClick }) {
  const avg = getAvgDiff(player);
  const isAttending = player.attending2026;
  const diffColor = avg === null ? COLORS.creamDim : avg <= 0 ? "#4caf50" : avg <= 5 ? COLORS.tan : "#e57373";
  const tripsPlayed = TRIP_YEARS.filter((yr) => player.years?.[yr] && player.years[yr] !== "").length;

  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${isAttending ? COLORS.border : "#3a2010"}`,
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: isAttending ? 1 : 0.45,
        filter: isAttending ? "none" : "grayscale(50%)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (isAttending) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = `0 6px 20px rgba(193,68,14,0.3)`;
        }
      }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {!isAttending && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "#3a1506", border: `1px solid ${COLORS.border}`,
          borderRadius: 4, padding: "2px 7px", fontSize: 10,
          color: COLORS.creamDim, textTransform: "uppercase", letterSpacing: 0.8,
        }}>
          Alumni
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {player.photo ? (
          <img src={player.photo} alt={player.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${isAttending ? COLORS.orange : COLORS.border}` }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `2px solid ${COLORS.border}` }}>
            ⛳
          </div>
        )}
        <div>
          <div style={{ fontFamily: "Playfair Display, serif", color: COLORS.cream, fontSize: 16, fontWeight: 700 }}>{player.name}</div>
          <div style={{ color: COLORS.creamDim, fontSize: 13 }}>HCP {player.handicap} · {tripsPlayed} trip{tripsPlayed !== 1 ? "s" : ""}</div>
          <div style={{ color: diffColor, fontSize: 13, fontWeight: 600 }}>
            {avg === null ? "No rounds yet" : `Avg: ${formatDiff(avg)} vs target`}
          </div>
        </div>
      </div>
      {player.description && (
        <div style={{
          color: COLORS.creamDim,
          fontSize: 13,
          lineHeight: 1.4,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          borderTop: `1px solid ${COLORS.border}`,
          paddingTop: 8,
        }}>
          {player.description}
        </div>
      )}
    </div>
  );
}

function PlayerProfile({ player, onBack }) {
  const avg = getAvgDiff(player);
  const target = getTarget(player.handicap);
  const tripHistory = getTripHistory(player);
  const isAttending = player.attending2026;

  return (
    <div style={{ color: COLORS.cream }}>
      <button onClick={onBack} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.tan, cursor: "pointer", padding: "6px 14px", borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
        ← Back to Players
      </button>
      {!isAttending && (
        <div style={{ background: "#2a1506", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: COLORS.creamDim, fontSize: 13 }}>
          🏛️ Village Classic Alumni — not attending 2026
        </div>
      )}
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {player.photo ? (
          <img src={player.photo} alt={player.name} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: `3px solid ${isAttending ? COLORS.orange : COLORS.border}`, filter: isAttending ? "none" : "grayscale(40%)" }} />
        ) : (
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: `3px solid ${COLORS.border}` }}>⛳</div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", margin: "0 0 4px", fontSize: 28 }}>{player.name}</h2>
          <div style={{ color: COLORS.creamDim, fontSize: 15, marginBottom: 8 }}>Handicap: {player.handicap} | Target: {target}</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Rounds: <strong>{player.scores?.length || 0}</strong> &nbsp;|&nbsp;
            Avg vs Target: <strong style={{ color: avg !== null && avg <= 0 ? "#4caf50" : COLORS.orange }}>{avg === null ? "—" : formatDiff(avg)}</strong>
          </div>
          {player.description && (
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ color: COLORS.tan, fontSize: 13, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Bio</div>
              <p style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{player.description}</p>
            </div>
          )}
        </div>
      </div>
      {tripHistory.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 12 }}>🗓️ Trip History</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {tripHistory.map(({ year, label, icon, color }) => (
              <div key={year} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
                <div style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 4 }}>{year}</div>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                <div style={{ color, fontSize: 12, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { icon: "🏆", label: "Won (team)", color: "#4caf50" },
              { icon: "📉", label: "Lost (team)", color: "#e57373" },
              { icon: "⛳", label: "Attended", color: COLORS.creamDim },
              { icon: "✈️", label: "Attending 2026", color: COLORS.tan },
            ].map(({ icon, label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span style={{ color, fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {player.scores && player.scores.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 12 }}>Round History</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
            {player.scores.map((score, i) => {
              const diff = score - target;
              return (
                <div key={i} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ color: COLORS.creamDim, fontSize: 12 }}>R{i + 1}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>{score}</div>
                  <div style={{ fontSize: 12, color: diff <= 0 ? "#4caf50" : COLORS.orange }}>{formatDiff(diff)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function HomePage({ data, countdown }) {
  const sorted = [...data.players]
    .filter((p) => p.attending2026)
    .map((p) => ({ ...p, avg: getAvgDiff(p) }))
    .filter((p) => p.avg !== null)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  const recentRounds = data.recentRounds || [];
  const latestArticle = data.articles[0];

  return (
    <div style={{ color: COLORS.cream }}>
      <div style={{ textAlign: "center", marginBottom: 40, padding: "40px 20px", background: `linear-gradient(180deg, #3a1f08 0%, ${COLORS.bg} 100%)`, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
        {data.logoUrl && (
          <div style={{ width: 160, height: 160, borderRadius: "50%", overflow: "hidden", margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <img src={data.logoUrl} alt="Village Classic Logo" style={{ width: "140%", height: "140%", objectFit: "cover", marginLeft: "-20%", marginTop: "-20%" }} />
          </div>
        )}
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 6vw, 52px)", margin: "0 0 8px", color: COLORS.cream }}>The Village Classic</h1>
        <div style={{ color: COLORS.tan, fontSize: 18, marginBottom: 24 }}>St. George, Utah — September 3–7, 2026</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[["days", "Days"], ["hours", "Hours"], ["minutes", "Min"], ["seconds", "Sec"]].map(([key, label]) => (
            <div key={key} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 20px", minWidth: 70, textAlign: "center" }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 700, color: COLORS.orangeLight }}>{countdown[key] ?? "—"}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
        {[{ name: "Team John", captain: "John Mullin", icon: "👑" }, { name: "Team Brian", captain: "Brian Dalidowicz", icon: "🔥" }].map((team) => (
          <div key={team.name} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>{team.icon}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: COLORS.cream, marginTop: 6 }}>{team.name}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 14 }}>Captain: {team.captain}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 40 }}>
        <div>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14, fontSize: 20 }}>🏆 Top 5 — Draft Board</h2>
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
            {sorted.length === 0 ? (
              <div style={{ padding: 20, color: COLORS.creamDim, textAlign: "center" }}>No rounds yet — season not started</div>
            ) : sorted.map((p, i) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#b8860b" : i === 1 ? "#9e9e9e" : i === 2 ? "#a0522d" : COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: COLORS.cream, flexShrink: 0 }}>{i + 1}</div>
                {p.photo && <img src={p.photo} alt={p.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.cream, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: COLORS.creamDim, fontSize: 12 }}>HCP {p.handicap}</div>
                </div>
                <div style={{ color: p.avg <= 0 ? "#4caf50" : COLORS.orange, fontWeight: 700, fontSize: 15 }}>{formatDiff(p.avg)}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14, fontSize: 20 }}>🕐 Recent Rounds</h2>
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
            {recentRounds.length === 0 ? (
              <div style={{ padding: 20, color: COLORS.creamDim, textAlign: "center" }}>No rounds recorded yet</div>
            ) : recentRounds.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < recentRounds.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                {r.photo ? (
                  <img src={r.photo} alt={r.playerName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⛳</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.cream, fontSize: 14, fontWeight: 600 }}>{r.playerName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: COLORS.cream, fontWeight: 700 }}>{r.score}</div>
                  <div style={{ fontSize: 12, color: r.diff <= 0 ? "#4caf50" : COLORS.orange }}>{formatDiff(r.diff)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14, fontSize: 20 }}>📅 Trip at a Glance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {SCHEDULE.map((day) => (
            <div key={day.day} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{day.day}</div>
              {day.events.slice(0, 2).map((e, i) => (
                <div key={i} style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 2 }}>• {e}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {latestArticle && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14, fontSize: 20 }}>📰 Commissioner's Corner</h2>
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: COLORS.cream, marginBottom: 6 }}>{latestArticle.title}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 13, marginBottom: 14 }}>{latestArticle.date} — {latestArticle.author}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>
              {latestArticle.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftBoardPage({ players }) {
  const attendingPlayers = players.filter((p) => p.attending2026);
  const sorted = [...attendingPlayers]
    .map((p) => ({ ...p, avg: getAvgDiff(p) }))
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏆 Draft Board</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Ranked by average score vs personal target (72 + handicap + 3). Lower = better.</p>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto auto", gap: 0, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgCardLight }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase" }}>#</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase" }}>Player</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "right", paddingRight: 16 }}>HCP</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "right", paddingRight: 16 }}>Target</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Avg Diff</div>
        </div>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto auto", gap: 0, padding: "14px 16px", borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "center" }}>
            <div style={{ color: i < 3 ? [COLORS.tan, "#9e9e9e", "#cd7f32"][i] : COLORS.creamDim, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {p.photo ? (
                <img src={p.photo} alt={p.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center" }}>⛳</div>
              )}
              <div>
                <div style={{ color: COLORS.cream, fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                <div style={{ color: COLORS.creamDim, fontSize: 12 }}>{p.scores?.length || 0} round{p.scores?.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ color: COLORS.creamDim, textAlign: "right", paddingRight: 16, fontSize: 14 }}>{p.handicap}</div>
            <div style={{ color: COLORS.creamDim, textAlign: "right", paddingRight: 16, fontSize: 14 }}>{getTarget(p.handicap)}</div>
            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16, color: p.avg === null ? COLORS.creamDim : p.avg <= 0 ? "#4caf50" : p.avg <= 5 ? COLORS.tan : "#e57373" }}>
              {p.avg === null ? "—" : formatDiff(p.avg)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersPage({ players }) {
  const [selected, setSelected] = useState(null);
  if (selected) {
    return <PlayerProfile player={selected} onBack={() => setSelected(null)} />;
  }
  const attending = players.filter((p) => p.attending2026);
  const alumni = players.filter((p) => !p.attending2026);

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>👤 Players</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Click a player card for full profile and round history.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {attending.map((p) => (
          <PlayerCard key={p.name} player={p} onClick={() => setSelected(p)} />
        ))}
      </div>
      {alumni.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "36px 0 20px" }}>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            <div style={{ color: COLORS.creamDim, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, whiteSpace: "nowrap" }}>🏛️ Village Classic Alumni</div>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {alumni.map((p) => (
              <PlayerCard key={p.name} player={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ItineraryPage() {
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>📅 Itinerary</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>St. George, Utah — September 3–7, 2026</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        {SCHEDULE.map((day) => (
          <div key={day.day} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{day.day}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {day.events.map((e, i) => (
                <div key={i} style={{ color: COLORS.creamDim, fontSize: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.orange, marginTop: 2 }}>•</span>
                  <span>{e}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14 }}>⛳ Courses</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
        {COURSES.map((c) => (
          <div key={c.name} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontFamily: "Playfair Display, serif", color: COLORS.cream, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
            <div style={{ color: COLORS.tan, fontSize: 14, marginBottom: 4 }}>{c.day}</div>
            <a href={`https://www.google.com/maps/place/?q=place_id:${c.placeId}`} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.orangeLight, fontSize: 13, textDecoration: "none" }}>
              View on Google Maps →
            </a>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 14 }}>🗺️ Course Map</h2>
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <iframe
          title="Village Classic Courses"
          width="100%"
          height="420"
          style={{ border: "none", display: "block" }}
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent("GOOGLE_MAPS_EMBED_KEY_PLACEHOLDER")}&q=place_id:ChIJkwGuoDlZyoARUI9eYuNjRMQ&zoom=11&center=37.13,-113.41`}
        />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {COURSES.map((c, i) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: [COLORS.orange, COLORS.tan, "#4caf50"][i] }} />
            <span style={{ color: COLORS.creamDim, fontSize: 13 }}>{c.name}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ color: COLORS.tan, fontWeight: 700, marginBottom: 10 }}>📍 Quick Links</div>
        {COURSES.map((c) => (
          <div key={c.name} style={{ marginBottom: 8 }}>
            <a href={`https://www.google.com/maps/place/?q=place_id:${c.placeId}`} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.orangeLight, fontSize: 14, textDecoration: "none" }}>
              📍 {c.name} ({c.day}) →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function PointsPage() {
  const events = [
    { name: "Baseball (Thursday)", format: "TBD", pts: 1, teamJohn: null, teamBrian: null },
    { name: "Coral Canyon — 2v2 Matchplay", format: "1pt per match", pts: 4, teamJohn: null, teamBrian: null },
    { name: "Coral Canyon — 2v2 Scramble/Alt Shot", format: "1pt per match", pts: 4, teamJohn: null, teamBrian: null },
    { name: "Sand Hollow — 2v2 Matchplay", format: "1pt per match", pts: 4, teamJohn: null, teamBrian: null },
    { name: "Sand Hollow — 2v2 Scramble/Alt Shot", format: "1pt per match", pts: 4, teamJohn: null, teamBrian: null },
    { name: "Copper Rock — 1v1 Singles", format: "1pt per match", pts: 8, teamJohn: null, teamBrian: null },
  ];
  const totalJohn = events.reduce((s, e) => s + (e.teamJohn || 0), 0);
  const totalBrian = events.reduce((s, e) => s + (e.teamBrian || 0), 0);

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏅 Points Tracker</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>25 total points up for grabs. First team to 13 wins.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[{ name: "Team John", score: totalJohn }, { name: "Team Brian", score: totalBrian }].map((team) => (
          <div key={team.name} style={{ background: COLORS.bgCard, border: `2px solid ${COLORS.border}`, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: COLORS.cream, marginBottom: 8 }}>{team.name}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 56, fontWeight: 700, color: COLORS.orangeLight }}>{team.score}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 13 }}>points</div>
          </div>
        ))}
      </div>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgCardLight, gap: 8 }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase" }}>Event</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "center", minWidth: 60 }}>Total</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "center", minWidth: 70 }}>Team John</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "center", minWidth: 70 }}>Team Brian</div>
        </div>
        {events.map((e, i) => (
          <div key={e.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", padding: "14px 16px", borderBottom: i < events.length - 1 ? `1px solid ${COLORS.border}` : "none", gap: 8, alignItems: "center" }}>
            <div>
              <div style={{ color: COLORS.cream, fontSize: 14, fontWeight: 600 }}>{e.name}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 12 }}>{e.format}</div>
            </div>
            <div style={{ color: COLORS.tan, fontWeight: 700, textAlign: "center", minWidth: 60 }}>{e.pts}pt{e.pts !== 1 ? "s" : ""}</div>
            <div style={{ textAlign: "center", minWidth: 70, color: e.teamJohn !== null ? COLORS.cream : COLORS.creamDim }}>{e.teamJohn !== null ? e.teamJohn : "—"}</div>
            <div style={{ textAlign: "center", minWidth: 70, color: e.teamBrian !== null ? COLORS.cream : COLORS.creamDim }}>{e.teamBrian !== null ? e.teamBrian : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripDetailsPage() {
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🗺️ Trip Details</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Everything you need to know before you go.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, marginBottom: 14, fontSize: 18 }}>✈️ Travel</h2>
          <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.8 }}>
            <div><strong style={{ color: COLORS.cream }}>Nearest Airports:</strong></div>
            <div>• St. George Regional Airport (SGU) — closest</div>
            <div>• Las Vegas Harry Reid (LAS) — ~2hr drive</div>
            <div style={{ marginTop: 12 }}><strong style={{ color: COLORS.cream }}>Airbnb Check-in:</strong> 4:00 PM, Thu Sep 3</div>
            <div><strong style={{ color: COLORS.cream }}>Checkout:</strong> 10:00 AM, Mon Sep 7</div>
          </div>
        </div>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, marginBottom: 14, fontSize: 18 }}>👥 Teams</h2>
          <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.8 }}>
            <div><strong style={{ color: COLORS.cream }}>Format:</strong> 2 teams of 8 — drafted live on Thursday</div>
            <div><strong style={{ color: COLORS.cream }}>Team John:</strong> Captain — John Mullin</div>
            <div><strong style={{ color: COLORS.cream }}>Team Brian:</strong> Captain — Brian Dalidowicz</div>
            <div style={{ marginTop: 12 }}><strong style={{ color: COLORS.cream }}>Team Prize:</strong> $$ to winning team's pro shop</div>
            <div><strong style={{ color: COLORS.cream }}>Team Item:</strong> Custom Hats</div>
          </div>
        </div>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, marginBottom: 14, fontSize: 18 }}>🧳 Packing List</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            {PACKING_LIST.map((item) => (
              <div key={item} style={{ color: COLORS.creamDim, fontSize: 13, display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ color: COLORS.orange, marginTop: 1 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsPage({ articles }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>📰 Commissioner's News</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Official dispatches from the Village Classic Commissioner.</p>
      {articles.length === 0 ? (
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: COLORS.creamDim }}>
          No articles yet. Check back soon.
        </div>
      ) : articles.map((a, i) => (
        <div key={i} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: COLORS.cream, marginBottom: 4 }}>{a.title}</div>
          <div style={{ color: COLORS.creamDim, fontSize: 13, marginBottom: 14 }}>{a.date} — {a.author}</div>
          <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: expanded === i ? "none" : 100 }}>
            {a.body}
          </div>
          <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ background: "none", border: "none", color: COLORS.orangeLight, cursor: "pointer", fontSize: 13, marginTop: 8, padding: 0 }}>
            {expanded === i ? "Show less ↑" : "Read more ↓"}
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoryPage({ history, historyPhotos }) {
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏛️ History</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 32, fontSize: 14 }}>The Village Classic legacy — every chapter, every champion.</p>
      {history.length === 0 && (
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: COLORS.creamDim }}>
          History coming soon...
        </div>
      )}
      {history.map((entry) => {
        const photos = historyPhotos[entry.year] || [];
        const paragraphs = entry.storyline ? entry.storyline.split("||").map((p) => p.trim()).filter(Boolean) : [];
        return (
          <div key={entry.year} style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 700, color: COLORS.orangeLight }}>{entry.year}</div>
              {entry.location && <div style={{ color: COLORS.creamDim, fontSize: 16 }}>📍 {entry.location}</div>}
            </div>
            {(entry.individualChampion || entry.teamChampion) && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                {entry.individualChampion && (
                  <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px" }}>
                    <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Individual Champion</div>
                    <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 15 }}>🏆 {entry.individualChampion}</div>
                  </div>
                )}
                {entry.teamChampion && (
                  <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px" }}>
                    <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Team Champion</div>
                    <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 15 }}>🏅 {entry.teamChampion}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ marginBottom: photos.length > 0 ? 20 : 0 }}>
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i} style={{ color: COLORS.creamDim, fontSize: 15, lineHeight: 1.7, margin: "0 0 12px" }}>{p}</p>
                ))
              ) : (
                <p style={{ color: COLORS.creamDim, fontSize: 14, fontStyle: "italic" }}>Details coming soon...</p>
              )}
            </div>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}`, aspectRatio: "4/3" }}>
                    <img src={url} alt={`${entry.year} Village Classic`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderBottom: `1px solid ${COLORS.border}`, marginTop: 40 }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Bogey Chat ───────────────────────────────────────────────────────────────

function PolarBear({ size = 40 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="18" r="10" fill="#ddeef5" />
      <circle cx="44" cy="18" r="10" fill="#ddeef5" />
      <circle cx="30" cy="34" r="22" fill="#eef6fb" />
      <circle cx="30" cy="34" r="22" fill="none" stroke="#b8d5e3" strokeWidth="1" />
      <circle cx="22" cy="30" r="3.2" fill="#1a0e06" />
      <circle cx="38" cy="30" r="3.2" fill="#1a0e06" />
      <circle cx="23.2" cy="28.8" r="1.1" fill="white" />
      <circle cx="39.2" cy="28.8" r="1.1" fill="white" />
      <ellipse cx="30" cy="36.5" rx="4.5" ry="3.2" fill="#2a1506" />
      <path d="M 25 41 Q 30 45 35 41" stroke="#2a1506" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="35" r="2" fill="#e8c4c0" opacity="0.5" />
      <circle cx="37" cy="35" r="2" fill="#e8c4c0" opacity="0.5" />
    </svg>
  );
}

function BogeyChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState("name");
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submitName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setUserName(name);
    setPhase("chat");
    setLoading(true);
    const initialHistory = [{ role: "user", content: `Hi, my name is ${name}` }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initialHistory, userName: name }),
      });
      const data = await res.json();
      const greeting = { role: "assistant", content: data.reply || `Good to have you, ${name}. Ask me anything about the 2026 Village Classic.` };
      setHistory([...initialHistory, greeting]);
      setMessages([greeting]);
    } catch {
      const greeting = { role: "assistant", content: `Good to have you, ${name}. I'm Bogey — your official Village Classic guide. Ask me anything.` };
      setHistory([...initialHistory, greeting]);
      setMessages([greeting]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content };
    const updatedHistory = [...history, userMsg];
    setHistory(updatedHistory);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedHistory, userName }),
      });
      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.reply || "Technical difficulties. Bogey is aware and appropriately outraged." };
      setHistory((prev) => [...prev, assistantMsg]);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg = { role: "assistant", content: "Technical difficulties. Bogey is aware and appropriately outraged." };
      setHistory((prev) => [...prev, errMsg]);
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ask Bogey"
          style={{ position: "fixed", bottom: 24, right: 24, width: 62, height: 62, borderRadius: "50%", backgroundColor: "#c1440e", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(193,68,14,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <PolarBear size={40} />
        </button>
      )}

      {isOpen && (
        <div style={{ position: "fixed", bottom: 24, right: 24, width: 360, borderRadius: 16, border: "1px solid rgba(193,68,14,0.4)", boxShadow: "0 8px 40px rgba(0,0,0,0.45)", overflow: "hidden", zIndex: 9999, fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ backgroundColor: "#c1440e", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(245,230,208,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PolarBear size={32} />
            </div>
            <div>
              <div style={{ color: "#f5e6d0", fontWeight: 700, fontSize: 14 }}>Bogey</div>
              <div style={{ color: "rgba(245,230,208,0.65)", fontSize: 11 }}>Village Classic AI</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#4ade80" }} />
              <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "rgba(245,230,208,0.7)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 0 0 8px" }}>×</button>
            </div>
          </div>

          {/* Name Screen */}
          {phase === "name" && (
            <div style={{ backgroundColor: "#1a0e06", padding: "30px 22px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <PolarBear size={68} />
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Hey, I'm Bogey</div>
                <div style={{ color: "rgba(245,230,208,0.6)", fontSize: 13, lineHeight: 1.5 }}>Your official Village Classic guide.<br />Who am I talking to?</div>
              </div>
              <input
                type="text"
                placeholder="Enter your name..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitName()}
                autoFocus
                style={{ width: "100%", padding: "11px 15px", borderRadius: 22, border: "0.5px solid rgba(232,106,47,0.45)", backgroundColor: "#2a1506", color: "#f5e6d0", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <button
                onClick={submitName}
                disabled={!nameInput.trim()}
                style={{ width: "100%", padding: 11, borderRadius: 22, border: "none", backgroundColor: nameInput.trim() ? "#e86a2f" : "rgba(232,106,47,0.2)", color: nameInput.trim() ? "#f5e6d0" : "rgba(245,230,208,0.3)", fontSize: 14, fontWeight: 700, cursor: nameInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
              >
                Let's Go →
              </button>
            </div>
          )}

          {/* Chat Screen */}
          {phase === "chat" && (
            <>
              <div style={{ backgroundColor: "#1a0e06", padding: "14px 12px", height: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 11 }}>
                {loading && messages.length === 0 && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#c1440e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <PolarBear size={22} />
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "4px 14px 14px 14px", backgroundColor: "#2a1506", border: "0.5px solid rgba(232,106,47,0.2)", display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#e86a2f", animation: `bogey-bounce 1.3s ease-in-out ${i * 0.22}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#c1440e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <PolarBear size={22} />
                      </div>
                    )}
                    <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px", backgroundColor: msg.role === "user" ? "#c1440e" : "#2a1506", color: "#f5e6d0", fontSize: 13, lineHeight: 1.6, border: msg.role === "assistant" ? "0.5px solid rgba(232,106,47,0.2)" : "none" }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && messages.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#c1440e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <PolarBear size={22} />
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "4px 14px 14px 14px", backgroundColor: "#2a1506", border: "0.5px solid rgba(232,106,47,0.2)", display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#e86a2f", animation: `bogey-bounce 1.3s ease-in-out ${i * 0.22}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <div style={{ backgroundColor: "#2a1506", padding: "11px 12px", borderTop: "0.5px solid rgba(232,106,47,0.2)", display: "flex", gap: 8, flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Ask Bogey anything..."
                  disabled={loading}
                  style={{ flex: 1, padding: "9px 13px", borderRadius: 20, border: "0.5px solid rgba(232,106,47,0.35)", backgroundColor: "#1a0e06", color: "#f5e6d0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  style={{ padding: "9px 16px", borderRadius: 20, border: "none", backgroundColor: loading || !input.trim() ? "rgba(232,106,47,0.2)" : "#e86a2f", color: loading || !input.trim() ? "rgba(245,230,208,0.35)" : "#f5e6d0", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes bogey-bounce {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [data, setData] = useState({ players: [], articles: [], history: [], historyPhotos: {}, logoUrl: null, recentRounds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const countdown = useCountdown();

  useEffect(() => {
    fetch("/api/sheet")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData({
          players: d.players || [],
          articles: d.articles || [],
          history: d.history || [],
          historyPhotos: d.historyPhotos || {},
          logoUrl: d.logoUrl || null,
          recentRounds: d.recentRounds || [],
        });
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const tabs = [
    { id: "home", label: "🏠 Home" },
    { id: "draftboard", label: "🏆 Draft Board" },
    { id: "players", label: "👤 Players" },
    { id: "itinerary", label: "📅 Itinerary" },
    { id: "points", label: "🏅 Points" },
    { id: "tripdetails", label: "🗺️ Trip Details" },
    { id: "news", label: "📰 News" },
    { id: "history", label: "🏛️ History" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .desktop-nav { display: none !important; }
        .hamburger { display: flex !important; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .hamburger { display: none !important; }
        }
      `}</style>

      <header style={{ background: `linear-gradient(90deg, ${COLORS.bgCard} 0%, #3a1f08 100%)`, borderBottom: `1px solid ${COLORS.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { setActiveTab("home"); setMenuOpen(false); }}>
            <span style={{ fontFamily: "Playfair Display, serif", color: COLORS.cream, fontSize: 18, fontWeight: 700 }}>The Village Classic</span>
          </div>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }} className="desktop-nav">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: activeTab === t.id ? COLORS.orange : "none", border: "none", color: activeTab === t.id ? "#fff" : COLORS.creamDim, cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 13, fontFamily: "DM Sans, sans-serif", transition: "all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.cream, cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 20 }} className="hamburger">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: COLORS.bgCard, borderTop: `1px solid ${COLORS.border}`, padding: "8px 0" }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: activeTab === t.id ? COLORS.orange : "none", border: "none", color: activeTab === t.id ? "#fff" : COLORS.cream, cursor: "pointer", padding: "12px 24px", fontSize: 15, fontFamily: "DM Sans, sans-serif" }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 80, color: COLORS.creamDim }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⛳</div>
            <div>Loading the Village Classic...</div>
          </div>
        )}
        {error && (
          <div style={{ background: "#3a1506", border: "1px solid #c1440e", borderRadius: 12, padding: 20, color: COLORS.cream }}>
            Error loading data: {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {activeTab === "home" && <HomePage data={data} countdown={countdown} />}
            {activeTab === "draftboard" && <DraftBoardPage players={data.players} />}
            {activeTab === "players" && <PlayersPage players={data.players} />}
            {activeTab === "itinerary" && <ItineraryPage />}
            {activeTab === "points" && <PointsPage />}
            {activeTab === "tripdetails" && <TripDetailsPage />}
            {activeTab === "news" && <NewsPage articles={data.articles} />}
            {activeTab === "history" && <HistoryPage history={data.history} historyPhotos={data.historyPhotos} />}
          </>
        )}
      </main>

      <BogeyChat />
    </div>
  );
}
