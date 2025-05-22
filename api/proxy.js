export default async function handler(req, res) {
  // Only allow POST requests (for chat completions)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Your API key from Vercel environment variables
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not set' });
  }

  // Prepare the request body for Grok API
  // Expecting { messages: [...] } in the POST body from the frontend
  const { messages } = req.body;

  try {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages,
      }),
    });

    if (!grokRes.ok) {
      const error = await grokRes.json();
      return res.status(grokRes.status).json(error);
    }

    const data = await grokRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}

// Enable Vercel to parse JSON body
export const config = {
  api: {
    bodyParser: true,
  },
};
