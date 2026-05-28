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
  // Fetch all files in the folder (handle pagination)
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
    // Fetch all data in parallel
    const [playersRaw, articlesRaw, coursesRaw, historyRaw, driveFiles] = await Promise.all([
      fetchSheetTab("Players"),
      fetchSheetTab("Articles"),
      fetchSheetTab("Courses"),
      fetchSheetTab("History"),
      fetchDriveFiles(),
    ]);

    // ── Build photo maps from Drive files ──────────────────────────────────────

    // Player photos: filename is first name only (e.g. "Cameron.jpg")
    // History photos: filename starts with 4-digit year (e.g. "2022 Village Classic...")
    // Logo: filename contains "Village_Classic_2026_Logo"

    const playerPhotos = {}; // { "Cameron": "https://drive.google.com/thumbnail?id=FILE_ID&sz=w200" }
    const historyPhotos = {}; // { "2022": ["url1", "url2"], "2023": [...] }
    let logoUrl = null;

    for (const file of driveFiles) {
      const name = file.name;
      const thumbUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;

      if (name.includes("Village_Classic_2026_Logo")) {
        logoUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w300`;
        continue;
      }

      // Check if filename starts with a 4-digit year (history photo)
      const yearMatch = name.match(/^(\d{4})\s/);
      if (yearMatch) {
        const year = yearMatch[1];
        if (!historyPhotos[year]) historyPhotos[year] = [];
        historyPhotos[year].push(thumbUrl);
        continue;
      }

      // Otherwise treat as player photo — strip extension to get first name
      const firstName = name.replace(/\.[^/.]+$/, ""); // remove extension
      playerPhotos[firstName] = `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`;
    }

    // ── Parse Players tab ──────────────────────────────────────────────────────
    // Row 0 = header: Name, Handicap, Description, R1, R2, ...
    const playerRows = playersRaw.slice(1); // skip header
    const players = playerRows.map((row) => {
      const name = row[0] || "";
      const handicap = parseFloat(row[1]) || 0;
      const description = row[2] || "";
      // Scores start at column 3
      const scores = row.slice(3).map((s) => (s !== "" && s !== undefined ? parseFloat(s) : null)).filter((s) => s !== null);
      const firstName = name.split(" ")[0];
      return {
        name,
        handicap,
        description,
        scores,
        photo: playerPhotos[firstName] || null,
      };
    });

    // ── Parse Articles tab ─────────────────────────────────────────────────────
    // Columns: Title, Date, Author, Body
    const articleRows = articlesRaw.slice(1);
    const articles = articleRows.map((row) => ({
      title: row[0] || "",
      date: row[1] || "",
      author: row[2] || "",
      body: row[3] || "",
    })).reverse(); // newest first (last row = most recent)

    // ── Parse Courses tab ─────────────────────────────────────────────────────
    // Columns: Course, Par, Date
    const courseRows = coursesRaw.slice(1);
    const courses = courseRows.map((row) => ({
      course: row[0] || "",
      par: row[1] || "",
      date: row[2] || "",
    }));

    // ── Parse History tab ─────────────────────────────────────────────────────
    // Columns: Year, Location, Individual Champion, Team Champion, Storyline
    const historyRows = historyRaw.slice(1);
    const historyData = historyRows.map((row) => ({
      year: row[0] || "",
      location: row[1] || "",
      individualChampion: row[2] || "",
      teamChampion: row[3] || "",
      storyline: row[4] || "",
    })).sort((a, b) => parseInt(b.year) - parseInt(a.year)); // newest first

    // Add any years that have photos but no sheet row
    const sheetYears = new Set(historyData.map((h) => h.year));
    for (const year of Object.keys(historyPhotos)) {
      if (!sheetYears.has(year)) {
        historyData.push({ year, location: "", individualChampion: "", teamChampion: "", storyline: "" });
      }
    }
    historyData.sort((a, b) => parseInt(b.year) - parseInt(a.year));

    // ── Return all data ────────────────────────────────────────────────────────
    res.status(200).json({
      players,
      articles,
      courses,
      history: historyData,
      historyPhotos,
      logoUrl,
    });
  } catch (err) {
    console.error("sheet.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
