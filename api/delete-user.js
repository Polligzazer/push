import admin from 'firebase-admin';

// Initialize the Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') .trim(),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
        authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        clientC509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL
      })
    });
  }

const db = admin.firestore();

module.exports = async (req, res) => {

  const allowedOrigins = [
    'http://localhost:5173',
    'https://flo-ph.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.admin !== true) {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in request body' });
    }

    // 1) Delete the Fi rebase Auth user
    await admin.auth().deleteUser(uid);

    // 2) Delete Firestore user document
    await db.doc(`users/${uid}`).delete();

    // 3) Batch-delete lost_items for this user
    const lostItemsSnap = await db
      .collection('lost_items')
      .where('userId', '==', uid)
      .get();

    const batch = db.batch();
    lostItemsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: error.message });
  }
}