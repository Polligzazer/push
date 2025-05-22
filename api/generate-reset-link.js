import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app;
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  };

  app = initializeApp({
    credential: cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
}

module.exports = async (req, res) => {
  const allowedOrigins = ['http://localhost:5173', 'https://flo-ph.vercel.app', 'https://flo-stimeyc.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const auth = getAuth();
    const resetLink = await auth.generatePasswordResetLink(email, {
      url: `https://localhost:5173/reset-password`,
      handleCodeInApp: true,
    });
    return res.status(200).json({ resetLink });
  } catch (error) {
    console.error('🔁 Error generating reset link:', error);
    return res.status(500).json({ error: 'Failed to generate reset link' });
  }
}
