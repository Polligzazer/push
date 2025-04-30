import admin from 'firebase-admin';

// Initialize Firebase Admin (keep your existing initialization code)

const db = admin.firestore();

const handleCors = (req, res) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://flo-ph.vercel.app'
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Cache-Control', 'no-store');
  } else {
    // Reject disallowed origins early (optional for extra security)
    res.status(403).end();
  }
};

module.exports = async (req, res) => {
  // Apply CORS headers first
  handleCors(req, res);

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // Must return 204 for preflight
  }

  // Only allow POST requests for main logic
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rest of your existing code...
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken.admin !== true) {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in request body' });
    }

    // Your existing deletion logic...
    await admin.auth().deleteUser(uid);
    await db.doc(`users/${uid}`).delete();
    
    // Batch delete lost items
    const lostItemsSnap = await db.collection('lost_items')
      .where('userId', '==', uid)
      .get();
    
    const batch = db.batch();
    lostItemsSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};