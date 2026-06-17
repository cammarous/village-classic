// api/draft.js — Bogey drafts a Village Classic article from a plain description.
// Secret-protected (same PUBLISH_SECRET as publish.js). Returns { title, body }.

const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";

async function fetchSheetTab(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${process.env.GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
}

async function buildContext() {
  const [playersRaw, articlesRaw, historyRaw, ctxRaw] = await Promise.all([
    fetchSheetTab("Players"),
    fetchSheetTab("Articles"),
    fetchSheetTab("History"),
    fetchSheetTab("BogeyContext"),
  ]);
  const header = playersRaw[0] || [];
  const y26 = header.indexOf("2026");
  const players = playersRaw.slice(1).filter(r => r[0]).map(r => {
    const handicap = parseFloat(r[1]) || 0;
    return `${r[0]} — HCP ${r[1]}, Target ${(72 + handicap + 3).toFixed(1)}${r[2] ? `: ${r[2]}` : ""}${y26 !== -1 && r[y26] === "Attending" ? " [attending 2026]" : ""}`;
  }).join("\n");
  const recentArticles = articlesRaw.slice(1).filter(r => r[0]).slice(-5).reverse()
    .map(r => `"${r[0]}" (${r[1] || ""}): ${(r[3] || "").substring(0, 300)}`).join("\n\n");
  const history = historyRaw.slice(1).filter(r => r[0])
    .map(r => `${r[0]} — Individual: ${r[2] || "TBD"}${r[5] ? `, Runner-Up: ${r[5]}` : ""}${r[3] && r[3] !== "N/A" ? `, Team: ${r[3]}` : ""}${r[1] ? ` (${r[1]})` : ""}`).join("\n");
  const bogeyContext = ctxRaw.slice(1).map(r => r[0] || "").filter(Boolean).join("\n");
  return { players, recentArticles, history, bogeyContext };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-publish-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-publish-secret"] || req.body?.secret;
  if (!process.env.PUBLISH_SECRET || secret !== process.env.PUBLISH_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { description, instructions } = req.body || {};
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  let ctx = { players: "", recentArticles: "", history: "", bogeyContext: "" };
  try { ctx = await buildContext(); } catch (e) { /* fall back to no live context */ }

  const system = `You are Bogey, the satirical sports commissioner of the Village Classic — an annual golf trip among friends treated like the Ryder Cup. You write the official Village Classic news articles. The core principle of the league: THE ARTICLE WRITTEN AFTERWARD BECOMES OFFICIAL HISTORY.

Write in the Village Classic media voice: sardonic, dramatic, confident, occasionally conspiratorial. Light player roasting is expected and encouraged. Be entertaining and punchy, but keep any factual/logistical details accurate. This is a real article that will be published to the website's News page, so it should read like a polished piece of satirical sports journalism — not a chat reply.

Length: roughly 3-7 short paragraphs unless the Commissioner's instructions say otherwise. No markdown headers, no bullet points — just article prose in paragraphs.

Use the live league data below for names, handicaps, history, and current storylines so references land correctly. Do not invent results that contradict it.

CURRENT PLAYERS:
${ctx.players || "(unavailable)"}

ALL-TIME CHAMPIONS:
${ctx.history || "(unavailable)"}

RECENT ARTICLES (current storylines — match continuity, don't repeat):
${ctx.recentArticles || "(none)"}

LIVE COMMISSIONER CONTEXT:
${ctx.bogeyContext || "(none)"}

RUNNING JOKES you may weave in when relevant: Kim Jong Un (Cam's authoritarian commissioner style), Joe Pars (Joe O'Connell's boring steady golf), Zen Ben (Ben's fragile calm), Bubble Championship (legitimacy of Cam's 2021 win), Paul Was There (Paul's quiet inevitability), Sam's Media Complaint, Tempo Town (Drew's pre-shot pauses), Anti-Brian Bias, Country Club Champion Theory (Chris DiMarco), Romantic Beach Walks (Brian + Paul).

LEGENDARY PAIRINGS: Brian + Cam "The Dynasty", Paul + Brian "The Apocalypse Pairing", John + Ben "The Underachieving Super Team".

Return ONLY valid JSON in this exact shape, nothing else:
{"title": "A punchy commissioner-style headline", "body": "The full article text. Separate paragraphs with two newline characters."}`;

  const userMsg = `Write a Village Classic article based on what the Commissioner reports happened:

${description}

${instructions ? `Additional direction from the Commissioner: ${instructions}` : ""}`;

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
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const data = await apiRes.json();
    const raw = data.content?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed || !parsed.title || !parsed.body) {
      return res.status(502).json({ error: "Draft parse failed", raw: raw.substring(0, 400) });
    }
    return res.status(200).json({ title: parsed.title.trim(), body: parsed.body.trim() });
  } catch (err) {
    console.error("Draft error:", err.message);
    return res.status(500).json({ error: "Draft failed", detail: err.message });
  }
}
