export default async function handler(req, res) {
  const API_KEY = process.env.GROK_API_KEY;

  const url = `https://api.x.ai/v1/chat/completions?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "API call failed" });
  }
}
