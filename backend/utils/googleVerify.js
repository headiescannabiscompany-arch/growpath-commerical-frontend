const { google } = require("googleapis");

module.exports = async function verifyAndroidPurchase(token) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "google-play-key.json",
      scopes: ["https://www.googleapis.com/auth/androidpublisher"]
    });

    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    const res = await androidpublisher.purchases.subscriptions.get({
      packageName: "com.growpathai.app",
      subscriptionId: "growpath_pro_monthly",
      token
    });

    return {
      active: res.data?.paymentState === 1
    };
  } catch (err) {
    console.log("Android verification error:", err.message);
    return { active: false };
  }
};
