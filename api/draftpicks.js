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
const MATCHES_TAB = "Matches";

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
    // ── Self-test: /api/draftpicks?diag=1 ────────────────────────────────────
    // Reports WHY writes fail without revealing any secret value. Returns only
    // booleans plus the service-account identifier, which you need anyway to
    // confirm the sheet is shared with it.
    if (req.method === "GET" && req.query?.diag) {
      const diag = {
        endpointDeployed: true,
        GOOGLE_API_KEY_set: !!process.env.GOOGLE_API_KEY,
        PUBLISH_SECRET_set: !!process.env.PUBLISH_SECRET,
        DRAFT_PASSWORD_set: !!process.env.DRAFT_PASSWORD,
        DRAFT_PASSWORD_length: process.env.DRAFT_PASSWORD ? process.env.DRAFT_PASSWORD.length : 0,
        PUBLISH_SECRET_length: process.env.PUBLISH_SECRET ? process.env.PUBLISH_SECRET.length : 0,
        GOOGLE_SERVICE_ACCOUNT_KEY_set: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        serviceAccountEmail: null,
        serviceAccountKeyParses: false,
        draftPicksTabReadable: false,
        draftPicksRowCount: null,
        writeTest: null,
      };

      try {
        const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
        diag.serviceAccountKeyParses = !!creds.client_email;
        diag.serviceAccountEmail = creds.client_email || null;
      } catch (e) {
        diag.serviceAccountKeyParses = false;
        diag.serviceAccountKeyError = e.message;
      }

      try {
        const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}?key=${process.env.GOOGLE_API_KEY}`);
        diag.draftPicksTabReadable = r.ok;
        if (r.ok) {
          const d = await r.json();
          diag.draftPicksRowCount = Math.max(0, (d.values || []).length - 1);
        } else {
          diag.draftPicksReadStatus = r.status;
        }
      } catch (e) { diag.draftPicksReadError = e.message; }

      // Actually attempt a write, then remove it — proves the whole chain
      try {
        const sheets = sheetsClient();
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: `${TAB}!A:D`,
          valueInputOption: "USER_ENTERED",
          resource: { values: [["DIAG", "DIAG", "__selftest__", new Date().toISOString()]] },
        });
        const r2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}?key=${process.env.GOOGLE_API_KEY}`);
        const d2 = await r2.json();
        const rows = d2.values || [];
        const idx = rows.findIndex((row) => row[2] === "__selftest__");
        if (idx > 0) {
          await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A${idx + 1}:D${idx + 1}` });
        }
        diag.writeTest = "SUCCESS — the service account can write to DraftPicks";
      } catch (e) {
        diag.writeTest = `FAILED — ${e.message}`;
      }

      return res.status(200).json(diag);
    }

    // ── Read picks (public) ──────────────────────────────────────────────────
    if (req.method === "GET") {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}?key=${process.env.GOOGLE_API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) {
        // Don't hide a broken read behind an empty draft — say so.
        console.warn(`draftpicks: read failed ${r.status}`);
        return res.status(200).json({ picks: [], readError: r.status });
      }
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

    // Accepts either DRAFT_PASSWORD (a memorable one you choose, used by the
    // Big Board lock screen) or the original PUBLISH_SECRET.
    const secret = req.headers["x-publish-secret"] || req.body?.secret;
    const accepted = [process.env.DRAFT_PASSWORD, process.env.PUBLISH_SECRET].filter(Boolean);
    if (!accepted.length || !accepted.includes(secret)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Password check for the lock screen — writes nothing.
    if (req.body?.verify) return res.status(200).json({ ok: true });

    const sheets = sheetsClient();

    // ── Reset ────────────────────────────────────────────────────────────────
    // Clears the draft AND every match result, so a practice run leaves nothing
    // behind. The Matches tab keeps its Session/Match rows — only the columns
    // you fill in during the trip (John, Brian, Winner, PuttOff) are wiped.
    if (req.body?.reset) {
      const cleared = { draftPicks: false, matchResults: false };
      await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A2:D10000` });
      cleared.draftPicks = true;
      try {
        await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${MATCHES_TAB}!C2:F10000` });
        cleared.matchResults = true;
      } catch (e) {
        console.warn(`draftpicks reset: could not clear ${MATCHES_TAB} — ${e.message}`);
      }
      return res.status(200).json({ ok: true, reset: true, cleared });
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
