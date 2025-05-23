const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase outside the handler
let firebaseApp;
console.log("Firebase Config:", {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 20) + "..."
});
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .trim();

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID
  };

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://message-4138f-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
} catch (error) {
  console.error('🔥 Firebase initialization failed:', error);
  process.exit(1);
}

module.exports = async (req, res) => {
  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:5173',
    'https://flo-ph.vercel.app',
    'https://flo-stimeyc.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin'); // Important for proper caching

  // Handle preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 No Content for preflight
  }

  // Handle unsupported methods
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed_methods: ['POST'] 
    });
  }

  try {
    const { userId, subscription } = req.body;

    // Validate the incoming data
    if (!userId || !subscription || typeof subscription !== 'object') {
      return res.status(400).json({ error: "Invalid request format" });
    }

    const firestore = getFirestore(firebaseApp);
    const userSubscriptionsRef = firestore.collection('userSubscriptions').doc(userId);

    // Save the subscription to Firestore
    await userSubscriptionsRef.set({
      subscription: subscription,
      timestamp: new Date().toISOString(),
    });

    console.log(`💬 Subscription saved for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription saved successfully',
    });

  } catch (error) {
    console.error('🚨 Subscription Error:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Subscription failed',
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message
    });
  }
};
