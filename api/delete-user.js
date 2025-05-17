const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase only once
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID
  };

  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://message-4138f-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const auth = getAuth();
const db = getFirestore();

const uid = 'rWU1JksUQzUhGX42FueojcWo9a82';

auth.setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('✅ Custom claims set for admin');
  })
  .catch((err) => {
    console.error('Error setting claims:', err);
  });

module.exports = async (req, res) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://flo-ph.vercel.app',
    'https://flo-stimeyc.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in request body' });
    }

    await auth.deleteUser(uid);
    await db.doc(`users/${uid}`).delete();

    const lostItemsSnap = await db.collection('lost_items').where('userId', '==', uid).get();
    const batch = db.batch();
    lostItemsSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const chatsSnap = await db.collection('chats').where('userId', '==', uid).get();
    chatsSnap.forEach(doc => batch.delete(doc.ref));
    const userChatsSnap = await db.collection('userChats').where('userId', '==', uid).get();
    userChatsSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
