import admin from 'firebase-admin';

// Initialize the Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            type: process.env.FIREBASE_TYPE,
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim(),
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

// Predefined constants
const MAX_BATCH_SIZE = 500; // Firestore batch limit

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
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

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
    let decodedToken;
    
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
        if (!decodedToken.admin) {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const { uid } = req.body;
    if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid uid' });
    }

    try {
        // Verify the target user exists before deletion
        try {
            await admin.auth().getUser(uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                return res.status(404).json({ error: 'User not found' });
            }
            throw error;
        }

        // 1) Delete Firestore user document first (safer if auth deletion fails)
        await db.doc(`users/${uid}`).delete();

        // 2) Batch-delete lost_items in chunks (handles large collections)
        const lostItemsRef = db.collection('lost_items').where('userId', '==', uid);
        let deletedCount = 0;
        
        while (true) {
            const snapshot = await lostItemsRef.limit(MAX_BATCH_SIZE).get();
            if (snapshot.empty) break;
            
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deletedCount += snapshot.size;
        }

        // 3) Delete the Firebase Auth user
        await admin.auth().deleteUser(uid);

        // Log the deletion
        console.log(`User ${uid} deleted by admin ${decodedToken.uid}. Removed ${deletedCount} lost items.`);

        return res.status(200).json({ 
            success: true,
            deletedItemsCount: deletedCount
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        
        // Special handling for specific errors
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(500).json({ 
            error: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
    }
};