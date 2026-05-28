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
    const [playersRaw, articlesRaw, coursesRaw, historyRaw, driveFiles] = await Promise.all([
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
        logoUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        continue;
      }

      // History photo: filename starts with 4-digit year
      const yearMatch = name.match(/^(\d{4})\s/);
      if (yearMatch) {
        const year = yearMatch[1];
        if (!historyPhotos[year]) historyPhotos[year] = [];
        historyPhotos[year].push(thumbUrl);
        continue;
      }

      // Player photo: filename is first name only (e.g. "Cameron.jpg")
      const firstName = name.replace(/\.[^/.]+$/, "");
      playerPhotos[firstName] = `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`;
    }

    // Fallback logo if not found in Drive
    if (!logoUrl) {
      logoUrl = "https://drive.google.com/uc?export=view&id=1TeG2PH0241YAFjNfGuOotE9jD0-eXW5n";
    }

    // ── Parse Players tab ──────────────────────────────────────────────────────
    const playerRows = playersRaw.slice(1);
    const players = playerRows.map((row) => {
      const name = row[0] || "";
      const handicap = parseFloat(row[1]) || 0;
      const description = row[2] || "";
      const scores = row.slice(3).map((s) => (s !== "" && s !== undefined ? parseFloat(s) : null)).filter((s) => s !== null);
      const firstName = name.split(" ")[0];
      return { name, handicap, description, scores, photo: playerPhotos[firstName] || null };
    });

    // ── Parse Articles tab ─────────────────────────────────────────────────────
    const articleRows = articlesRaw.slice(1);
    const articles = articleRows.map((row) => ({
      title: row[0] || "",
      date: row[1] || "",
      author: row[2] || "",
      body: row[3] || "",
    })).reverse();

    // ── Parse Courses tab ──────────────────────────────────────────────────────
    const courseRows = coursesRaw.slice(1);
    const courses = courseRows.map((row) => ({
      course: row[0] || "",
      par: row[1] || "",
      date: row[2] || "",
    }));

    // ── Parse History tab ──────────────────────────────────────────────────────
    const historyRows = historyRaw.slice(1);
    const history = historyRows.map((row) => ({
      year: row[0] || "",
      location: row[1] || "",
      individualChampion: row[2] || "",
      teamChampion: row[3] || "",
      storyline: row[4] || "",
    })).sort((a, b) => parseInt(b.year) - parseInt(a.year));

    // Add years that have photos but no sheet row
    const sheetYears = new Set(history.map((h) => h.year));
    for (const year of Object.keys(historyPhotos)) {
      if (!sheetYears.has(year)) {
        history.push({ year, location: "", individualChampion: "", teamChampion: "", storyline: "" });
      }
    }
    history.sort((a, b) => parseInt(b.year) - parseInt(a.year));

    res.status(200).json({ players, articles, courses, history, historyPhotos, logoUrl });

  } catch (err) {
    console.error("sheet.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
