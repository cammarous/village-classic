import { useState, useEffect } from "react";

const TRIP_DATE = new Date("2026-09-12T08:00:00");
const PAR = 72;
const BUFFER = 3;

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
  return rows.slice(1).filter(r => r[0]?.trim()).map((r, i) => {
    const name = r[0].trim();
    const handicap = parseFloat(r[1]) || 0;
    const rounds = r.slice(2).map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
    return { id: i + 1, name, handicap, rounds };
  });
}

function parseArticles(csv) {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  return rows.slice(1).filter(r => r[0]?.trim()).map((r, i) => ({
    id: i + 1, title: r[0]?.trim() || "", date: r[1]?.trim() || "",
    author: r[2]?.trim() || "Commissioner", body: r[3]?.trim() || ""
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
function initials(name) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
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

function Avatar({ name, size = 40 }) {
  const ini = initials(name);
  const palette = ["#2d6a4f", "#1d4e89", "#6a3d2d", "#4a2d6a", "#2d4a6a", "#6a5c2d"];
  const idx = ((ini.charCodeAt(0) || 0) + (ini.charCodeAt(1) || 0)) % palette.length;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: palette[idx], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.35, fontFamily: "'Playfair Display',serif", flexShrink: 0, border: "2px solid rgba(255,255,255,0.12)" }}>
      {ini}
    </div>
  );
}

function ScoreBadge({ val, size = "md" }) {
  if (val === null) return <span style={{ color: "#8a9bb0" }}>—</span>;
  const color = val < 0 ? "#3ecf8e" : val === 0 ? "#f0c040" : "#e05a5a";
  const label = val === 0 ? "E" : val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  return <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: size === "lg" ? "4px 14px" : "2px 9px", fontWeight: 700, fontSize: size === "lg" ? 20 : 13, fontFamily: "monospace", letterSpacing: 1 }}>{label}</span>;
}

function Medal({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
  return <span style={{ color: "#8a9bb0", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>#{rank}</span>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #3ecf8e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#8a9bb0", fontSize: 14 }}>Loading live data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <div style={{ background: "rgba(224,90,90,0.08)", border: "1px solid rgba(224,90,90,0.3)", borderRadius: 14, padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
      <div style={{ color: "#e05a5a", fontWeight: 600, marginBottom: 8 }}>Couldn't load sheet data</div>
      <div style={{ color: "#8a9bb0", fontSize: 13, marginBottom: 20 }}>{message}</div>
      <button style={styles.btnPrimary} onClick={onRetry}>Try Again</button>
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState("home");
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
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { const id = setInterval(loadData, 5 * 60 * 1000); return () => clearInterval(id); }, []);

  const ranked = getRanked(players);
  const s = styles;

  const navItems = [
    { key: "home", label: "Home", icon: "⛳" },
    { key: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { key: "players", label: "Players", icon: "👤" },
    { key: "articles", label: "News", icon: "📰" },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button:hover{opacity:0.88;}
        .pc:hover{border-color:rgba(74,158,255,0.3)!important;background:rgba(255,255,255,0.07)!important;}
        .lr:hover{background:rgba(255,255,255,0.05)!important;}
        .ac:hover{border-color:rgba(255,255,255,0.18)!important;}
        textarea{font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:#0a1118;} ::-webkit-scrollbar-thumb{background:#1e2d40;border-radius:3px;}
      `}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>⛳</span>
            <div>
              <div style={s.logoName}>The Village Classic</div>
              <div style={s.logoSub}>Golf Trip · September 2026</div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {navItems.map(n => (
              <button key={n.key} style={{ ...s.navBtn, ...(page === n.key ? s.navActive : {}) }}
                onClick={() => { setPage(n.key); setSelectedPlayer(null); setSelectedArticle(null); }}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {lastUpdated && <div style={{ color: "#8a9bb0", fontSize: 11 }}>Updated {lastUpdated.toLocaleTimeString()}</div>}
            <button style={{ ...s.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={loadData}>↻ Refresh</button>
          </div>
        </div>
      </div>

      <div style={s.main}>
        {loading && <Spinner />}
        {!loading && error && <ErrorCard message={error} onRetry={loadData} />}
        {!loading && !error && (
          <>
            {/* HOME */}
            {page === "home" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div style={s.heroCard}>
                  <div style={s.heroLabel}>⛳ The Trip Awaits</div>
                  <div style={s.heroTitle}>September 12, 2026</div>
                  <div style={s.heroSub}>Every round you play now counts. Don't show up cold.</div>
                  <div style={s.countdownRow}>
                    {[["days", "Days"], ["hours", "Hrs"], ["minutes", "Min"], ["seconds", "Sec"]].map(([k, l]) => (
                      <div key={k} style={s.countdownBox}>
                        <div style={s.countdownNum}>{String(countdown[k] ?? 0).padStart(2, "0")}</div>
                        <div style={s.countdownLabel}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: "#8a9bb0", fontSize: 13 }}>
                    <span>{players.length} players</span>
                    <span style={{ margin: "0 8px" }}>·</span>
                    <span>{players.reduce((a, p) => a + p.rounds.length, 0)} rounds logged</span>
                    <span style={{ margin: "0 8px" }}>·</span>
                    <span>{articles.length} dispatches</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>🏆 Top 5</span>
                      <button style={s.homeSectionLink} onClick={() => setPage("leaderboard")}>Full standings →</button>
                    </div>
                    {ranked.length === 0
                      ? <div style={{ color: "#8a9bb0", fontSize: 13, fontStyle: "italic" }}>No rounds logged yet.</div>
                      : ranked.slice(0, 5).map((p, i) => (
                        <div key={p.id} className="lr" style={s.miniRow} onClick={() => { setSelectedPlayer(p); setPage("players"); }}>
                          <div style={{ width: 26, textAlign: "center", flexShrink: 0 }}><Medal rank={i + 1} /></div>
                          <Avatar name={p.name} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#8a9bb0" }}>HCP {p.handicap} · {p.rounds.length} rds</div>
                          </div>
                          <ScoreBadge val={avgVsTarget(p.rounds, p.handicap)} />
                        </div>
                      ))
                    }
                  </div>

                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>🕐 Recent Rounds</span>
                      <button style={s.homeSectionLink} onClick={() => setPage("players")}>All players →</button>
                    </div>
                    {getRecentRounds(players, 5).length === 0
                      ? <div style={{ color: "#8a9bb0", fontSize: 13, fontStyle: "italic" }}>No rounds logged yet.</div>
                      : getRecentRounds(players, 5).map(({ player: p, score, roundNum }, i) => {
                        const tgt = target(p.handicap); const diff = score - tgt;
                        const color = diff < 0 ? "#3ecf8e" : diff === 0 ? "#f0c040" : "#e05a5a";
                        return (
                          <div key={i} style={{ ...s.miniRow, cursor: "default" }}>
                            <Avatar name={p.name} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: "#8a9bb0" }}>Round {roundNum} · target {tgt}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8edf3", fontFamily: "monospace" }}>{score}</div>
                              <div style={{ fontSize: 11, color, fontFamily: "monospace" }}>{diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}</div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {articles.length > 0 && (
                  <div style={s.homeSection}>
                    <div style={s.homeSectionHeader}>
                      <span style={s.homeSectionTitle}>📰 Latest Dispatch</span>
                      <button style={s.homeSectionLink} onClick={() => setPage("articles")}>All articles →</button>
                    </div>
                    <div className="ac" style={{ ...s.articleCard, cursor: "pointer", marginBottom: 12 }}
                      onClick={() => { setSelectedArticle(articles[0]); setPage("articles"); }}>
                      <div style={s.articleMeta}>{formatDate(articles[0].date)} · By {articles[0].author}</div>
                      <div style={{ ...s.articleTitle, fontSize: 20 }}>{articles[0].title}</div>
                      <div style={{ color: "#8a9bb0", fontSize: 14, marginTop: 10, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{articles[0].body}</div>
                      <div style={{ color: "#4a9eff", fontSize: 13, marginTop: 12, fontWeight: 600 }}>Read more →</div>
                    </div>
                    {articles.length > 1 && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {articles.slice(1, 3).map(a => (
                          <div key={a.id} className="ac" style={{ ...s.articleCard, flex: 1, minWidth: 180, cursor: "pointer" }}
                            onClick={() => { setSelectedArticle(a); setPage("articles"); }}>
                            <div style={s.articleMeta}>{formatDate(a.date)}</div>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: "#e8edf3", marginTop: 6, lineHeight: 1.3 }}>{a.title}</div>
                            <div style={{ color: "#4a9eff", fontSize: 12, marginTop: 8, fontWeight: 600 }}>Read →</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LEADERBOARD */}
            {page === "leaderboard" && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Standings</div>
                    <div style={s.pageSub}>Ranked by avg score vs personal target (72 + HCP + 3). Lower is better.</div>
                  </div>
                </div>
                {ranked.length === 0
                  ? <div style={{ color: "#8a9bb0", fontStyle: "italic", padding: 20 }}>No rounds logged yet — add scores to your Google Sheet.</div>
                  : <div style={s.card}>
                    {ranked.map((p, i) => {
                      const rel = avgVsTarget(p.rounds, p.handicap); const avg = avgScore(p.rounds);
                      return (
                        <div key={p.id} className="lr"
                          style={{ ...s.leaderRow, ...(i === 0 ? { background: "rgba(240,192,64,0.05)" } : {}), ...(i !== ranked.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.06)" } : {}) }}
                          onClick={() => { setSelectedPlayer(p); setPage("players"); }}>
                          <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}><Medal rank={i + 1} /></div>
                          <Avatar name={p.name} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={s.playerName}>{p.name}</div>
                            <div style={s.playerMeta}>HCP {p.handicap} · Target {target(p.handicap)} · {p.rounds.length} rounds · Avg {avg ? avg.toFixed(1) : "—"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ScoreBadge val={rel} />
                            <span style={{ color: "#8a9bb0", fontSize: 18 }}>›</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
                <div style={s.legend}><span style={{ color: "#3ecf8e" }}>■</span> Under target &nbsp;<span style={{ color: "#f0c040" }}>■</span> On target &nbsp;<span style={{ color: "#e05a5a" }}>■</span> Over target</div>
              </div>
            )}

            {/* PLAYERS LIST */}
            {page === "players" && !selectedPlayer && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>Players</div>
                    <div style={s.pageSub}>{players.length} members · Scores updated via Google Sheets</div>
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
                          <div style={{ textAlign: "right" }}><div style={s.statLabelSm}>Rounds</div><div style={{ color: "#e8edf3", fontWeight: 700 }}>{p.rounds.length}</div></div>
                          {rank > 0 && <div style={{ textAlign: "right" }}><div style={s.statLabelSm}>Rank</div><div style={{ color: "#e8edf3", fontWeight: 700 }}>#{rank}</div></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PLAYER PROFILE */}
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
                      <Avatar name={p.name} size={70} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#e8edf3", fontFamily: "'Playfair Display',serif" }}>{p.name}</div>
                        <div style={{ color: "#8a9bb0", marginTop: 4 }}>{rank > 0 ? `Rank #${rank} · ` : ""}Target: {tgt} · {p.rounds.length} round{p.rounds.length !== 1 ? "s" : ""} logged</div>
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
                      <div style={{ color: "#c5cdd8", fontWeight: 600, fontFamily: "'Playfair Display',serif", fontSize: 17, marginBottom: 14 }}>Round History</div>
                      {p.rounds.length === 0
                        ? <div style={{ color: "#8a9bb0", fontStyle: "italic" }}>No rounds logged yet.</div>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {p.rounds.map((score, i) => {
                            const diff = score - tgt; const color = diff < 0 ? "#3ecf8e" : diff === 0 ? "#f0c040" : "#e05a5a";
                            return (
                              <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}44`, borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 80 }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: "#e8edf3", fontFamily: "monospace" }}>{score}</div>
                                <div style={{ fontSize: 12, color, marginTop: 3, fontFamily: "monospace" }}>{diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff} vs tgt</div>
                                <div style={{ fontSize: 10, color: "#8a9bb0", marginTop: 2 }}>Round {i + 1}</div>
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

            {/* ARTICLES */}
            {page === "articles" && !selectedArticle && (
              <div>
                <div style={s.pageHeader}>
                  <div>
                    <div style={s.pageTitle}>League News</div>
                    <div style={s.pageSub}>Commissioner's dispatches · Add articles in Google Sheets</div>
                  </div>
                </div>
                {articles.length === 0
                  ? <div style={{ color: "#8a9bb0", fontStyle: "italic", padding: 20 }}>No articles yet.</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {articles.map(a => (
                      <div key={a.id} className="ac" style={{ ...s.articleCard, cursor: "pointer" }} onClick={() => setSelectedArticle(a)}>
                        <div style={s.articleMeta}>{formatDate(a.date)} · By {a.author}</div>
                        <div style={s.articleTitle}>{a.title}</div>
                        <div style={{ color: "#8a9bb0", fontSize: 14, marginTop: 8, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body}</div>
                        <div style={{ color: "#4a9eff", fontSize: 13, marginTop: 10, fontWeight: 600 }}>Read more →</div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}

            {/* ARTICLE DETAIL */}
            {page === "articles" && selectedArticle && (
              <div>
                <button style={s.backBtn} onClick={() => setSelectedArticle(null)}>← Back to News</button>
                <div style={s.profileCard}>
                  <div style={s.articleMeta}>{formatDate(selectedArticle.date)} · By {selectedArticle.author}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#e8edf3", fontFamily: "'Playfair Display',serif", lineHeight: 1.25, marginTop: 10, marginBottom: 24 }}>{selectedArticle.title}</div>
                  {selectedArticle.body.split("\n").map((para, i) => para.trim() && (
                    <p key={i} style={{ color: "#c5cdd8", lineHeight: 1.85, fontSize: 15, marginBottom: 16 }}>{para}</p>
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

const styles = {
  root: { minHeight: "100vh", background: "linear-gradient(150deg,#09111e 0%,#0d1a14 50%,#0e1520 100%)", fontFamily: "'DM Sans',sans-serif", color: "#e8edf3" },
  header: { borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(9,17,30,0.9)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  logoName: { fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: "#e8edf3" },
  logoSub: { fontSize: 10, color: "#8a9bb0", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 },
  navBtn: { background: "transparent", border: "1px solid transparent", borderRadius: 8, color: "#8a9bb0", padding: "7px 13px", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" },
  navActive: { background: "rgba(74,158,255,0.12)", border: "1px solid rgba(74,158,255,0.3)", color: "#4a9eff" },
  main: { maxWidth: 960, margin: "0 auto", padding: "32px 20px 70px" },
  heroCard: { background: "linear-gradient(135deg,rgba(45,106,79,0.35) 0%,rgba(29,78,137,0.35) 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 32px", textAlign: "center" },
  heroLabel: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#3ecf8e", marginBottom: 10, fontWeight: 600 },
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 700, color: "#e8edf3", marginBottom: 8 },
  heroSub: { color: "#8a9bb0", fontSize: 14, marginBottom: 28, fontStyle: "italic" },
  countdownRow: { display: "flex", gap: 16, justifyContent: "center", marginBottom: 22, flexWrap: "wrap" },
  countdownBox: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 22px", minWidth: 72 },
  countdownNum: { fontFamily: "monospace", fontSize: 32, fontWeight: 700, color: "#e8edf3", lineHeight: 1 },
  countdownLabel: { fontSize: 10, color: "#8a9bb0", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 6 },
  homeSection: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 },
  homeSectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  homeSectionTitle: { fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#e8edf3" },
  homeSectionLink: { background: "transparent", border: "none", color: "#4a9eff", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" },
  miniRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" },
  pageTitle: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#e8edf3" },
  pageSub: { color: "#8a9bb0", fontSize: 13, marginTop: 4 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" },
  leaderRow: { display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", transition: "background 0.15s" },
  playerName: { fontWeight: 600, color: "#e8edf3", fontSize: 15 },
  playerMeta: { color: "#8a9bb0", fontSize: 12, marginTop: 2 },
  legend: { color: "#8a9bb0", fontSize: 12, marginTop: 14, textAlign: "center" },
  playerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 },
  playerCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, cursor: "pointer", transition: "all 0.15s" },
  statLabelSm: { color: "#8a9bb0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  profileCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12 },
  statBox: { background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px" },
  statLabel: { color: "#8a9bb0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: 700, color: "#e8edf3", fontFamily: "'Playfair Display',serif" },
  articleCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px", transition: "border-color 0.15s" },
  articleMeta: { color: "#8a9bb0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  articleTitle: { fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#e8edf3", marginTop: 8, lineHeight: 1.3 },
  backBtn: { background: "transparent", border: "none", color: "#4a9eff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 20, padding: 0, fontFamily: "'DM Sans',sans-serif" },
  btnPrimary: { background: "linear-gradient(135deg,#2d6a4f,#1d4e89)", border: "none", borderRadius: 8, color: "#fff", padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#8a9bb0", padding: "9px 18px", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
};
