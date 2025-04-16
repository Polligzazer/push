import { GoogleAuth } from "google-auth-library";

export default async function handler(req, res) {
  // ─── CORS Configuration ────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Validate request method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ─── Validate Input ──────────────────────────────────────────────────────
    const { token, title, body } = req.body;
    if (!token || !title || !body) {
      return res.status(400).json({
        error: "Missing required fields: token, title, and body are required",
      });
    }

    // ─── Google Auth Setup (Vercel-compatible) ───────────────────────────────
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8")
    );

    const auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // ─── FCM Request ─────────────────────────────────────────────────────────
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("Firebase project ID not configured");
    }

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: title,
              body: body,
            },
          },
        }),
      }
    );

    // ─── Handle FCM Response ─────────────────────────────────────────────────
    if (!fcmResponse.ok) {
      const errorData = await fcmResponse.json();
      console.error("FCM Error:", errorData);
      return res.status(fcmResponse.status).json({
        error: "Failed to send notification",
        details: errorData,
      });
    }

    const responseData = await fcmResponse.json();
    return res.status(200).json({
      success: true,
      messageId: responseData.name,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}