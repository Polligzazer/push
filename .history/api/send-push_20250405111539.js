import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// CORS middleware to handle all preflight requests
app.use(cors({ origin: '*' }));
app.use(express.json());

// Environment variable for the FCM server key
const SERVER_KEY = process.env.FCM_SERVER_KEY;

// Handle POST requests to /api/send-push
app.post('/api/send-push', async (req, res) => {
  // Destructure the necessary fields from the request body
  const { token, title, body } = req.body;

  // Check if FCM_SERVER_KEY is available
  if (!SERVER_KEY) {
    return res.status(500).json({ error: 'FCM_SERVER_KEY is missing' });
  }

  try {
    // Make the request to Firebase Cloud Messaging (FCM)
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${SERVER_KEY}`, // Server key for authorization
      },
      body: JSON.stringify({
        to: token, // FCM device token
        notification: {
          title,
          body,
          click_action: '/home', // Ensure this is the correct action URL
        },
      }),
    });

    // Parse the response from FCM
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

// Export the app for use in other files (if needed)
export default app;
