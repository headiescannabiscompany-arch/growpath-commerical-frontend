const express = require("express");
const router = express.Router();
const Certificate = require("../models/Certificate");
const auth = require("../middleware/auth");

// GET user's certificates
router.get("/mine", auth, async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.userId })
      .populate("course", "title")
      .sort({ completedAt: -1 });

    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET certificate by ID (public verification)
router.get("/verify/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await Certificate.findOne({ certificateId })
      .populate("user", "fullName username")
      .populate("course", "title");

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found", valid: false });
    }

    res.json({
      valid: true,
      student: certificate.user.fullName || certificate.user.username,
      course: certificate.course.title,
      completedAt: certificate.completedAt,
      certificateId: certificate.certificateId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message, valid: false });
  }
});

module.exports = router;
