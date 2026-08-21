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
  { day: "Thu Sep 3", events: ["4:00 PM — Airbnb Check-in", "7:30 PM — Live Team Draft", "8:30 PM — Baseball (1pt)", "Dinner"] },
  { day: "Fri Sep 4", events: ["Coral Canyon Golf Course", "8:30 AM — 2v2 Matchplay (4pts)", "2:40 PM — 2v2 Scramble (4pts)", "Dinner at Home"] },
  { day: "Sat Sep 5", events: ["Sand Hollow Resort", "7:40 AM — 2v2 Matchplay (4pts)", "3:00 PM — Modified Alternate Shot (4pts)", "Dinner"] },
  { day: "Sun Sep 6", events: ["Copper Rock Golf Course", "9:36 AM — Championship 1v1 Matchplay (8pts)", "Championship Award"] },
  { day: "Mon Sep 7", events: ["10:00 AM — Airbnb Checkout", "Depart"] },
];

// ─── Trip timeline (Mountain Daylight Time = UTC-6 in September) ─────────────
// Anchored to UTC so the banner is correct whether a phone is still on Eastern
// in transit or has switched to Mountain on arrival.
// Only events with a KNOWN time get an anchor; untimed items ride along as `then`.
const TRIP_TIMELINE = [
  { at: "2026-09-03T22:00:00Z", hours: 3.5, icon: "🏠", label: "Airbnb Check-in", detail: "St. George · arrival day",
    then: "settle in — the draft is at 7:30 PM" },
  { at: "2026-09-04T01:30:00Z", hours: 1, icon: "📋", label: "Live Team Draft", detail: "Team John vs Team Brian · 14 picks, snake order",
    then: "Baseball at 8:30" },
  { at: "2026-09-04T02:30:00Z", hours: 1.5, icon: "⚾", label: "Baseball", detail: "Team vs Team · 1 point",
    then: "Dinner → captains set Friday morning pairings" },
  { at: "2026-09-04T14:30:00Z", hours: 5.5, golf: true, icon: "⛳", label: "Coral Canyon — Morning Round", detail: "2v2 Matchplay · 4 points",
    then: "Lunch at the course → captains set afternoon pairings" },
  { at: "2026-09-04T20:40:00Z", hours: 5, golf: true, icon: "🌇", label: "Coral Canyon — Afternoon Round", detail: "Full 2v2 Scramble · 4 points",
    then: "Dinner at the house" },
  { at: "2026-09-05T13:40:00Z", hours: 5.5, golf: true, icon: "⛳", label: "Sand Hollow — Morning Round", detail: "2v2 Matchplay · 4 points",
    then: "Lunch at the course → captains set afternoon pairings" },
  { at: "2026-09-05T21:00:00Z", hours: 5, golf: true, icon: "🌇", label: "Sand Hollow — Afternoon Round", detail: "Full Modified Alternate Shot · 4 points",
    then: "Dinner → captains make singles pairings" },
  { at: "2026-09-06T15:36:00Z", hours: 6, golf: true, icon: "🏆", label: "Copper Rock — Championship", detail: "1v1 Singles Matchplay · 8 points",
    then: "Championship Award → group hang" },
  { at: "2026-09-07T16:00:00Z", hours: 2, icon: "✈️", label: "Airbnb Checkout", detail: "Depart", then: null },
];

const TRIPINFO_ICONS = {
  "The House": "🏡", "Arrivals & Rides": "🚗", "Money": "💵", "Food": "🍽️",
  "Weather": "🌵", "Contacts": "📞", "Course Notes": "⛳", "Local Knowledge": "🗺️",
};

const PACKING_LIST = [
  "Golf Clubs", "Golf Shoes", "Golf Balls", "Golf Gloves",
  "3 Days of Golf Outfits", "Evening / Dinner Outfits", "Belts", "Hats",
  "Lounging / Room Clothes", "Swimsuit", "Towel (pool + shower)",
  "Casual Shoes", "Jackets", "Deodorant", "Toothpaste", "Socks", "Underwear",
  "Sunscreen (SPF 50)", "Lip balm w/ SPF", "Sunglasses", "Insulated water bottle",
  "Electrolyte packets", "Extra golf shirt per day", "Advil", "Blister/band aids",
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

// Article and storyline bodies use "||" between paragraphs in the Google Sheet.
// Always render through this — printing a body directly leaks literal pipes.
function paragraphs(text) {
  return (text || "").split("||").map((p) => p.trim()).filter(Boolean);
}

function formatDiff(diff) {
  if (diff === null) return "—";
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
}

// Lowest / highest round relative to a player's personal target
function getScoreRange(player) {
  const scores = (player.scores || []).filter((s) => typeof s === "number" && !isNaN(s));
  if (scores.length === 0) return null;
  const target = getTarget(player.handicap);
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  return { low, high, lowDiff: low - target, highDiff: high - target };
}

// Whole numbers render clean (-10, not -10.0); decimals keep one place
function formatRoundDiff(diff) {
  if (diff === null || diff === undefined) return "—";
  if (diff === 0) return "E";
  const n = Number.isInteger(diff) ? diff : diff.toFixed(1);
  return diff > 0 ? `+${n}` : `${n}`;
}

function diffColorFor(diff) {
  if (diff === null || diff === undefined) return COLORS.creamDim;
  if (diff <= 0) return "#4caf50";
  if (diff <= 5) return COLORS.tan;
  return "#e57373";
}

// No CSS files in this project, so breakpoints are handled in JS
function useIsMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
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

// ─── Teams ───────────────────────────────────────────────────────────────────
// Single source of truth for team identity. The Big Board, badges, Teams page
// and split Draft Board all read from here.
const TEAMS = [
  { name: "Team John", captain: "John Mullin", color: "#e86a2f" },
  { name: "Team Brian", captain: "Brian Dalidowicz", color: "#4a9edd" },
];

function teamMeta(teamName) {
  return TEAMS.find((t) => t.name === teamName) || null;
}

// Average of every rostered player's avg-vs-target. Lower = stronger team.
function teamAvg(players) {
  const vals = players.map((p) => getAvgDiff(p)).filter((v) => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function TeamBadge({ team, small }) {
  const m = teamMeta(team);
  if (!m) return null;
  return (
    <span style={{
      display: "inline-block", background: `${m.color}22`, border: `1px solid ${m.color}`,
      color: m.color, borderRadius: 4, padding: small ? "1px 6px" : "2px 8px",
      fontSize: small ? 10 : 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.6, whiteSpace: "nowrap",
    }}>
      {m.name.replace("Team ", "")}
    </span>
  );
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
      {isAttending && player.team && (
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <TeamBadge team={player.team} small />
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
  const range = getScoreRange(player);
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", margin: 0, fontSize: 28 }}>{player.name}</h2>
            {player.team && <TeamBadge team={player.team} />}
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 15, marginBottom: 8 }}>Handicap: {player.handicap} | Target: {target}</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Rounds: <strong>{player.scores?.length || 0}</strong> &nbsp;|&nbsp;
            Avg vs Target: <strong style={{ color: avg !== null && avg <= 0 ? "#4caf50" : COLORS.orange }}>{avg === null ? "—" : formatDiff(avg)}</strong>
          </div>
          {range && (
            <div style={{ fontSize: 15, marginBottom: 8, display: "flex", gap: 18, flexWrap: "wrap" }}>
              <span style={{ color: COLORS.creamDim }}>
                Lowest Round:{" "}
                <strong style={{ color: COLORS.cream }}>{range.low}</strong>{" "}
                <strong style={{ color: diffColorFor(range.lowDiff) }}>({formatRoundDiff(range.lowDiff)})</strong>
              </span>
              <span style={{ color: COLORS.creamDim }}>
                Highest Round:{" "}
                <strong style={{ color: COLORS.cream }}>{range.high}</strong>{" "}
                <strong style={{ color: diffColorFor(range.highDiff) }}>({formatRoundDiff(range.highDiff)})</strong>
              </span>
            </div>
          )}
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
                  <div style={{ fontSize: 12, color: diff <= 0 ? "#4caf50" : COLORS.orange }}>{formatRoundDiff(diff)}</div>
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

// Live "what's happening now / what's next" banner. Replaces the countdown
// once the trip starts, which is exactly when the countdown stops being useful.
// Test any moment with ?now=2026-09-05T21:00:00Z
function NowNextBanner() {
  const override = new URLSearchParams(window.location.search).get("now");
  const [now, setNow] = useState(() => (override ? new Date(override) : new Date()));

  useEffect(() => {
    if (override) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [override]);

  const events = TRIP_TIMELINE.map((e) => ({ ...e, date: new Date(e.at) }));
  const first = events[0].date;
  const last = events[events.length - 1].date;

  // Before arrival or after checkout — let the normal countdown/hero do its job
  if (now < first || now > new Date(last.getTime() + 4 * 3600 * 1000)) return null;

  // An event is "now" only while it's actually running — otherwise we'd still be
  // calling Saturday's afternoon round "happening now" on Sunday morning.
  const current = events.find(
    (e) => e.date <= now && now < new Date(e.date.getTime() + (e.hours || 4) * 3600 * 1000)
  ) || null;
  const next = events.find((e) => e.date > now) || null;

  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" });

  let untilStr = null;
  if (next) {
    const secs = Math.max(0, Math.floor((next.date - now) / 1000));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    untilStr = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
  }

  return (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderLeft: `8px solid ${COLORS.orange}`, borderRadius: 14, padding: "18px 22px", marginBottom: 28 }}>
      {current && (
        <>
          <div style={{ color: COLORS.orangeLight, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>
            Happening Now
          </div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, color: COLORS.cream, margin: "2px 0 2px" }}>
            {current.icon} {current.label}
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 14 }}>
            {current.detail}{current.then ? ` · then ${current.then}` : ""}
          </div>
        </>
      )}
      {!current && next && (
        <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 2 }}>
          Between Rounds
        </div>
      )}
      {next && (
        <div style={{ marginTop: current ? 16 : 0, paddingTop: current ? 14 : 0, borderTop: current ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: COLORS.tan, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Up Next</div>
            <div style={{ fontSize: 17, color: COLORS.cream, fontWeight: 600 }}>{next.icon} {next.label}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 13 }}>{next.detail} · {fmt(next.date)} MT</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>{next.golf ? "Tees in" : "Starts in"}</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 30, color: COLORS.orangeLight, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{untilStr}</div>
          </div>
        </div>
      )}
      {!next && (
        <div style={{ marginTop: 12, color: COLORS.tan, fontSize: 14 }}>
          That's a wrap on the 2026 Village Classic. See you next year.
        </div>
      )}
    </div>
  );
}

// Compact live score for the Home page. Reuses the same `matches` payload the
// Points page is built on — no new data, no new sheet tab.
function HomeScoreboard({ matches, onOpenPoints }) {
  const john = TEAMS[0], brian = TEAMS[1];
  const { johnPoints, brianPoints, totalPoints, remaining, clinch, sessions } = matches;
  const clinched = johnPoints >= clinch ? john : brianPoints >= clinch ? brian : null;
  const leader = johnPoints > brianPoints ? john : brianPoints > johnPoints ? brian : null;

  // Most recently decided match, for a one-line "latest result"
  const decided = sessions.flatMap((s) => s.matches.filter((m) => m.winner).map((m) => ({ ...m, session: s.name })));
  const latest = decided[decided.length - 1] || null;

  return (
    <div
      onClick={onOpenPoints}
      style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 40, cursor: onOpenPoints ? "pointer" : "default" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: COLORS.tan, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>
          {clinched ? "Final" : "Live Score"}
        </span>
        <span style={{ color: COLORS.creamDim, fontSize: 12 }}>
          {clinched ? `${clinched.name} wins` : `First to ${clinch} · ${remaining} left`}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: john.color, fontFamily: "Playfair Display, serif", fontSize: 18 }}>{john.name}</div>
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: john.color, fontVariantNumeric: "tabular-nums" }}>{johnPoints}</div>
        </div>
        <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>vs</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ color: brian.color, fontFamily: "Playfair Display, serif", fontSize: 18 }}>{brian.name}</div>
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: brian.color, fontVariantNumeric: "tabular-nums" }}>{brianPoints}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, height: 7, borderRadius: 4, background: COLORS.bgCardLight, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${(johnPoints / totalPoints) * 100}%`, background: john.color }} />
        <div style={{ width: `${(brianPoints / totalPoints) * 100}%`, background: brian.color }} />
      </div>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: COLORS.creamDim, fontSize: 13 }}>
          {clinched ? `🏆 ${clinched.name} has clinched` : leader ? `${leader.name} leads by ${Math.abs(johnPoints - brianPoints)}` : "All square"}
        </span>
        {latest && (
          <span style={{ color: COLORS.creamDim, fontSize: 13 }}>
            Latest: <strong style={{ color: teamMeta(latest.winner)?.color }}>{latest.winner.replace("Team ", "")}</strong> took {latest.session} #{latest.match}
            {latest.puttOff ? " ⛳" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function HomePage({ data, countdown, onOpenPoints }) {
  const sorted = [...data.players]
    .filter((p) => p.attending2026)
    .map((p) => ({ ...p, avg: getAvgDiff(p) }))
    .filter((p) => p.avg !== null)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  const recentRounds = data.recentRounds || [];
  const latestArticle = data.articles[0];

  // Once the trip is underway the countdown is dead weight — swap in Now/Next
  const nowOverride = new URLSearchParams(window.location.search).get("now");
  const rightNow = nowOverride ? new Date(nowOverride) : new Date();
  const tripStarted = rightNow >= new Date(TRIP_TIMELINE[0].at);

  return (
    <div style={{ color: COLORS.cream }}>
      <div style={{ textAlign: "center", marginBottom: 40, padding: "40px 20px", background: `linear-gradient(180deg, #3a1f08 0%, ${COLORS.bg} 100%)`, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
        {data.logoUrl && (
          <div style={{ width: 160, height: 160, borderRadius: "50%", overflow: "hidden", margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <img src={data.logoUrl} alt="Village Classic Logo" style={{ width: "140%", height: "140%", objectFit: "cover", marginLeft: "-20%", marginTop: "-20%" }} />
          </div>
        )}
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 6vw, 52px)", margin: "0 0 8px", color: COLORS.cream }}>The Village Classic</h1>
        <div style={{ color: COLORS.tan, fontSize: 18, marginBottom: tripStarted ? 0 : 24 }}>St. George, Utah — September 3–7, 2026</div>
        <div style={{ display: tripStarted ? "none" : "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[["days", "Days"], ["hours", "Hours"], ["minutes", "Min"], ["seconds", "Sec"]].map(([key, label]) => (
            <div key={key} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 20px", minWidth: 70, textAlign: "center" }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 700, color: COLORS.orangeLight }}>{countdown[key] ?? "—"}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <NowNextBanner />

      {/* Once points are on the board the static team cards are dead weight —
          the same real estate becomes the live scoreboard. */}
      {data.matches?.played > 0 ? (
        <HomeScoreboard matches={data.matches} onOpenPoints={onOpenPoints} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          {[{ name: "Team John", captain: "John Mullin", icon: "👑" }, { name: "Team Brian", captain: "Brian Dalidowicz", icon: "🔥" }].map((team) => (
            <div key={team.name} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{team.icon}</div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: COLORS.cream, marginTop: 6 }}>{team.name}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 14 }}>Captain: {team.captain}</div>
            </div>
          ))}
        </div>
      )}

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
              {paragraphs(latestArticle.body).join(" ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Post-draft view: the same ranking, split by team, with combined team strength.
function TeamStandings({ players, isMobile, embedded }) {
  const byTeam = TEAMS.map((t) => ({
    ...t,
    roster: players.filter((p) => p.team === t.name),
  }));
  const avgs = byTeam.map((t) => teamAvg(t.roster));
  const best = avgs.filter((a) => a !== null).sort((a, b) => a - b)[0];

  return (
    <div style={{ color: COLORS.cream }}>
      {!embedded && (
        <>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏆 Draft Board</h1>
          <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>
            Rosters are set. Each team ranked by average score vs personal target (72 + handicap + 3). Lower = better.
          </p>
        </>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {byTeam.map((t, ti) => {
          const avg = avgs[ti];
          const isBest = avg !== null && avg === best;
          return (
            <div key={t.name} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderTop: `5px solid ${t.color}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", background: COLORS.bgCardLight, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: t.color }}>{t.name}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: COLORS.creamDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Team Avg</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: diffColorFor(avg) }}>{avg === null ? "—" : formatDiff(avg)}</div>
                  </div>
                </div>
                <div style={{ color: COLORS.creamDim, fontSize: 12, marginTop: 2 }}>
                  Captain: {t.captain} · {t.roster.length} players{isBest ? " · 📈 Stronger on paper" : ""}
                </div>
              </div>
              {t.roster.map((p, i) => (
                <div key={p.name} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 8, padding: "11px 16px", borderBottom: i < t.roster.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "center" }}>
                  <div style={{ color: COLORS.creamDim, fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⛳</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}{p.name === t.captain && <span style={{ color: t.color, fontSize: 10, marginLeft: 6, fontWeight: 700 }}>©</span>}
                      </div>
                      <div style={{ color: COLORS.creamDim, fontSize: 11 }}>
                        HCP {p.handicap} · Tgt {getTarget(p.handicap)}
                        {p.range && <> · <span style={{ color: diffColorFor(p.range.lowDiff) }}>L {formatRoundDiff(p.range.lowDiff)}</span> · <span style={{ color: diffColorFor(p.range.highDiff) }}>H {formatRoundDiff(p.range.highDiff)}</span></>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: diffColorFor(p.avg) }}>{p.avg === null ? "—" : formatDiff(p.avg)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamsPage({ players, draft }) {
  const isMobile = useIsMobile();
  const roster = players
    .filter((p) => p.attending2026)
    .map((p) => ({ ...p, avg: getAvgDiff(p), range: getScoreRange(p) }))
    .sort((a, b) => {
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  if (!draft?.complete) {
    return (
      <div style={{ color: COLORS.cream }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🤝 Teams</h1>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 40, textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color: COLORS.tan, marginBottom: 8 }}>Rosters drop at the live draft</div>
          <p style={{ color: COLORS.creamDim, fontSize: 14, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
            Thursday, September 3 in St. George. {draft?.picks?.length ? `${draft.picks.length} pick${draft.picks.length === 1 ? "" : "s"} are in the books — this page fills in the moment the board is complete.` : "Nothing has been picked yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🤝 Teams</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Final rosters from the {new Date().getFullYear()} live draft.</p>
      <TeamStandings players={roster} isMobile={isMobile} embedded />
      {draft.picks?.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 12 }}>📋 Draft Order</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            {draft.picks.map((p) => {
              const m = teamMeta(p.team);
              return (
                <div key={p.pick} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${m ? m.color : COLORS.border}`, borderRadius: 8, padding: "9px 13px" }}>
                  <span style={{ color: COLORS.creamDim, fontWeight: 700, fontSize: 13, minWidth: 24 }}>{p.pick}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{p.player}</span>
                  <TeamBadge team={p.team} small />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rules ───────────────────────────────────────────────────────────────────
// Static on purpose: these are settled and change roughly never. If you ever
// want to edit them from your phone mid-trip, move RULES into a sheet tab.
const RULE_ONE = {
  title: "Don't Be An Asshole",
  body: [
    "This is Rule #1 and it outranks everything below it. The whole point is a good time and friendly competition between friends.",
    "**Cheating falls under this rule.** So does anything else that makes the weekend worse for the group.",
    "That's it. That's the rule.",
  ],
};

const RULES = [
  {
    icon: "🏌️", title: "Playing the Round",
    body: [
      "**Fluff and wipe — fairway only.** If your ball is in the fairway you may improve the lie and clean the ball. Anywhere else — rough, sand, trees, hardpan — you play it as it lies.",
      "**Everywhere else, the Rules of Golf apply** — with the local exceptions on this page.",
      "**Everything plays as a red stake.** Out of bounds, lost ball, water — all of it is treated as a lateral hazard. Drop at the spot where the ball crossed or went out, **take your penalty stroke**, and play from the grass there. No stroke and distance, no walking back to the tee, no provisionals.",
      "**Morning rounds — ball in the hole.** No concessions and no gimmies, even in the 2v2 matchplay. Everyone holes out, every hole. The morning rounds are the ones scored for the Individual Championship, so every card has to be real.",
      "**One free re-hit per morning round.** One mulligan per player, per morning round, and it costs you no stroke.",
      "**Gimmies are allowed in the afternoon rounds.** Scramble and Modified Alternate Shot are team formats with no individual score, so give what you like.",
    ],
  },
  {
    icon: "🎯", title: "Scoring & Your Target",
    body: [
      "Every player has a personal target score: **72 (par) + your handicap + 3 buffer strokes**. A 12 handicap plays to 87.",
      "The Draft Board ranks everyone by average score versus their own target. Lower is better. This is how preseason form is measured and how captains size you up.",
    ],
  },
  {
    icon: "🏅", title: "Points — 25 on the line",
    body: [
      "**Baseball (Thu):** 1 point · **Coral Canyon:** 4 + 4 · **Sand Hollow:** 4 + 4 · **Copper Rock singles:** 8.",
      "One point per match, winner takes it. **First team to 13 clinches** the Village Classic.",
      "**The prize:** a flag from Sand Hollow for the winning team. Two players on opposite teams may agree between themselves to swap it for another item, or **$50 to spend in the pro shop**.",
    ],
  },
  {
    icon: "⛳", title: "The Formats",
    body: [
      "**2v2 Matchplay** (Friday & Saturday mornings) — standard team matchplay, and the round that counts toward the Individual Championship.",
      "**Full 2v2 Scramble** (Friday afternoon) — both partners hit every shot, you play the better one.",
      "**Full Modified Alternate Shot** (Saturday afternoon) — both partners hit a tee ball on every hole. Pick the ball you want, then play alternate shot from there. **No player may hit two shots in a row on a hole** — so whoever's drive you take, their partner plays the next shot.",
      "**1v1 Singles Matchplay** (Sunday at Copper Rock) — head to head, 8 points, the whole thing usually rides on it.",
    ],
  },
  {
    icon: "🥊", title: "Ties — the Putt-Off",
    body: [
      "**There are no ties in the Village Classic.** Every match produces a winner.",
      "If a match finishes level, the teams head to the putting green **after the round** and settle it there.",
      "**2v2 matches:** alternate shot putting, best of 3 'holes' — the group picks the holes. Tied after three, it goes to **sudden death**.",
      "**1v1 singles:** the same thing head to head — solo putting, best of 3, then sudden death.",
      "A match decided this way is marked **decided by putt-off** on the Points page. It goes in the record.",
    ],
  },
  {
    icon: "🏆", title: "The Individual Championship",
    body: [
      "Separate from the team competition, and decided across **the first round of each day** — Friday morning at Coral Canyon, Saturday morning at Sand Hollow, and Sunday at Copper Rock. Three individually scored rounds.",
      "The champion is the player with the **lowest cumulative score relative to their own target** across those three rounds.",
      "The afternoon scramble and alternate shot rounds do not count — there's no individual score in those formats.",
      "**If two players tie:** a playoff hole decides it, if the course will let us. If not, it goes to a solo putt-off under the same rules as a match tiebreaker — best of 3, then sudden death.",
    ],
  },
  {
    icon: "📋", title: "The Draft",
    body: [
      "Thursday, 7:30 PM, live at the house. **John Mullin and Brian Dalidowicz** captain, and both count against their own roster — 8 players per team.",
      "**14 picks in snake order** (1-2-2-1): John, Brian, Brian, John, John, and so on. Seven picks each.",
      "Two minutes on the clock per pick. The board is on the TV.",
    ],
  },
];

// Renders **bold** segments without pulling in a markdown library
function RuleText({ text }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
        chunk.startsWith("**") && chunk.endsWith("**")
          ? <strong key={i} style={{ color: COLORS.cream }}>{chunk.slice(2, -2)}</strong>
          : <span key={i}>{chunk}</span>
      )}
    </>
  );
}

function RulesPage() {
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>📖 Rules</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>
        Settle it here before you settle it on the tee.
      </p>

      {/* Rule #1 — deliberately outsized. It outranks everything below it. */}
      <div style={{ background: "linear-gradient(135deg, #4a1d06 0%, #2a1506 100%)", border: `2px solid ${COLORS.orange}`, borderRadius: 16, padding: "26px 26px 22px", marginBottom: 22, boxShadow: "0 4px 24px rgba(193,68,14,0.25)" }}>
        <div style={{ color: COLORS.orangeLight, fontSize: 12, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, marginBottom: 6 }}>
          Rule&nbsp;#1
        </div>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px, 5vw, 40px)", color: COLORS.cream, lineHeight: 1.1, marginBottom: 14 }}>
          {RULE_ONE.title}
        </div>
        {RULE_ONE.body.map((line, i) => (
          <p key={i} style={{ color: COLORS.creamDim, fontSize: 15, lineHeight: 1.65, margin: i === RULE_ONE.body.length - 1 ? 0 : "0 0 10px" }}>
            <RuleText text={line} />
          </p>
        ))}
      </div>

      {RULES.map((r) => (
        <div key={r.title} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderLeft: `5px solid ${COLORS.orange}`, borderRadius: 12, padding: "18px 22px", marginBottom: 14 }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 21, color: COLORS.tan, marginBottom: 10 }}>
            {r.icon} {r.title}
          </div>
          {r.body.map((line, i) => (
            <p key={i} style={{ color: COLORS.creamDim, fontSize: 14.5, lineHeight: 1.65, margin: i === r.body.length - 1 ? 0 : "0 0 10px" }}>
              <RuleText text={line} />
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function DraftBoardPage({ players, draft }) {
  const isMobile = useIsMobile();
  const attendingPlayers = players.filter((p) => p.attending2026);
  const sorted = [...attendingPlayers]
    .map((p) => ({ ...p, avg: getAvgDiff(p), range: getScoreRange(p) }))
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  // Once every attending player has a team, the board splits into team standings
  if (draft?.complete) return <TeamStandings players={sorted} isMobile={isMobile} />;

  // Desktop gets dedicated Low / High columns; mobile folds them under the name
  const gridCols = isMobile ? "34px 1fr auto" : "40px 1fr auto auto auto auto auto";
  const headStyle = { color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "right", paddingRight: 16 };
  const cellStyle = { color: COLORS.creamDim, textAlign: "right", paddingRight: 16, fontSize: 14 };

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏆 Draft Board</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Ranked by average score vs personal target (72 + handicap + 3). Lower = better. Low / High show each player's best and worst round relative to that target.</p>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 0, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgCardLight }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase" }}>#</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase" }}>Player</div>
          {!isMobile && <div style={headStyle}>HCP</div>}
          {!isMobile && <div style={headStyle}>Target</div>}
          {!isMobile && <div style={headStyle}>Low</div>}
          {!isMobile && <div style={headStyle}>High</div>}
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Avg Diff</div>
        </div>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 0, padding: "14px 16px", borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "center" }}>
            <div style={{ color: i < 3 ? [COLORS.tan, "#9e9e9e", "#cd7f32"][i] : COLORS.creamDim, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {p.photo ? (
                <img src={p.photo} alt={p.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.bgCardLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⛳</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ color: COLORS.cream, fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                <div style={{ color: COLORS.creamDim, fontSize: 12 }}>
                  {p.scores?.length || 0} round{p.scores?.length !== 1 ? "s" : ""}
                  {isMobile && p.range && (
                    <>
                      {" · "}
                      <span style={{ color: diffColorFor(p.range.lowDiff) }}>L {formatRoundDiff(p.range.lowDiff)}</span>
                      {" · "}
                      <span style={{ color: diffColorFor(p.range.highDiff) }}>H {formatRoundDiff(p.range.highDiff)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!isMobile && <div style={cellStyle}>{p.handicap}</div>}
            {!isMobile && <div style={cellStyle}>{getTarget(p.handicap)}</div>}
            {!isMobile && (
              <div style={{ ...cellStyle, fontWeight: 600 }}>
                {p.range ? (
                  <>
                    <span style={{ color: diffColorFor(p.range.lowDiff) }}>{formatRoundDiff(p.range.lowDiff)}</span>
                    <span style={{ color: COLORS.creamDim, fontSize: 11 }}> ({p.range.low})</span>
                  </>
                ) : "—"}
              </div>
            )}
            {!isMobile && (
              <div style={{ ...cellStyle, fontWeight: 600 }}>
                {p.range ? (
                  <>
                    <span style={{ color: diffColorFor(p.range.highDiff) }}>{formatRoundDiff(p.range.highDiff)}</span>
                    <span style={{ color: COLORS.creamDim, fontSize: 11 }}> ({p.range.high})</span>
                  </>
                ) : "—"}
              </div>
            )}
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
      {/* Course Map removed Aug 19, 2026 — the embed key was a hardcoded
          placeholder, so it rendered as an empty box. The Quick Links below
          open each course in Google Maps and do the same job. */}
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

// Session display metadata — keyed by the Session value in the Matches sheet tab.
// Unknown session names still render, just without the course/format subtitle.
const SESSION_META = {
  "Baseball": { label: "Baseball", detail: "Thursday · Team vs Team", icon: "⚾" },
  "Fri AM":   { label: "Coral Canyon — Morning",   detail: "Friday · 2v2 Matchplay", icon: "🌅" },
  "Fri PM":   { label: "Coral Canyon — Afternoon", detail: "Friday · Full 2v2 Scramble", icon: "🌇" },
  "Sat AM":   { label: "Sand Hollow — Morning",    detail: "Saturday · 2v2 Matchplay", icon: "🌅" },
  "Sat PM":   { label: "Sand Hollow — Afternoon",  detail: "Saturday · Full Modified Alternate Shot", icon: "🌇" },
  "Sun":      { label: "Copper Rock — Championship", detail: "Sunday · 1v1 Singles", icon: "🏆" },
};

function PointsPage({ matches }) {
  const isMobile = useIsMobile();
  const john = TEAMS[0], brian = TEAMS[1];

  // No Matches tab yet (or it's empty) — fall back to the static points schedule
  if (!matches || !matches.sessions?.length) {
    const events = [
      { name: "Baseball (Thursday)", format: "Team vs Team", pts: 1 },
      { name: "Coral Canyon — 2v2 Matchplay", format: "1pt per match", pts: 4 },
      { name: "Coral Canyon — 2v2 Scramble", format: "1pt per match", pts: 4 },
      { name: "Sand Hollow — 2v2 Matchplay", format: "1pt per match", pts: 4 },
      { name: "Sand Hollow — Modified Alternate Shot", format: "1pt per match", pts: 4 },
      { name: "Copper Rock — 1v1 Singles", format: "1pt per match", pts: 8 },
    ];
    return (
      <div style={{ color: COLORS.cream }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏅 Points</h1>
        <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>25 points on the line. Live match results appear here once play begins.</p>
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
          {events.map((e, i) => (
            <div key={e.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < events.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{e.name}</div>
                <div style={{ color: COLORS.creamDim, fontSize: 12 }}>{e.format}</div>
              </div>
              <div style={{ color: COLORS.tan, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>{e.pts} pt{e.pts > 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { sessions, johnPoints, brianPoints, totalPoints, remaining, clinch } = matches;
  const leader = johnPoints > brianPoints ? john : brianPoints > johnPoints ? brian : null;
  const clinched = johnPoints >= clinch ? john : brianPoints >= clinch ? brian : null;

  const scoreCol = (team, pts, align) => (
    <div style={{ textAlign: align, flex: 1 }}>
      <div style={{ color: team.color, fontFamily: "Playfair Display, serif", fontSize: isMobile ? 17 : 22 }}>{team.name}</div>
      <div style={{ fontSize: isMobile ? 52 : 72, fontWeight: 700, lineHeight: 1, color: team.color, fontVariantNumeric: "tabular-nums" }}>{pts}</div>
    </div>
  );

  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🏅 Points</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 20, fontSize: 14 }}>
        {clinched
          ? `${clinched.name} has clinched the 2026 Village Classic.`
          : `First to ${clinch} clinches · ${remaining} of ${totalPoints} still on the board.`}
      </p>

      {/* ── Live scoreboard ─────────────────────────────────────────────── */}
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: isMobile ? "18px 14px" : "22px 30px", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {scoreCol(john, johnPoints, "left")}
          <div style={{ color: COLORS.creamDim, fontSize: 13, textTransform: "uppercase", letterSpacing: 2, paddingBottom: 6 }}>vs</div>
          {scoreCol(brian, brianPoints, "right")}
        </div>
        <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: COLORS.bgCardLight, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${(johnPoints / totalPoints) * 100}%`, background: john.color }} />
          <div style={{ width: `${(brianPoints / totalPoints) * 100}%`, background: brian.color }} />
        </div>
        <div style={{ marginTop: 10, textAlign: "center", color: COLORS.creamDim, fontSize: 13 }}>
          {clinched ? `🏆 ${clinched.name} wins` : leader ? `${leader.name} leads by ${Math.abs(johnPoints - brianPoints)}` : "All square"}
        </div>
      </div>

      {/* ── Sessions ────────────────────────────────────────────────────── */}
      {sessions.map((s) => {
        const meta = SESSION_META[s.name] || { label: s.name, detail: "", icon: "⛳" };
        const done = s.matches.filter((m) => m.winner).length;
        return (
          <div key={s.name} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "13px 16px", background: COLORS.bgCardLight, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: COLORS.tan }}>{meta.icon} {meta.label}</div>
                {meta.detail && <div style={{ color: COLORS.creamDim, fontSize: 12 }}>{meta.detail}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: COLORS.creamDim, fontSize: 12 }}>{done}/{s.matches.length}</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>
                  <span style={{ color: john.color }}>{s.johnPoints}</span>
                  <span style={{ color: COLORS.creamDim }}> – </span>
                  <span style={{ color: brian.color }}>{s.brianPoints}</span>
                </span>
              </div>
            </div>
            {s.matches.map((m, i) => {
              const set = m.john || m.brian;
              const wm = m.winner ? teamMeta(m.winner) : null;
              // A decided match with no pairings is a whole-team event (e.g. Baseball) —
              // show the team names rather than "TBD", which would read as missing data.
              const teamEvent = !set && !!m.winner;
              const side = (text, team, won, align) => (
                <div style={{ flex: 1, textAlign: align, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: won ? 700 : 500, color: won ? team.color : m.winner ? COLORS.creamDim : COLORS.cream }}>
                    {text || (teamEvent ? team.name : <span style={{ color: COLORS.creamDim, fontStyle: "italic" }}>TBD</span>)}
                  </div>
                </div>
              );
              return (
                <div key={i} style={{ padding: "12px 16px", borderBottom: i < s.matches.length - 1 ? `1px solid ${COLORS.border}` : "none", opacity: set || m.winner ? 1 : 0.55 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: COLORS.creamDim, fontSize: 11, minWidth: 20 }}>{m.match}</span>
                    {side(m.john, john, m.winner === john.name, "left")}
                    <div style={{ textAlign: "center", minWidth: 62 }}>
                      {m.winner ? (
                        <span style={{ background: `${wm.color}22`, border: `1px solid ${wm.color}`, color: wm.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {wm.name.replace("Team ", "")} +1
                        </span>
                      ) : (
                        <span style={{ color: COLORS.creamDim, fontSize: 11 }}>vs</span>
                      )}
                    </div>
                    {side(m.brian, brian, m.winner === brian.name, "right")}
                  </div>
                  {m.puttOff && (
                    <div style={{ textAlign: "center", marginTop: 6, color: COLORS.tan, fontSize: 11, letterSpacing: 0.5 }}>
                      ⛳ Decided by putt-off
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TripInfoCard({ section }) {
  const icon = TRIPINFO_ICONS[section.name] || "📌";
  return (
    <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
      <h2 style={{ fontFamily: "Playfair Display, serif", color: COLORS.orangeLight, marginBottom: 14, fontSize: 18 }}>
        {icon} {section.name}
      </h2>
      <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.8 }}>
        {section.items.map((it, i) =>
          it.label ? (
            <div key={i}>
              <strong style={{ color: COLORS.cream }}>{it.label}:</strong> {it.value}
            </div>
          ) : (
            // Blank Label = a standalone note rather than a key/value line
            <div key={i} style={{ marginTop: 8, fontStyle: "italic" }}>{it.value}</div>
          )
        )}
      </div>
    </div>
  );
}

function TripDetailsPage({ tripInfo }) {
  return (
    <div style={{ color: COLORS.cream }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: COLORS.tan, marginBottom: 6 }}>🗺️ Trip Details</h1>
      <p style={{ color: COLORS.creamDim, marginBottom: 24, fontSize: 14 }}>Everything you need to know before you go.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {/* Everything from the TripInfo sheet tab renders first — Cam edits it from his phone */}
        {(tripInfo || []).map((section) => <TripInfoCard key={section.name} section={section} />)}
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
            <div style={{ marginTop: 12 }}><strong style={{ color: COLORS.cream }}>Team Prize:</strong> A flag from Sand Hollow</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Two players on opposite teams may agree to swap it for another item, or $50 in the pro shop.</div>
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
          <div style={{ color: COLORS.creamDim, fontSize: 14, lineHeight: 1.7, overflow: "hidden", maxHeight: expanded === i ? "none" : 100 }}>
            {paragraphs(a.body).map((para, pi) => (
              <p key={pi} style={{ margin: pi === 0 ? "0 0 12px" : "0 0 12px" }}>{para}</p>
            ))}
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
// ─── Visual Big Board — live draft display (?view=bigboard) ──────────────────
// Inspired by the Internet Invitational draft night: captains alternate picks in
// snake order, on the clock banner, best available callout, running pick ticker.
//
// Controls (draft operator only — hidden from the TV with ?clean=1):
//   click a player card  → assigns to whichever team is on the clock
//   ⌫ Undo               → removes the last pick
//   Picks also POST to /api/draftpicks so the sheet has a permanent record.

const PICK_SECONDS = 120; // 2 minutes on the clock per pick

function formatClock(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const clockBtn = {
  background: "none",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.creamDim,
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const CAPTAINS = TEAMS.map((t) => ({ name: t.captain, team: t.name, color: t.color }));

// Snake order for 14 picks: J, B, B, J, J, B, B, J, J, B, B, J, J, B
function snakeOrder(totalPicks) {
  const order = [];
  let round = 0;
  while (order.length < totalPicks) {
    const first = round % 2 === 0 ? 0 : 1;
    order.push(first, 1 - first);
    round++;
  }
  return order.slice(0, totalPicks);
}

function BigBoard({ players }) {
  const params = new URLSearchParams(window.location.search);
  const clean = params.get("clean") === "1";
  const secret = params.get("k") || "";

  const pool = players
    .filter((p) => p.attending2026)
    .filter((p) => !CAPTAINS.some((c) => c.name === p.name))
    .map((p) => ({ ...p, avg: getAvgDiff(p), range: getScoreRange(p) }))
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  const ORDER = snakeOrder(pool.length);
  const [picks, setPicks] = useState([]);          // [{ player, teamIdx }]
  const [clock, setClock] = useState(PICK_SECONDS);
  const [paused, setPaused] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load any picks already recorded (survives a refresh mid-draft)
  useEffect(() => {
    fetch("/api/draftpicks")
      .then((r) => r.json())
      .then((d) => {
        if (!d.picks?.length) return;
        setPicks(d.picks.map((p) => ({
          player: p.player,
          teamIdx: CAPTAINS.findIndex((c) => c.team === p.team),
        })).filter((p) => p.teamIdx !== -1));
      })
      .catch(() => {});
  }, []);

  const drafted = new Set(picks.map((p) => p.player));
  const available = pool.filter((p) => !drafted.has(p.name));
  const onClockIdx = picks.length < ORDER.length ? ORDER[picks.length] : null;
  const onClock = onClockIdx === null ? null : CAPTAINS[onClockIdx];
  const bestAvailable = available[0] || null;
  const done = onClock === null;

  // Pick timer — auto-resets to a full clock on every pick, and unpauses
  useEffect(() => {
    setClock(PICK_SECONDS);
    setPaused(false);
  }, [picks.length]);

  useEffect(() => {
    if (done || paused) return;
    const t = setInterval(() => setClock((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [done, paused]);

  function makePick(playerName) {
    if (done || drafted.has(playerName)) return;
    const teamIdx = onClockIdx;
    const pickNo = picks.length + 1;
    setPicks((prev) => [...prev, { player: playerName, teamIdx }]);
    if (!secret) return;
    setSyncing(true);
    fetch("/api/draftpicks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publish-secret": secret },
      body: JSON.stringify({ pick: pickNo, team: CAPTAINS[teamIdx].team, player: playerName }),
    }).catch(() => {}).finally(() => setSyncing(false));
  }

  const rosterFor = (idx) => picks.filter((p) => p.teamIdx === idx).map((p) => p.player);
  const playerByName = (n) => pool.find((p) => p.name === n);
  const round = Math.floor(picks.length / 2) + 1;

  const panel = { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14 };

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: COLORS.bg, color: COLORS.cream, fontFamily: "DM Sans, sans-serif", padding: 18, display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
      {/* This view returns before App's global <style>, so it needs its own reset */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
      {/* ── On the clock banner ─────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "16px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, borderLeft: `10px solid ${onClock ? onClock.color : COLORS.tan}` }}>
        <div>
          <div style={{ color: COLORS.creamDim, fontSize: 13, textTransform: "uppercase", letterSpacing: 2 }}>
            {done ? "Draft Complete" : `Round ${round} · Pick ${picks.length + 1} of ${ORDER.length}`}
          </div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 40, lineHeight: 1.1, color: onClock ? onClock.color : COLORS.tan }}>
            {done ? "🏆 Rosters are set" : `${onClock.team} is on the clock`}
          </div>
        </div>
        {bestAvailable && !done && (
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>Best Available</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Playfair Display, serif" }}>{bestAvailable.name}</div>
            <div style={{ color: diffColorFor(bestAvailable.avg), fontSize: 15, fontWeight: 700 }}>
              {formatDiff(bestAvailable.avg)} avg · HCP {bestAvailable.handicap}
            </div>
          </div>
        )}
        {!done && (
          <div style={{ textAlign: "center", minWidth: 190 }}>
            <div style={{ color: COLORS.creamDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>
              {paused ? "Paused" : "On the Clock"}
            </div>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: paused ? COLORS.tan : clock <= 15 ? "#e57373" : COLORS.cream }}>
              {formatClock(clock)}
            </div>
            {!clean && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                <button onClick={() => setPaused((v) => !v)} style={clockBtn}>
                  {paused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button onClick={() => { setClock(PICK_SECONDS); setPaused(false); }} style={clockBtn}>
                  ↻ Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
        {/* ── Team John ──────────────────────────────────────────────────── */}
        {[0].map((idx) => <RosterColumn key={idx} idx={idx} roster={rosterFor(idx)} playerByName={playerByName} panel={panel} />)}

        {/* ── Available pool ─────────────────────────────────────────────── */}
        <div style={{ ...panel, padding: 16, overflow: "auto" }}>
          <div style={{ color: COLORS.tan, fontSize: 13, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
            Available · {available.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12, alignContent: "start" }}>
            {available.map((p, i) => (
              <div
                key={p.name}
                onClick={() => !clean && makePick(p.name)}
                style={{
                  background: COLORS.bgCardLight,
                  border: `2px solid ${i === 0 ? COLORS.orange : COLORS.border}`,
                  borderRadius: 12, padding: 13, display: "flex", gap: 12, alignItems: "center",
                  cursor: clean ? "default" : "pointer",
                }}
              >
                {p.photo ? (
                  <img src={p.photo} alt={p.name} style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 58, height: 58, borderRadius: "50%", background: COLORS.bgCard, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, flexShrink: 0 }}>⛳</div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ color: COLORS.creamDim, fontSize: 14 }}>
                    HCP {p.handicap} · Tgt {getTarget(p.handicap)}
                    {p.range && <> · <span style={{ color: diffColorFor(p.range.lowDiff) }}>L {formatRoundDiff(p.range.lowDiff)}</span></>}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 24, color: diffColorFor(p.avg) }}>{formatDiff(p.avg)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Team Brian ─────────────────────────────────────────────────── */}
        {[1].map((idx) => <RosterColumn key={idx} idx={idx} roster={rosterFor(idx)} playerByName={playerByName} panel={panel} />)}
      </div>

      {/* ── Pick ticker ────────────────────────────────────────────────────── */}
      <div style={{ ...panel, padding: "10px 18px", display: "flex", alignItems: "center", gap: 14, overflow: "hidden" }}>
        <span style={{ color: COLORS.tan, fontSize: 12, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, flexShrink: 0 }}>Picks</span>
        <div style={{ display: "flex", gap: 10, overflow: "hidden", flex: 1 }}>
          {picks.length === 0 && <span style={{ color: COLORS.creamDim, fontSize: 14 }}>Waiting on the first pick…</span>}
          {[...picks].reverse().map((p, i) => (
            <span key={i} style={{ background: COLORS.bgCardLight, border: `1px solid ${CAPTAINS[p.teamIdx].color}`, borderRadius: 20, padding: "5px 13px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>
              <strong style={{ color: CAPTAINS[p.teamIdx].color }}>{picks.length - i}.</strong> {p.player}
            </span>
          ))}
        </div>
        {!clean && (
          <button
            onClick={() => setPicks((prev) => prev.slice(0, -1))}
            disabled={picks.length === 0}
            style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.creamDim, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
          >
            ⌫ Undo{syncing ? " ·" : ""}
          </button>
        )}
      </div>
    </div>
  );
}

function RosterColumn({ idx, roster, playerByName, panel }) {
  const cap = CAPTAINS[idx];
  return (
    <div style={{ ...panel, padding: 16, borderTop: `6px solid ${cap.color}`, overflow: "auto" }}>
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, color: cap.color, marginBottom: 2 }}>{cap.team}</div>
      <div style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 14 }}>Captain: {cap.name} · {roster.length + 1} of 8</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: COLORS.bgCardLight, border: `1px dashed ${cap.color}`, borderRadius: 8, padding: "9px 12px", fontSize: 14 }}>
          <strong>{cap.name}</strong>
          <span style={{ color: COLORS.creamDim, fontSize: 11, marginLeft: 6 }}>CAPTAIN</span>
        </div>
        {roster.map((name, i) => {
          const p = playerByName(name);
          return (
            <div key={name} style={{ background: COLORS.bgCardLight, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: COLORS.creamDim, fontSize: 11, marginRight: 6 }}>{i + 1}</span>{name}
              </span>
              {p && <span style={{ fontSize: 13, fontWeight: 700, color: diffColorFor(p.avg) }}>{formatDiff(p.avg)}</span>}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 7 - roster.length) }).map((_, i) => (
          <div key={`e${i}`} style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 8, padding: "9px 12px", color: COLORS.creamDim, fontSize: 13 }}>—</div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [data, setData] = useState({ players: [], articles: [], history: [], historyPhotos: {}, logoUrl: null, recentRounds: [], draft: null, matches: null, tripInfo: [] });
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
          draft: d.draft || null,
          matches: d.matches || null,
          tripInfo: d.tripInfo || [],
        });
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  // Full-screen draft display — no nav, no chat bubble. ?view=bigboard
  const isBigBoard = new URLSearchParams(window.location.search).get("view") === "bigboard";
  if (isBigBoard) {
    if (loading) {
      return <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.tan, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontFamily: "Playfair Display, serif" }}>Loading the board…</div>;
    }
    return <BigBoard players={data.players} />;
  }

  const tabs = [
    { id: "home", label: "🏠 Home" },
    { id: "draftboard", label: "🏆 Draft Board" },
    { id: "players", label: "👤 Players" },
    { id: "teams", label: "🤝 Teams" },
    { id: "itinerary", label: "📅 Itinerary" },
    { id: "points", label: "🏅 Points" },
    { id: "rules", label: "📖 Rules" },
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
            {activeTab === "home" && <HomePage data={data} countdown={countdown} onOpenPoints={() => setActiveTab("points")} />}
            {activeTab === "draftboard" && <DraftBoardPage players={data.players} draft={data.draft} />}
            {activeTab === "teams" && <TeamsPage players={data.players} draft={data.draft} />}
            {activeTab === "rules" && <RulesPage />}
            {activeTab === "players" && <PlayersPage players={data.players} />}
            {activeTab === "itinerary" && <ItineraryPage />}
            {activeTab === "points" && <PointsPage matches={data.matches} />}
            {activeTab === "tripdetails" && <TripDetailsPage tripInfo={data.tripInfo} />}
            {activeTab === "news" && <NewsPage articles={data.articles} />}
            {activeTab === "history" && <HistoryPage history={data.history} historyPhotos={data.historyPhotos} />}
          </>
        )}
      </main>

      <BogeyChat />
    </div>
  );
}
