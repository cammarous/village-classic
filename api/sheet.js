// api/sheet.js — Vercel Serverless Function
// Fetches Google Sheet data + Google Drive photos for the Village Classic site

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
const DRIVE_FOLDER_ID = "1DJKTNgO3KWBPjrytSB-ecRmMmCYJHFgK";
const API_KEY = process.env.GOOGLE_API_KEY;

async function fetchSheetTab(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed for tab "${tabName}": ${res.status}`);
  const data = await res.json();
  return data.values || [];
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
    const [playersRaw, articlesRaw, scoresRaw, historyRaw, driveFiles] = await Promise.all([
      fetchSheetTab("Players"),
      fetchSheetTab("Articles"),
      fetchSheetTab("Courses"),
      fetchSheetTab("History"),
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
    const playerMeta = {};

    playerRows.forEach((row) => {
      const name = row[0] || "";
      if (!name) return;
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

    const scoresByPlayer = {};
    scoreRows.forEach((row) => {
      const name = row[0].trim();
      const score = parseFloat(row[1]);
      if (!name || isNaN(score)) return;
      if (!scoresByPlayer[name]) scoresByPlayer[name] = [];
      scoresByPlayer[name].push(score);
    });

    // Build players array — merge playerMeta + scores
    const players = Object.keys(playerMeta).map((name) => ({
      name,
      handicap: playerMeta[name].handicap,
      description: playerMeta[name].description,
      photo: playerMeta[name].photo,
      years: playerMeta[name].years,
      attending2026: playerMeta[name].attending2026,
      scores: scoresByPlayer[name] || [],
    }));

    // Recent rounds — last 5 rows of Courses tab (true insertion order)
    const recentRounds = scoreRows.slice(-5).reverse().map((row) => {
      const name = row[0].trim();
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

    res.status(200).json({ players, articles, history, historyPhotos, logoUrl, recentRounds });

  } catch (err) {
    console.error("sheet.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
