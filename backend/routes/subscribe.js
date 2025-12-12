const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Start subscription (trial or paid)
router.post("/start", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { type } = req.body; // "trial" or "paid"

    if (type === "trial") {
      if (user.trialUsed) {
        return res.status(400).json({ success: false, message: "Trial already used" });
      }

      // Start 7-day trial
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      user.subscriptionStatus = "trial";
      user.subscriptionExpiry = expiry;
      user.trialUsed = true;
      await user.save();

      return res.json({ 
        success: true, 
        message: "Trial started",
        isPro: user.isPro,
        status: user.subscriptionStatus,
        expiry: user.subscriptionExpiry
      });
    }

    if (type === "paid") {
      // Start 30-day paid subscription (placeholder - integrate with Stripe/IAP)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      user.subscriptionStatus = "active";
      user.subscriptionExpiry = expiry;
      await user.save();

      return res.json({ 
        success: true, 
        message: "Subscription activated",
        isPro: user.isPro,
        status: user.subscriptionStatus,
        expiry: user.subscriptionExpiry
      });
    }

    return res.status(400).json({ success: false, message: "Invalid subscription type" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel subscription
router.post("/cancel", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subscriptionStatus = "expired";
    await user.save();

    res.json({ 
      success: true, 
      message: "Subscription cancelled",
      isPro: user.isPro,
      status: user.subscriptionStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get subscription status
router.get("/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ 
      success: true,
      isPro: user.isPro,
      status: user.subscriptionStatus,
      expiry: user.subscriptionExpiry,
      trialUsed: user.trialUsed
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
