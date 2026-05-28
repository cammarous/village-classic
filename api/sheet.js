// api/sheet.js — Vercel Serverless Function
// Fetches Google Sheet data for the Village Classic site
// NOTE: Drive photo fetching temporarily disabled — will re-enable once API key is sorted

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
const API_KEY = process.env.GOOGLE_API_KEY;

// Known static file IDs (fallback until Drive API is re-enabled)
const LOGO_URL = "https://drive.google.com/thumbnail?id=1TeG2PH0241YAFjNfGuOotE9jD0-eXW5n&sz=w300";

async function fetchSheetTab(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed for tab "${tabName}": ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const [playersRaw, articlesRaw, coursesRaw, historyRaw] = await Promise.all([
      fetchSheetTab("Players"),
      fetchSheetTab("Articles"),
      fetchSheetTab("Courses"),
      fetchSheetTab("History"),
    ]);

    // ── Parse Players tab ──────────────────────────────────────────────────────
    // Row 0 = header: Name, Handicap, Description, R1, R2, ...
    const playerRows = playersRaw.slice(1);
    const players = playerRows.map((row) => {
      const name = row[0] || "";
      const handicap = parseFloat(row[1]) || 0;
      const description = row[2] || "";
      const scores = row.slice(3).map((s) => (s !== "" && s !== undefined ? parseFloat(s) : null)).filter((s) => s !== null);
      return { name, handicap, description, scores, photo: null };
    });

    // ── Parse Articles tab ─────────────────────────────────────────────────────
    // Columns: Title, Date, Author, Body
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
    // Columns: Year, Location, Individual Champion, Team Champion, Storyline
    const historyRows = historyRaw.slice(1);
    const history = historyRows.map((row) => ({
      year: row[0] || "",
      location: row[1] || "",
      individualChampion: row[2] || "",
      teamChampion: row[3] || "",
      storyline: row[4] || "",
    })).sort((a, b) => parseInt(b.year) - parseInt(a.year));

    res.status(200).json({
      players,
      articles,
      courses,
      history,
      historyPhotos: {},
      logoUrl: LOGO_URL,
    });
  } catch (err) {
    console.error("sheet.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
