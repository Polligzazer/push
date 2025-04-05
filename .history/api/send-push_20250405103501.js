import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token, title, body } = req.body;
  const SERVER_KEY = process.env.FCM_SERVER_KEY;

  if (!SERVER_KEY) {
    return res.status(500).json({ error: 'FCM_SERVER_KEY is missing' });
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
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
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(500).json({ success: false, error: data });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
