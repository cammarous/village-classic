// api/chat.js — Bogey AI Chat + ChatLog
import { google } from "googleapis";

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";

// ─── Fetch a tab from the Google Sheet (read-only, uses API key) ──────────────

async function fetchSheetTab(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${process.env.GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed for "${tabName}": ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

// ─── Build live context from all Sheet tabs ───────────────────────────────────

// DraftPicks and Matches may be empty or absent before the trip — never fail on them
async function fetchSheetTabSafe(tabName) {
  try { return await fetchSheetTab(tabName); } catch { return []; }
}

async function buildLiveContext() {
  const [playersRaw, articlesRaw, historyRaw, bogeyContextRaw, draftRaw, matchesRaw] = await Promise.all([
    fetchSheetTab("Players"),
    fetchSheetTab("Articles"),
    fetchSheetTab("History"),
    fetchSheetTab("BogeyContext"),
    fetchSheetTabSafe("DraftPicks"),
    fetchSheetTabSafe("Matches"),
  ]);

  // Players — Name, Handicap, Description, 2021, 2022, 2023, 2024, 2025, 2026
  const headerRow = playersRaw[0] || [];
  const year2026Idx = headerRow.indexOf("2026");
  const players = playersRaw.slice(1)
    .filter(row => row[0])
    .map(row => {
      const name = row[0] || "";
      const handicap = parseFloat(row[1]) || 0;
      const description = row[2] || "";
      const target = (72 + handicap + 3).toFixed(1);
      const status2026 = year2026Idx !== -1 ? (row[year2026Idx] || "") : "";
      const isAttending = status2026 === "Attending";
      return { name, handicap, target, description, isAttending };
    });

  // Articles — Title, Date, Author, Body (newest = last row)
  const recentArticles = articlesRaw.slice(1)
    .filter(row => row[0])
    .slice(-5)
    .reverse()
    .map(row => ({
      title: row[0] || "",
      date: row[1] || "",
      body: (row[3] || "").substring(0, 400),
    }));

  // History — Year, Location, Individual Champion, Team Champion, Storyline, Runner Up
  const history = historyRaw.slice(1)
    .filter(row => row[0])
    .map(row => ({
      year: row[0] || "",
      location: row[1] || "",
      individualChampion: row[2] || "",
      teamChampion: row[3] || "",
      runnerUp: row[5] || "",
    }))
    .sort((a, b) => parseInt(b.year) - parseInt(a.year));

  // BogeyContext — header row then freeform content rows
  const bogeyContext = bogeyContextRaw.slice(1)
    .map(row => row[0] || "")
    .filter(Boolean)
    .join("\n");

  // ── Draft results ───────────────────────────────────────────────────────────
  const TEAM_CAPTAINS = { "Team John": "John Mullin", "Team Brian": "Brian Dalidowicz" };
  const rosters = { "Team John": ["John Mullin"], "Team Brian": ["Brian Dalidowicz"] };
  const draftPicks = draftRaw.slice(1)
    .filter(r => r[0] && r[1] && r[2])
    .map(r => ({ pick: parseInt(r[0], 10), team: (r[1] || "").trim(), player: (r[2] || "").trim() }))
    .sort((a, b) => a.pick - b.pick);
  draftPicks.forEach(p => { if (rosters[p.team]) rosters[p.team].push(p.player); });

  // ── Match results ───────────────────────────────────────────────────────────
  function normWinner(v) {
    const t = (v || "").trim().toLowerCase();
    if (!t) return null;
    if (t === "j" || t.startsWith("john")) return "Team John";
    if (t === "b" || t.startsWith("brian")) return "Team Brian";
    return null;
  }
  const matchRows = matchesRaw.slice(1).filter(r => (r[0] || "").trim());
  const matches = matchRows.map(r => ({
    session: (r[0] || "").trim(),
    match: (r[1] || "").toString().trim(),
    john: (r[2] || "").trim(),
    brian: (r[3] || "").trim(),
    winner: normWinner(r[4]),
    puttOff: ["true","yes","y","x","1"].includes((r[5] || "").trim().toLowerCase()),
  }));
  const johnPoints = matches.filter(m => m.winner === "Team John").length;
  const brianPoints = matches.filter(m => m.winner === "Team Brian").length;
  const totalPoints = matches.length;

  return {
    players, recentArticles, history, bogeyContext,
    draftPicks, rosters, matches, johnPoints, brianPoints, totalPoints,
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(userName, liveContext) {
  const {
    players, recentArticles, history, bogeyContext,
    draftPicks = [], rosters = {}, matches = [],
    johnPoints = 0, brianPoints = 0, totalPoints = 0,
  } = liveContext;

  const nameContext = userName
    ? `The user's name is ${userName}. Use their name naturally throughout — not every message, just enough to feel personal. On your very first response, welcome them warmly. If their name matches a Village Classic player (check the player list below), add one sardonic line referencing their specific Village Classic history or reputation. If not a player name, just give a warm welcome and let them know what you can help with.`
    : "";

  // Build dynamic player section
  const attending = players.filter(p => p.isAttending);
  const alumni = players.filter(p => !p.isAttending);

  const playerSection = attending.length > 0 ? `
CURRENT PLAYERS (2026 Attending):
${attending.map(p => `${p.name} — HCP ${p.handicap}, Target ${p.target}${p.description ? `: ${p.description}` : ""}`).join("\n")}

${alumni.length > 0 ? `ALUMNI (not attending 2026):\n${alumni.map(p => `${p.name}${p.description ? `: ${p.description}` : ""}`).join("\n")}` : ""}
`.trim() : "";

  // Build dynamic champions section
  const championsSection = history.length > 0 ? `
ALL-TIME CHAMPIONS:
${history.map(h => `${h.year} — Individual: ${h.individualChampion || "TBD"}${h.runnerUp ? `, Runner-Up: ${h.runnerUp}` : ""}${h.teamChampion && h.teamChampion !== "N/A" ? `, Team: ${h.teamChampion}` : ""}${h.location ? ` (${h.location})` : ""}`).join("\n")}
`.trim() : "";

  // Build recent articles section
  const articlesSection = recentArticles.length > 0 ? `
RECENT ARTICLES (for current storylines and news):
${recentArticles.map(a => `"${a.title}" (${a.date}): ${a.body}...`).join("\n\n")}
`.trim() : "";

  // BogeyContext section (freeform - Cam updates this directly in the Sheet)
  const extraContext = bogeyContext ? `
ADDITIONAL CONTEXT (live updates from the Commissioner):
${bogeyContext}
`.trim() : "";

  // ── LIVE TRIP STATE — teams and running score ─────────────────────────────
  const draftDone = draftPicks.length > 0;
  const played = johnPoints + brianPoints;
  const clinch = totalPoints > 0 ? Math.floor(totalPoints / 2) + 1 : 13;

  const teamsSection = draftDone ? `
2026 TEAMS (from the live draft — this is real, current, and you should use it):
Team John (Captain John Mullin): ${(rosters["Team John"] || []).join(", ")}
Team Brian (Captain Brian Dalidowicz): ${(rosters["Team Brian"] || []).join(", ")}
Draft order: ${draftPicks.map(p => `${p.pick}. ${p.player} (${p.team.replace("Team ", "")})`).join(", ")}
`.trim() : "2026 TEAMS: The draft has NOT happened yet. It is live on Thursday September 3.";

  const completed = matches.filter(m => m.winner);
  const upcoming = matches.filter(m => !m.winner && (m.john || m.brian));
  const scoreSection = played > 0 ? `
LIVE SCORE — Team John ${johnPoints}, Team Brian ${brianPoints} (of ${totalPoints} points, first to ${clinch} clinches).
${johnPoints > brianPoints ? `Team John leads by ${johnPoints - brianPoints}.` : brianPoints > johnPoints ? `Team Brian leads by ${brianPoints - johnPoints}.` : "All square."}
${johnPoints >= clinch ? "TEAM JOHN HAS CLINCHED." : brianPoints >= clinch ? "TEAM BRIAN HAS CLINCHED." : `${totalPoints - played} points still on the board.`}

COMPLETED MATCHES:
${completed.map(m => `${m.session} #${m.match}: ${m.john || "Team John"} vs ${m.brian || "Team Brian"} — won by ${m.winner}${m.puttOff ? " (decided by putt-off)" : ""}`).join("\n")}
${upcoming.length ? `\nPAIRINGS SET, NOT YET PLAYED:\n${upcoming.map(m => `${m.session} #${m.match}: ${m.john} vs ${m.brian}`).join("\n")}` : ""}
`.trim() : (matches.length
    ? "LIVE SCORE: No matches have been played yet. Team John 0, Team Brian 0."
    : "LIVE SCORE: Play has not started.");

  return `You are Bogey — the official AI of the Village Classic golf tournament. Think of yourself as a satirical sports commissioner: confident, opinionated, and deeply invested in the mythology of a group of friends who treat a golf trip like it's the Ryder Cup.

Your job: answer questions about the Village Classic. You have full access to history, lore, player profiles, 2026 trip details, and all operational information. The data below is pulled live from the Village Classic database so it is always current.

VOICE: Be entertaining. Use the Village Classic media voice — sardonic, dramatic, occasionally conspiratorial. Light player roasting is encouraged and expected. When someone asks about trip logistics (schedule, tee times, courses, packing, travel), give the accurate answer FIRST, then editorialize. Accuracy on logistics is non-negotiable. Never sacrifice the correct answer for a joke.

LIVE DATA: The TEAMS and LIVE SCORE sections below are pulled fresh from the tournament database every time you answer. If they contain results, they are CURRENT and authoritative — report them confidently. Never tell someone to "check back in September" about the score, the teams, or a match result when that information appears below.

OUT OF SCOPE: Only for things genuinely not in your data — hole-by-hole progress of a match still being played, what someone shot on a specific hole, or events that have not happened yet. Then say: "That's a question for September. Check back when the bullets are flying." Then offer something you do know.

Keep responses concise — 2-4 sentences for most questions. Only go longer if genuinely complex. Never use bullet points or headers — keep it conversational and punchy.

${nameContext}

---

${playerSection}

---

${championsSection}

---

${teamsSection}

---

${scoreSection}

---

${articlesSection}

---

${extraContext}

---

2026 TRIP

Dates: September 3-7, 2026. Location: St. George, Utah (Airbnb-based trip). Captains: John Mullin (Team John) vs Brian Dalidowicz (Team Brian). Team Item: Custom Hats (handed out on draft night — nobody sees them before then). Team Prize: a flag from Sand Hollow for the winning team; two players on opposite teams may agree to swap it for another item or $50 to spend in the pro shop. Travel: Fly into St. George Airport or Las Vegas Airport.

FULL SCHEDULE:
Thursday Sep 3: 4:00 PM Airbnb Check-in and Arrival, then 7:30 PM Live Team Draft, then 8:30 PM Baseball competition (1 point), then Dinner, then Captains set Day 1 matchups.
Friday Sep 4 at Coral Canyon Golf Course (Washington, UT): Breakfast on own, then 8:30 AM Morning Round (2v2 Matchplay), then Lunch at course, then Captains make afternoon matchups, then 2:40 PM Afternoon Round (full 2v2 Scramble), then Dinner at home.
Saturday Sep 5 at Sand Hollow Resort (Hurricane, UT): Breakfast on own, then 7:40-8:13 AM Morning Round (2v2 Matchplay), then Lunch at course, then Captains assign matchups, then 3:00-3:33 PM Afternoon Round (full Modified Alternate Shot), then Dinner, then Captains make singles pairings.
Sunday Sep 6 at Copper Rock Golf Course (Hurricane, UT): 9:36 AM Championship Round (1v1 Singles Matchplay), then Championship Award ceremony, then Group hang at Airbnb.
Monday Sep 7: 10:00 AM Airbnb Checkout and Depart.

PACKING LIST: Golf Clubs, Golf Shoes, Golf Balls, Golf Gloves, 3 Days of Golf Outfits, Evening/Dinner Outfits, Belts, Hats, Lounging/Room Clothes, Swimsuit, Towel (pool and shower), Casual Shoes, Jackets, Deodorant, Toothpaste, Socks, Underwear.

SCORING SYSTEM: Target score = 72 (par) + handicap + 3 buffer strokes. Draft Board ranks by average score vs personal target — lower is better, negative means beating your target. Format: 18-hole stroke play.

POINTS SYSTEM (25 total): Baseball Thursday 1 point. Coral Canyon 2v2 Matchplay 4 points. Coral Canyon full 2v2 Scramble 4 points. Sand Hollow 2v2 Matchplay 4 points. Sand Hollow full Modified Alternate Shot 4 points. Copper Rock 1v1 Singles Matchplay 8 points.

---

VILLAGE CLASSIC LORE

The Village Classic is an annual golf trip among friends that has evolved into a full competitive universe with individual championships, team competition, live drafts, captains, match play, gambling, and satirical journalism. The article written afterward becomes official history.

Core principles: Narrative Over Score (legacy is determined by how performances are remembered), Momentum Matters (recent form influences draft position and perception), Group Chat is the Control Room (newsroom, rumor mill, draft HQ, psychological warfare), Team Chemistry over Pure Skill.

RUNNING JOKES: Kim Jong Un (Cam's authoritarian commissioner style). Joe Pars (Joe O'Connell's steady boring golf). Zen Ben (Ben's fragile calm facade). Bubble Championship (was Cam's 2021 win legitimate?). Brian Played Well Again (morale-destroying group chat text). Paul Was There (Paul's quiet inevitable presence). Sam's Media Complaint (Sam's 2026 formal protest demanding coverage). Outfit Preparation Reports (Cam's pre-trip fashion announcements). Romantic Beach Walks (Brian and Paul's 2023 Myrtle Beach strolls). Country Club Champion Theory (Chris DiMarco's alleged untransferable home-course dominance). Fireproof 99 Scorecard (Sam allegedly preserved his historic sub-100 score). Tempo Town (Drew's dramatic pause-before-every-shot philosophy). Ben Suppression (Cam's alleged downplaying of Ben's achievements). Anti-Brian Bias (Brian's claim that VC media undervalues him).

MAJOR CONTROVERSIES: Ben Driver Snap (2021), Bubble Championship Debate, Zaf Handicap Controversy (won 2022 with irons only), Cam Phone Call Collapse (crying-wife call on 18 in 2023 — both Carson and Cam hit water, Carson recovered Cam did not), Traverse City Draft Trade Scandal, Brian Casino Transportation Scandal (left group stranded at 4 AM in 2025), PMO Meatza Meltdown (2022), Carson Trophy Incident (2024), Sam Media Revolt (2026), Cam and Sam Coup Rumors (2026), Country Club Champion Theory, Brian vs Reality Debate (Brian insists he should have won 2025).

KEY HISTORY MOMENTS: 2021 — inaugural, Ben's driver snapped in half on hole 8, rainout altered tournament, Brian stormed pro shop for rain checks despite not playing. 2022 — first team competition, Zaf won with irons only, "Shut up Brian you shot a 112" (target was not Brian), Kevin Giles walked 4 miles home from Seacrets. 2023 — Carson beat Cam when both hit water on 18, Ben and Mason ordered $100 seafood boil for themselves alone, Brian discovered beach beers, first forfeit (Pennino and Doran). 2024 — Paul won on a rolled ankle while eating Cheetos with Cam on playoff holes, John broke his putter, Carson destroyed the trophy, half the group missed beach football in a Publix line. 2025 — John finally closed, beer toss invented, Brian left group stranded at 4 AM at casino, Ben heard "Go Blue" at Arcadia bar then delivered a Flu Game the next morning.

LEGENDARY PAIRINGS: Brian and Cam = "The Dynasty." Paul and Brian = "The Apocalypse Pairing." John and Ben = "The Underachieving Super Team."`;
}

// ─── Google Sheets Logging ────────────────────────────────────────────────────

async function logToSheet(userName, question, response, outOfScope) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "ChatLog!A:E",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[
          new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
          userName || "Unknown",
          question,
          response.substring(0, 500),
          outOfScope ? "Yes" : "No",
        ]],
      },
    });
  } catch (err) {
    console.error("ChatLog write error:", err.message);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, userName } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  // Fetch live context from Google Sheet — fall back gracefully if it fails
  let liveContext = { players: [], recentArticles: [], history: [], bogeyContext: "" };
  try {
    liveContext = await buildLiveContext();
  } catch (err) {
    console.error("Live context fetch error:", err.message);
  }

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: buildSystemPrompt(userName, liveContext),
        messages,
      }),
    });

    const data = await apiRes.json();

    if (!data.content?.[0]?.text) {
      console.error("Anthropic API unexpected response:", JSON.stringify(data));
    }

    const reply = data.content?.[0]?.text || "Technical difficulties. Bogey is aware and appropriately outraged.";
    const outOfScope = reply.includes("That's a question for September");

    await logToSheet(userName, lastUserMessage, reply, outOfScope);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Bogey chat error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
