// /api/send-push.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, title, body } = req.body;

  const SERVER_KEY = process.env.FCM_SERVER_KEY;

  if (!SERVER_KEY) {
    console.error("❌ Missing FCM_SERVER_KEY");
    return res.status(500).json({ error: 'FCM_SERVER_KEY is missing' });
  }

  try {
    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
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

    const data = await fcmRes.json();

    if (fcmRes.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      console.error("❌ FCM error", data);
      return res.status(500).json({ success: false, error: data });
    }
  } catch (err) {
    console.error("❌ Unexpected error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
