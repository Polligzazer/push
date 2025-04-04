const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: [
    'https://flo-ph.vercel.app',
    'https://17l4wdjp-5173.asse.devtunnels.ms'
  ], // Replace with your frontend domain
  methods: 'GET, POST, PUT, DELETE',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true
}));

// Store your FCM server key securely (e.g., in an environment variable)
const SERVER_KEY = process.env.FCM_SERVER_KEY;

app.post('/send-push', async (req, res) => {
  const { token, title, body } = req.body;

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      mode: 'no-cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${SERVER_KEY}`
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          click_action: '/home'
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(500).json({ success: false, error: data });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});