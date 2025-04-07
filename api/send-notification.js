import { GoogleAuth } from "google-auth-library";

// Serverless handler
export default async function handler(req, res) {
  // ─── CORS ─────────────────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // Only POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ─── Payload validation ───────────────────────────────────────────────────────
  const { token, title, body } = req.body || {};
  if (!token || !title || !body) {
    return res
      .status(400)
      .json({ error: "token, title and body are required" });
  }

  try {
    // ─── Get OAuth2 access token ─────────────────────────────────────────────────
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const accessTokenRes = await client.getAccessToken();
    const accessToken = accessTokenRes?.token;
    if (!accessToken) throw new Error("Failed to obtain access token");

    // ─── Call FCM v1 API ─────────────────────────────────────────────────────────
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID env var");

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
          },
        }),
      }
    );

    // ─── Parse response safely ───────────────────────────────────────────────────
    const text = await fcmRes.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!fcmRes.ok) {
      console.error("FCM error:", data);
      return res.status(fcmRes.status).json({ error: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("‼️ send-notification error:", err);
    return res.status(500).json({ error: err.message || err });
  }
}
