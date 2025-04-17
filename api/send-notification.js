const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  
  if (!serviceAccount.project_id) {
    throw new Error('Invalid Firebase service account configuration');
  }

  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  console.error('🔥 Firebase initialization failed:', error);
  process.exit(1); // Fail fast if initialization fails
}


module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, data } = req.body;
    
    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = {
      token,
      notification: { title, body },
      data: data || {}
    };

    const messaging = getMessaging();
    const messageId = await messaging.send(message);
    
    res.status(200).json({ 
      success: true,
      messageId: messageId
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Notification failed',
      details: error.message
    });
  }
};
