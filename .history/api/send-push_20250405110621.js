import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// Use CORS middleware to handle preflight requests
app.use(cors({ origin: '*' }));
app.use(express.json());

const SERVER_KEY = process.env.FCM_SERVER_KEY;

app.post('/api/send-push', async (req, res) => {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  // Set CORS headers for other methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Destructure data from the request body
  const { token, title, body } = req.body;

  if (!SERVER_KEY) {
    return res.status(500).json({ error: 'FCM_SERVER_KEY is missing' });
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          click_action: '/home', // Ensure this is the correct action URL
        },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(500).json({ success: false, error: data });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
