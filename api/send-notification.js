  const { initializeApp, cert } = require('firebase-admin/app');
  const { getMessaging } = require('firebase-admin/messaging');

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
      'https://flo-ph.vercel.app'
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
      const { token, payload } = req.body;

      if (!token || !payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid request format" });
}

      const dataPayload = payload.data ?? payload;

      const { title = "", body = "", ...rest } = dataPayload;

      // Send notification
      const message = {
        token,
        data: {
          title,
          body,
          icon: '/icon.png',
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // Helps in Android display
          ...rest,
        }
      };

      const messaging = getMessaging();
      const messageId = await messaging.send(message);
      
      return res.status(200).json({ 
        success: true,
        messageId 
      });
      
    } catch (error) {
      console.error('🚨 Notification Error:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });

      return res.status(500).json({
        error: 'Notification failed',
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message
      });
    }
  };