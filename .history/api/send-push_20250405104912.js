// /api/send-push.js

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FB_PROJECT_ID,
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { token, title, body } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        click_action: "/home",
      }
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ message: "Notification sent", response });
  } catch (error) {
    console.error("🔥 Firebase send error:", error);
    return res.status(500).json({ message: "Failed to send push", error: error.message });
  }
}
