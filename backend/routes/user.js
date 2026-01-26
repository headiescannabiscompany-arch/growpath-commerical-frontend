// backend/routes/user.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// PATCH /api/user/interests
router.patch(
  "/interests",
  /*auth,*/ async (req, res) => {
    try {
      // const userId = req.user?.id || req.user?._id || req.userId; // Use real auth in prod
      const userId = "user-1"; // Stub: always use demo user
      const { growInterests } = req.body || {};

      if (!Array.isArray(growInterests)) {
        return res.status(400).json({ message: "growInterests must be an array" });
      }

      // In-memory update for stub
      // In real backend: await User.findByIdAndUpdate(...)
      global.mockUser = global.mockUser || {
        id: "user-1",
        email: "demo@growpath.com",
        name: "Demo User",
        plan: "commercial",
        role: "user",
        growInterests: [
          "genetics",
          "living-soil",
          "hydroponics",
          "blueberry",
          "tissue-culture",
          "indoor"
        ]
      };
      global.mockUser.growInterests = growInterests;

      return res.json({ success: true, user: global.mockUser });
    } catch (err) {
      return res.status(500).json({ message: "Failed to update interests" });
    }
  }
);

// GET /api/auth/me -- canonical user contract
const { resolveCapabilities } = require("../entitlements/capabilityPolicy");

router.get("/auth/me", auth, async (req, res) => {
  try {
    // In production, use real user from auth middleware
    const user = global.mockUser || {
      id: req.user?.id || "user-1",
      email: "demo@growpath.com",
      plan: "commercial",
      mode: "commercial",
      selectedFacilityId: null,
      facilityRole: null
      // ...other fields as needed
    };

    // Canonical capability resolution
    const capabilities = resolveCapabilities(user);
    // Example limits (could be expanded)
    const limits = { maxRooms: 5, maxTeam: 10 };

    res.json({
      user: {
        id: user.id,
        email: user.email
      },
      session: {
        plan: user.plan,
        mode: user.mode,
        facilityId: user.selectedFacilityId || null,
        facilityRole: user.facilityRole || null
      },
      entitlements: {
        capabilities,
        limits
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to resolve user contract" });
  }
});

module.exports = router;
