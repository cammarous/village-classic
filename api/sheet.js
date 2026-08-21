// api/sheet.js — Vercel Serverless Function
// Fetches Google Sheet data + Google Drive photos for the Village Classic site

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
const DRIVE_FOLDER_ID = "1DJKTNgO3KWBPjrytSB-ecRmMmCYJHFgK";
const API_KEY = process.env.GOOGLE_API_KEY;

// Normalize a player name for matching across tabs.
// Fixes casing typos in the Courses tab (e.g. "cameron Marous" → matches "Cameron Marous")
// and collapses stray/double spaces. Display always uses the Players tab spelling.
function nameKey(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function fetchSheetTab(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed for tab "${tabName}": ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

// List the spreadsheet's actual tab titles.
// Tab lookups are exact and case-sensitive in the Sheets API, so a tab named
// "matches" or "Matches " (trailing space) silently returns nothing. Resolving
// real titles first makes tab names forgiving the same way player names are.
async function listTabTitles() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.sheets || []).map((s) => s.properties && s.properties.title).filter(Boolean);
}

function resolveTab(titles, wanted) {
  const w = wanted.trim().toLowerCase();
  return titles.find((t) => t.trim().toLowerCase() === w) || null;
}

// Fetch by fuzzy tab name; returns [] if the tab genuinely isn't there.
async function fetchSheetTabSafe(titles, wanted) {
  const actual = resolveTab(titles, wanted);
  if (!actual) {
    console.warn(`sheet.js: no tab matching "${wanted}". Tabs present: ${titles.join(", ")}`);
    return [];
  }
  try {
    return await fetchSheetTab(actual);
  } catch (e) {
    console.warn(`sheet.js: failed reading tab "${actual}": ${e.message}`);
    return [];
  }
}

async function fetchDriveFiles() {
  let files = [];
  let pageToken = null;
  do {
    const q = encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and trashed=false`);
    let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name)&pageSize=100&key=${API_KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive fetch failed: ${res.status} — ${body}`);
    }
    const data = await res.json();
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return files;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // Resolve real tab titles once, so every lookup below is case/space tolerant
    const tabTitles = await listTabTitles();

    const [playersRaw, articlesRaw, scoresRaw, historyRaw, draftRaw, matchesRaw, tripInfoRaw, driveFiles] = await Promise.all([
      fetchSheetTabSafe(tabTitles, "Players"),
      fetchSheetTabSafe(tabTitles, "Articles"),
      fetchSheetTabSafe(tabTitles, "Courses"),
      fetchSheetTabSafe(tabTitles, "History"),
      fetchSheetTabSafe(tabTitles, "DraftPicks"),
      fetchSheetTabSafe(tabTitles, "Matches"),
      fetchSheetTabSafe(tabTitles, "TripInfo"),
      fetchDriveFiles(),
    ]);

    // ── Build photo maps from Drive files ──────────────────────────────────────
    const playerPhotos = {};
    const historyPhotos = {};
    let logoUrl = null;

    for (const file of driveFiles) {
      const name = file.name;
      const thumbUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;

      if (name.includes("Village_Classic_2026_Logo")) {
        logoUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
        continue;
      }
      const yearMatch = name.match(/^(\d{4})[\s_]/);
      if (yearMatch) {
        const year = yearMatch[1];
        if (!historyPhotos[year]) historyPhotos[year] = [];
        historyPhotos[year].push(thumbUrl);
        continue;
      }
      // Strip extension — key is the full filename without extension (e.g. "Ian Zaferakis" or "Cameron")
      const photoKey = name.replace(/\.[^/.]+$/, "");
      playerPhotos[photoKey] = `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`;
    }

    if (!logoUrl) {
      logoUrl = `https://drive.google.com/thumbnail?id=1TeG2PH0241YAFjNfGuOotE9jD0-eXW5n&sz=w400`;
    }

    // ── Parse Players tab ──────────────────────────────────────────────────────
    // Header row: Name, Handicap, Description, 2021, 2022, 2023, 2024, 2025, 2026
    // Year columns start at index 3
    const YEAR_COLS = ["2021", "2022", "2023", "2024", "2025", "2026"];
    const headerRow = playersRaw[0] || [];

    // Find where each year column is in the header (flexible — works even if columns shift)
    const yearIndices = {};
    YEAR_COLS.forEach((yr) => {
      const idx = headerRow.indexOf(yr);
      if (idx !== -1) yearIndices[yr] = idx;
    });

    const playerRows = playersRaw.slice(1);
    const playerMeta = {};        // keyed by canonical display name
    const canonicalName = {};     // nameKey → canonical display name

    playerRows.forEach((row) => {
      const name = (row[0] || "").trim().replace(/\s+/g, " ");
      if (!name) return;
      canonicalName[nameKey(name)] = name;
      const handicap = parseFloat(row[1]) || 0;
      const description = row[2] || "";
      const firstName = name.split(" ")[0];

      // Build years object: { "2021": "Attended", "2022": "W", "2023": "L", ... }
      const years = {};
      YEAR_COLS.forEach((yr) => {
        const idx = yearIndices[yr];
        if (idx !== undefined) {
          years[yr] = (row[idx] || "").trim();
        }
      });

      // Try full name first (e.g. "Ian Zaferakis"), fall back to first name (e.g. "Cameron")
      const photo = playerPhotos[name] || playerPhotos[firstName] || null;

      playerMeta[name] = {
        handicap,
        description,
        photo,
        years,
        attending2026: years["2026"] === "Attending",
      };
    });

    // ── Parse Courses tab (Player, Score — newest rows = most recent) ──────────
    const scoreRows = scoresRaw.slice(1).filter((row) => row[0] && row[1]);

    // Keyed by nameKey() so casing/spacing typos in the Courses tab still match a player
    const scoresByPlayer = {};
    const unmatchedScoreNames = new Set();
    scoreRows.forEach((row) => {
      const key = nameKey(row[0]);
      const score = parseFloat(row[1]);
      if (!key || isNaN(score)) return;
      if (!canonicalName[key]) unmatchedScoreNames.add(row[0].trim());
      if (!scoresByPlayer[key]) scoresByPlayer[key] = [];
      scoresByPlayer[key].push(score);
    });

    // Surfaces genuine misspellings (not just casing) in the Vercel logs
    if (unmatchedScoreNames.size > 0) {
      console.warn(
        "sheet.js: Courses tab names with no matching player row:",
        [...unmatchedScoreNames].join(", ")
      );
    }

    // ── Parse DraftPicks tab (Pick, Team, Player, Timestamp) ──────────────────
    // Captains are never drafted, so seed them onto their own teams first.
    const TEAM_CAPTAINS = { "Team John": "John Mullin", "Team Brian": "Brian Dalidowicz" };
    const teamByKey = {};
    for (const [team, captain] of Object.entries(TEAM_CAPTAINS)) {
      teamByKey[nameKey(captain)] = team;
    }

    const draftPicks = draftRaw
      .slice(1)
      .filter((row) => row[0] && row[1] && row[2])
      .map((row) => ({
        pick: parseInt(row[0], 10),
        team: (row[1] || "").trim(),
        player: canonicalName[nameKey(row[2])] || (row[2] || "").trim(),
        ts: row[3] || "",
      }))
      .sort((a, b) => a.pick - b.pick);

    draftPicks.forEach((p) => { teamByKey[nameKey(p.player)] = p.team; });

    // Build players array — merge playerMeta + scores + team
    const players = Object.keys(playerMeta).map((name) => ({
      name,
      handicap: playerMeta[name].handicap,
      description: playerMeta[name].description,
      photo: playerMeta[name].photo,
      years: playerMeta[name].years,
      attending2026: playerMeta[name].attending2026,
      scores: scoresByPlayer[nameKey(name)] || [],
      team: teamByKey[nameKey(name)] || null,
    }));

    // Draft is "complete" only when every attending player has a team — the site
    // keeps its pre-draft look until then, so a half-finished draft never leaks out.
    const attendingPlayers = players.filter((p) => p.attending2026);
    const draft = {
      picks: draftPicks,
      complete: attendingPlayers.length > 0 && attendingPlayers.every((p) => p.team),
      teams: Object.keys(TEAM_CAPTAINS).map((team) => ({ name: team, captain: TEAM_CAPTAINS[team] })),
    };

    // Recent rounds — last 5 rows of Courses tab (true insertion order)
    const recentRounds = scoreRows.slice(-5).reverse().map((row) => {
      const key = nameKey(row[0]);
      // Prefer the Players tab spelling so a lowercase typo doesn't show on the site
      const name = canonicalName[key] || row[0].trim();
      const score = parseFloat(row[1]);
      const meta = playerMeta[name] || { handicap: 0, description: "", photo: null };
      const target = 72 + meta.handicap + 3;
      return {
        playerName: name,
        score,
        diff: score - target,
        photo: meta.photo,
      };
    });

    // ── Parse Matches tab (Session, Match, John, Brian, Winner, PuttOff) ──────
    // Filled in from Cam's phone during the trip. Rows are pre-seeded before the
    // trip, so a blank Winner just means "not played yet" — never a missing row.
    // Winner accepts J / B / John / Brian / Team John / Team Brian, any case.
    function normWinner(v) {
      const s = (v || "").trim().toLowerCase();
      if (!s) return null;
      if (s === "j" || s.startsWith("john") || s === "team john") return "Team John";
      if (s === "b" || s.startsWith("brian") || s === "team brian") return "Team Brian";
      return null;
    }
    const isTruthy = (v) => ["true", "yes", "y", "x", "1", "✓"].includes((v || "").trim().toLowerCase());

    const matchRows = matchesRaw.slice(1).filter((row) => (row[0] || "").trim());
    const sessionOrder = [];
    const sessionMap = {};

    matchRows.forEach((row) => {
      const session = (row[0] || "").trim();
      if (!sessionMap[session]) {
        sessionMap[session] = { name: session, matches: [], johnPoints: 0, brianPoints: 0 };
        sessionOrder.push(session);
      }
      const winner = normWinner(row[4]);
      sessionMap[session].matches.push({
        match: (row[1] || "").toString().trim(),
        john: (row[2] || "").trim(),
        brian: (row[3] || "").trim(),
        winner,
        puttOff: isTruthy(row[5]),
      });
      if (winner === "Team John") sessionMap[session].johnPoints += 1;
      if (winner === "Team Brian") sessionMap[session].brianPoints += 1;
    });

    const sessions = sessionOrder.map((n) => sessionMap[n]);
    const johnPoints = sessions.reduce((a, s) => a + s.johnPoints, 0);
    const brianPoints = sessions.reduce((a, s) => a + s.brianPoints, 0);
    const totalPoints = matchRows.length;

    const matches = {
      sessions,
      johnPoints,
      brianPoints,
      totalPoints,
      played: johnPoints + brianPoints,
      remaining: totalPoints - (johnPoints + brianPoints),
      // No ties in the Village Classic — every match is decided, so a simple majority clinches
      clinch: totalPoints > 0 ? Math.floor(totalPoints / 2) + 1 : 0,
      started: johnPoints + brianPoints > 0,
    };

    // ── Parse TripInfo tab (Section, Label, Value) ────────────────────────────
    // Free-form trip logistics Cam edits from his phone. Sections render as cards
    // in sheet order; a row with a blank Label renders as a standalone note.
    const tripInfoOrder = [];
    const tripInfoMap = {};
    tripInfoRaw.slice(1).forEach((row) => {
      const section = (row[0] || "").trim();
      const label = (row[1] || "").trim();
      const value = (row[2] || "").trim();
      if (!section || (!label && !value)) return;
      if (!tripInfoMap[section]) { tripInfoMap[section] = { name: section, items: [] }; tripInfoOrder.push(section); }
      tripInfoMap[section].items.push({ label, value });
    });
    const tripInfo = tripInfoOrder.map((n) => tripInfoMap[n]);

    // ── Parse Articles tab ─────────────────────────────────────────────────────
    const articleRows = articlesRaw.slice(1);
    const articles = articleRows.map((row) => ({
      title: row[0] || "",
      date: row[1] || "",
      author: row[2] || "",
      body: row[3] || "",
    })).reverse();

    // ── Parse History tab ──────────────────────────────────────────────────────
    const historyRows = historyRaw.slice(1);
    const history = historyRows.map((row) => ({
      year: row[0] || "",
      location: row[1] || "",
      individualChampion: row[2] || "",
      teamChampion: row[3] || "",
      storyline: row[4] || "",
    })).sort((a, b) => parseInt(b.year) - parseInt(a.year));

    const sheetYears = new Set(history.map((h) => h.year));
    for (const year of Object.keys(historyPhotos)) {
      if (!sheetYears.has(year)) {
        history.push({ year, location: "", individualChampion: "", teamChampion: "", storyline: "" });
      }
    }
    history.sort((a, b) => parseInt(b.year) - parseInt(a.year));

    res.status(200).json({ players, articles, history, historyPhotos, logoUrl, recentRounds, draft, matches, tripInfo,
      meta: {
        tabs: tabTitles,
        missingTabs: ["Players", "Articles", "Courses", "History", "DraftPicks", "Matches"]
          .filter((t) => !resolveTab(tabTitles, t)),
      },
    });

  } catch (err) {
    console.error("sheet.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
