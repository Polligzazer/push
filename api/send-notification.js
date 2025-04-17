const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: '115239112856945838359',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/...'
};

// Debug: Verify key structure
console.log('Service Account Key:', {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email,
  privateKeyStart: serviceAccount.private_key.slice(0, 30),
  privateKeyEnd: serviceAccount.private_key.slice(-30)
});

try {
  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('🔥 Firebase initialized successfully');
} catch (error) {
  console.error('Initialization failed:', {
    message: error.message,
    code: error.code
  });
  process.exit(1);
}



module.exports = async (req, res) => {

  const allowedOrigins = [
    'http://localhost:5173',
    'https://flo-ph.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Handle CORS
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    return res.status(405).json({ 
      error: 'Use POST method for notifications',
      hint: 'This endpoint only accepts POST requests'
    });
  }


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
