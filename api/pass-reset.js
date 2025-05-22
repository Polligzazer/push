export default async function handler(req, res) {
  const allowedOrigins = ['http://localhost:5173', 'https://flo-ph.vercel.app', 'https://flo-stimeyc.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Call internal API for generating reset link
    const response = await fetch(`https://flo-proxy.vercel.app/api/generate-reset-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();

    if (!data.resetLink) {
      return res.status(500).json({ error: 'Failed to get reset link' });
    }

    console.log(`Send reset link to ${email}: ${data.resetLink}`);

    return res.status(200).json({ success: true, resetLink: data.resetLink });
  } catch (error) {
    console.error('❌ Error in pass-reset:', error);
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
}
