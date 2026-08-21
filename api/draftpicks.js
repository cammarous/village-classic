// api/draftpicks.js — Live draft pick storage for the Visual Big Board.
//
// GET  → { picks: [{ pick, team, player, ts }] }   (public, no secret — the board reads this)
// POST → append a pick   body: { secret, pick, team, player }
// POST → { secret, reset: true } clears every pick (use before a practice run)
//
// Writes to a "DraftPicks" tab in the Google Sheet.
// Create that tab with header row: Pick | Team | Player | Timestamp
//
// Uses the same service account + PUBLISH_SECRET as publish.js.
import { google } from "googleapis";

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
const TAB = "DraftPicks";

function sheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-publish-secret");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ── Read picks (public) ──────────────────────────────────────────────────
    if (req.method === "GET") {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}?key=${process.env.GOOGLE_API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(200).json({ picks: [] }); // tab missing → empty draft
      const data = await r.json();
      const rows = (data.values || []).slice(1);
      const picks = rows
        .filter((row) => row[0] && row[2])
        .map((row) => ({
          pick: parseInt(row[0], 10),
          team: row[1] || "",
          player: row[2] || "",
          ts: row[3] || "",
        }))
        .sort((a, b) => a.pick - b.pick);
      return res.status(200).json({ picks });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const secret = req.headers["x-publish-secret"] || req.body?.secret;
    if (!process.env.PUBLISH_SECRET || secret !== process.env.PUBLISH_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sheets = sheetsClient();

    // ── Reset ────────────────────────────────────────────────────────────────
    if (req.body?.reset) {
      await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:D10000` });
      return res.status(200).json({ ok: true, reset: true });
    }

    // ── Append a pick ────────────────────────────────────────────────────────
    const { pick, team, player } = req.body || {};
    if (!pick || !team || !player) {
      return res.status(400).json({ error: "pick, team and player are required" });
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A:D`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[pick, team, player, new Date().toISOString()]],
      },
    });
    return res.status(200).json({ ok: true, pick, team, player });
  } catch (err) {
    console.error("draftpicks error:", err.message);
    return res.status(500).json({ error: "Draft pick write failed", detail: err.message });
  }
}
