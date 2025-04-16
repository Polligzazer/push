const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

import cors from "cors";

const allowedOrigins = [
  "https://gf62g0b4-5173.asse.devtunnels.ms",
  "http://localhost:5173",
  "https://17l4wdjp-5173.asse.devtunnels.ms",
  "https://flo-ph-vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(bodyParser.json());

// Parse allowed client URLs from .env
const allowedClientURLs = process.env.CLIENT_URLS.split(",").map(url => url.trim());
const defaultClientURL = process.env.DEFAULT_CLIENT_URL;

// Helper to determine the client URL based on the request's origin
const getClientURL = (req) => {
  const origin = req.headers.origin;
  if (allowedClientURLs.includes(origin)) {
    return origin;
  }
  return defaultClientURL;
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require(path.join(__dirname, "serviceAccountKey.json"))),
});

// Endpoint to generate a password reset link
app.post("/generate-reset-link", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  // Determine the client URL based on request origin
  const clientURL = getClientURL(req);

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${clientURL}/reset-password`,
      handleCodeInApp: true,
    });
    
    // Optional: trigger push notification here
    // pushNotification.send(email, "Password Reset", "A password reset link has been generated for your account");

    return res.json({ resetLink });
  } catch (error) {
    console.error("Error generating reset link:", error);
    return res.status(500).json({ error: "Failed to generate reset link" });
  }
});

// Endpoint to generate an email verification link
app.post("/generate-verification-link", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const clientURL = getClientURL(req);

  try {
    const verificationLink = await admin.auth().generateEmailVerificationLink(email, {
      url: `${clientURL}/verify-email`,
      handleCodeInApp: true,
    });

    // Optional: trigger push notification here if needed
    // pushNotification.send(email, "Email Verification", "Your email verification link is ready");

    return res.json({ verificationLink });
  } catch (error) {
    console.error("Error generating verification link:", error);
    return res.status(500).json({ error: "Failed to generate verification link" });
  }
});

// (Optional) Endpoint to generate an email sign-in link
app.post("/generate-signin-link", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const clientURL = getClientURL(req);

  try {
    const signInLink = await admin.auth().generateSignInWithEmailLink(email, {
      url: `${clientURL}/email-signin`,
      handleCodeInApp: true,
    });

    return res.json({ signInLink });
  } catch (error) {
    console.error("Error generating sign-in link:", error);
    return res.status(500).json({ error: "Failed to generate sign-in link" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
