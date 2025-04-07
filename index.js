import express from "express";
import cors from "cors";
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*"
}));

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

// Helper to get an OAuth2 access token
async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain access token");
  return token;
}

// Your endpoint for sending notifications
app.post("/send-notification", async (req, res) => {
  console.log("⇨ [send‑notification] incoming body:", req.body);

  try {
    const { token, title, body } = req.body;
    if (!token || !title || !body) {
      console.warn("↳ missing fields:", { token, title, body });
      return res.status(400).json({ error: "token, title and body are required" });
    }

    // before you call getAccessToken(), log the projectId
    console.log("↳ using projectId:", process.env.FIREBASE_PROJECT_ID);

    const accessToken = await getAccessToken();
    console.log("↳ got accessToken:", accessToken?.slice(0, 10) + "…");

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            to: token,
            notification: {
              title: title,
              body: body
            }
          }),
      }
    );

    let data;
    try {
      const text = await fcmRes.text();
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("[send-notification] Failed to parse JSON response:", err);
      data = {};
    }
    console.log("↳ FCM response:", fcmRes.status, data);

    if (!fcmRes.ok) throw new Error(JSON.stringify(data));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("‼️ [send‑notification] error:", err);
    return res.status(500).json({ error: err.message || err });
  }
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
  console.log(`✅ FCM backend listening on http://localhost:${PORT}`);
});
