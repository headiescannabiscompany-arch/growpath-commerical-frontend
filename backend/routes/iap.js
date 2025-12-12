const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

let apple;
try {
  apple = require("node-apple-receipt-verify");
  apple.config({
    secret: process.env.APPLE_SHARED_SECRET
  });
} catch (err) {
  console.log("Apple verification module not installed - install with: npm install node-apple-receipt-verify");
}

const googleVerify = require("../utils/googleVerify");

router.post("/verify", auth, async (req, res) => {
  try {
    const { receipt, platform } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (platform === "ios") {
      if (!apple) {
        return res.status(500).json({ error: "Apple verification not configured" });
      }

      try {
        const validation = await apple.validate({ receipt });
        const isActive = apple.isValidLatest(validation);

        if (isActive) {
          user.plan = "pro";
          user.subscriptionStatus = "active";
          await user.save();
          return res.json({ ok: true });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid receipt: " + err.message });
      }
    }

    if (platform === "android") {
      try {
        const verified = await googleVerify(receipt);
        if (verified.active) {
          user.plan = "pro";
          user.subscriptionStatus = "active";
          await user.save();
          return res.json({ ok: true });
        }
      } catch (err) {
        return res.status(400).json({ error: "Android verification failed: " + err.message });
      }
    }

    return res.status(400).json({ error: "Verification failed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
