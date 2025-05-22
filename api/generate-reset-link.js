const express = require('express');
const cors = require('cors');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'https://flo-stimeyc.vercel.app'] }));
app.use(express.json());

app.post('/generate-reset-link', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Generate Firebase password reset link
    const resetLink = await getAuth().generatePasswordResetLink(email, {
      url: 'http://localhost:5173/reset-password',
      handleCodeInApp: true
    });

    res.json({ resetLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate reset link' });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
