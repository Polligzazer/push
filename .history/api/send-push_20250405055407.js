// api/send-push.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, title, body } = req.body;

  const SERVER_KEY = "BFxv9dfRXQRt-McTvigYKqvpsMbuMdEJTgVqnb7gsql1kljrxNbZmTA_woI4ngYveFGsY5j33IImXJfiYLHBO3w"; // 🔒 NEVER expose this in frontend!

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          click_action: "/home",
        },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(500).json({ success: false, error: data });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
