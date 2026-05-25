export default async function handler(req, res) {
  const SHEET_ID = "19xwerN5gm34zoz138GCESbn14ORTys6QTmJ4pi-7HCY";
  
  try {
    const [playersRes, articlesRes, coursesRes] = await Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Players`),
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Articles`),
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Courses`),
    ]);

    const [playersCSV, articlesCSV, coursesCSV] = await Promise.all([
      playersRes.text(),
      articlesRes.text(),
      coursesRes.text(),
    ]);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ playersCSV, articlesCSV, coursesCSV });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
