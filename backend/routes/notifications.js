const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Notification = require("../models/Notification");

// GET /api/notifications
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const items = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load notifications" });
  }
});

// POST /api/notifications/read/:id
router.post("/read/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;

    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Notification not found" });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

module.exports = router;
