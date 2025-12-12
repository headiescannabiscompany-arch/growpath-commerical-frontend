const fetch = require("node-fetch");

async function sendPushNotification(pushToken, message) {
  if (!pushToken) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title: message.title,
        body: message.body,
        data: message.data || {}
      })
    });
  } catch (err) {
    console.log("Push notification error:", err.message);
  }
}

module.exports = { sendPushNotification };
