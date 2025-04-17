export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, title, body } = req.body;
    if (!token || !title || !body) {
      console.error("Missing data in request:", { token, title, body });
      return res.status(400).json({
        error: "Missing required fields: token, title, and body are required",
      });
    }

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
    console.log("Access token retrieved:", accessToken.token ? "✅" : "❌");

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
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
    console.error("🔥 Internal Server Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
