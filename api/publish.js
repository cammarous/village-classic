// api/publish.js — Publish articles / history / Bogey context to the Google Sheet
// Secret-protected. Uses the same service account as chat.js (GOOGLE_SERVICE_ACCOUNT_KEY).
import { google } from "googleapis";

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";

// ─── Append a row to a tab ────────────────────────────────────────────────────
async function appendRow(range, values) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [values] },
  });
}

// Today's date as M/D/YYYY (Eastern)
function todayEastern() {
  return new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });
}

// Join paragraphs with || (History storyline format). Accepts string or array.
function joinParagraphs(input) {
  if (Array.isArray(input)) return input.filter(Boolean).join("||");
  return input || "";
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-publish-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth
  const secret = req.headers["x-publish-secret"] || req.body?.secret;
  if (!process.env.PUBLISH_SECRET || secret !== process.env.PUBLISH_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type } = req.body || {};

  try {
    if (type === "article") {
      // Articles — Title, Date, Author, Body
      const { title, body, date, author } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: "article requires title and body" });
      }
      await appendRow("Articles!A:D", [
        title,
        date || todayEastern(),
        author || "The Commissioner",
        body,
      ]);
      return res.status(200).json({ ok: true, published: "article", title });
    }

    if (type === "history") {
      // History — Year, Location, Individual Champion, Team Champion, Storyline, Runner Up
      const { year, location, individualChampion, teamChampion, storyline, runnerUp } = req.body;
      if (!year) {
        return res.status(400).json({ error: "history requires year" });
      }
      await appendRow("History!A:F", [
        year,
        location || "",
        individualChampion || "",
        teamChampion || "",
        joinParagraphs(storyline),
        runnerUp || "",
      ]);
      return res.status(200).json({ ok: true, published: "history", year });
    }

    if (type === "bogeycontext") {
      // BogeyContext — single column of freeform live knowledge
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "bogeycontext requires text" });
      }
      await appendRow("BogeyContext!A:A", [text]);
      return res.status(200).json({ ok: true, published: "bogeycontext" });
    }

    return res.status(400).json({ error: "Unknown type. Use 'article', 'history', or 'bogeycontext'." });
  } catch (err) {
    console.error("Publish error:", err.message);
    return res.status(500).json({ error: "Publish failed", detail: err.message });
  }
}
