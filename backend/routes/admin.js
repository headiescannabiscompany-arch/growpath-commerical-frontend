const express = require("express");
const router = express.Router();
const Earning = require("../models/Earning");
const auth = require("../middleware/auth");

// Mark all unpaid earnings for a creator as paid
// Note: In production, add isAdmin middleware to verify requester is admin
router.post("/mark-paid/:creatorId", auth, async (req, res) => {
  try {
    const creatorId = req.params.creatorId;

    const result = await Earning.updateMany(
      { creator: creatorId, paidOut: false },
      { $set: { paidOut: true } }
    );

    res.json({ 
      message: "Marked as paid",
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
