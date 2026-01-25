// backend/sendPush.js
// Minimal Expo push delivery helper for demo
const fetch = require("node-fetch");

async function sendPush(to, title, body, data) {
  if (!to) return;
  // Expo push endpoint
  const expoUrl = "https://exp.host/--/api/v2/push/send";
  const message = {
    to,
    sound: "default",
    title,
    body,
    data
  };
  try {
    await fetch(expoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
  } catch (e) {
    // Log or ignore
  }
}

module.exports = sendPush;
