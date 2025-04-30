import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const allowedOrigins = [
  'http://localhost:5173',
  'https://flo-ph.vercel.app'
];

const handleCors = (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Vary', 'Origin'); // Helps caching properly
  }
};

export default async function handler(req, res) {
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

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
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