import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import serverlessExpress from '@vendia/serverless-express';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const SERVER_KEY = process.env.FCM_SERVER_KEY;

app.post('/', async (req, res) => {
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
          click_action: '/home',
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

// ✅ Export the handler for Vercel
export default serverlessExpress({ app });
