import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin app once
let firebaseApp;
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  };

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    // You can include databaseURL here if needed
  });

  console.log('🔥 Firebase Admin initialized');
} catch (error) {
  console.error('🔥 Firebase initialization failed:', error);
  process.exit(1);
}

// Exported function for handling requests (can be used as Express handler or serverless function)
export default async function handler(req, res) {
  // CORS Configuration
  const allowedOrigins = ['http://localhost:5173', 'https://flo-ph.vercel.app', 'https://flo-stimeyc.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  // Handle preflight requests first
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed_methods: ['POST'],
    });
  }

  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing email' });
    }

    const auth = getAuth();

    // Verify user exists
    await auth.getUserByEmail(email);

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(email, {
      url: 'https://flo-stimeyc.vercel.app/reset-password', // Your frontend URL here
      handleCodeInApp: true,
    });

    return res.status(200).json({ resetLink });
  } catch (error) {
    console.error('🚨 Error generating reset link:', error);

    // If user not found, you might want to return 200 to avoid user enumeration
    if (error.code === 'auth/user-not-found') {
      return res.status(200).json({
        resetLink: null,
        message: "If the email is registered, you'll receive a reset link shortly.",
      });
    }

    return res.status(500).json({
      error: 'Failed to generate reset link',
      message: error.message,
    });
  }
}
