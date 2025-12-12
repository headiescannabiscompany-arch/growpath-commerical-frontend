const express = require("express");
const router = express.Router();
const Enrollment = require("../models/Enrollment");
const Earning = require("../models/Earning");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const auth = require("../middleware/auth");
const multer = require("multer");

// Configure multer for signature uploads
const upload = multer({
  dest: "uploads/signatures/",
  limits: { fileSize: 1024 * 1024 } // 1MB limit
});

// GET total and monthly earnings
router.get("/earnings", auth, async (req, res) => {
  const userId = req.userId;

  // all earnings
  const all = await Earning.find({ creator: userId });

  // monthly earnings
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthly = all.filter((e) => e.createdAt >= startOfMonth);

  const totalRevenue = all.reduce((sum, e) => sum + e.amount, 0);
  const monthlyRevenue = monthly.reduce((sum, e) => sum + e.amount, 0);

  const totalPlatformFees = all.reduce((sum, e) => sum + e.platformFee, 0);

  res.json({
    totalRevenue,
    monthlyRevenue,
    totalPlatformFees,
    earningsCount: all.length
  });
});

// GET course performance
router.get("/courses", auth, async (req, res) => {
  const courses = await Course.find({ creator: req.userId })
    .populate("students", "_id")
    .sort({ createdAt: -1 });

  res.json(
    courses.map((c) => ({
      id: c._id,
      title: c.title,
      enrollments: c.students.length,
      rating: c.rating,
      ratingCount: c.ratingCount,
      price: c.price
    }))
  );
});

// GET enrollment timeline
router.get("/enrollment-timeline", auth, async (req, res) => {
  const enrollments = await Enrollment.find({}).populate("course");

  const creatorEnrollments = enrollments.filter(
    (e) => e.course.creator.toString() === req.userId
  );

  const timeline = {};

  creatorEnrollments.forEach((e) => {
    const d = new Date(e.createdAt).toISOString().split("T")[0];
    timeline[d] = (timeline[d] || 0) + 1;
  });

  res.json(timeline);
});

// GET payout summary
router.get("/payout-summary", auth, async (req, res) => {
  const creatorId = req.userId;

  const earnings = await Earning.find({ creator: creatorId });

  const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = earnings
    .filter((e) => e.paidOut)
    .reduce((sum, e) => sum + e.amount, 0);
  const availableForPayout = earnings
    .filter((e) => !e.paidOut)
    .reduce((sum, e) => sum + e.amount, 0);

  res.json({
    totalEarned,
    totalPaid,
    availableForPayout
  });
});

// GET payout history
router.get("/payout-history", auth, async (req, res) => {
  const creatorId = req.userId;

  const earnings = await Earning.find({ creator: creatorId })
    .populate("enrollment")
    .sort({ createdAt: -1 });

  res.json(earnings);
});

// POST signature upload
router.post("/signature", auth, upload.single("signature"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const signatureUrl = `/uploads/signatures/${req.file.filename}`;

    await User.findByIdAndUpdate(req.userId, {
      signatureUrl: signatureUrl
    });

    res.json({
      success: true,
      url: signatureUrl,
      message: "Signature uploaded successfully"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET course analytics
router.get("/course/:courseId/analytics", auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify creator owns this course
    const course = await Course.findById(courseId);
    if (!course || course.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 });

    const analytics = lessons.map((l) => {
      const avgWatchTime =
        l.analytics.uniqueViews > 0
          ? Math.floor(l.analytics.totalWatchTime / l.analytics.uniqueViews)
          : 0;

      const completionRate =
        l.analytics.uniqueViews > 0
          ? Math.round((l.analytics.completedCount / l.analytics.uniqueViews) * 100)
          : 0;

      return {
        id: l._id,
        title: l.title,
        views: l.analytics.views,
        uniqueViews: l.analytics.uniqueViews,
        avgWatchTime,
        completionRate,
        dropoffPoints: l.analytics.dropoffPoints
      };
    });

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET revenue timeline (for line chart)
router.get("/revenue-timeline", auth, async (req, res) => {
  try {
    const earnings = await Earning.find({ creator: req.userId }).sort({
      createdAt: 1
    });

    const timeline = {};

    earnings.forEach((e) => {
      const day = e.createdAt.toISOString().split("T")[0];
      timeline[day] = (timeline[day] || 0) + e.amount;
    });

    res.json(timeline);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
