const express = require("express");
const router = express.Router();
const GrowLog = require("../models/GrowLog");
const auth = require("../middleware/auth");

// AI auto-tagging helper (rule-based, ready for real OpenAI Vision swap)
async function analyzeEntryWithAI(entry) {
  const text = `${entry.notes || ""} ${entry.title || ""}`.toLowerCase();

  const tags = new Set(entry.tags || []);

  // ✅ Simple heuristics (works even before real AI)
  if (text.includes("yellow") || text.includes("chlorosis")) tags.add("yellowing");
  if (text.includes("burn") || text.includes("tip burn")) tags.add("nuteburn");
  if (text.includes("droop") || text.includes("droopy")) tags.add("overwatered");
  if (text.includes("dry") || text.includes("crispy")) tags.add("underwatered");
  if (text.includes("stretch")) tags.add("stretch");
  if (text.includes("calmag")) tags.add("calmag");
  if (text.includes("heat") || text.includes("hot")) tags.add("heatstress");
  if (text.includes("humidity") || text.includes("rh")) tags.add("highhumidity");

  let insight = "AI analysis based on notes:\n";

  if (tags.size === 0) {
    insight += "No clear issues detected from notes. Plants may be healthy.";
  } else {
    insight +=
      "Possible issues detected: " +
      Array.from(tags)
        .map((t) => t.replace(/([a-z])([A-Z])/g, "$1 $2"))
        .join(", ") +
      ".\nThis is a heuristic analysis; confirm visually before adjusting your feed.";
  }

  return {
    tags: Array.from(tags),
    aiInsights: insight
  };
}

// GET all entries for timeline view
router.get("/", auth, async (req, res) => {
  try {
    const entries = await GrowLog.find({ user: req.userId })
      .sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE entry
router.post("/", auth, async (req, res) => {
  try {
    const entry = new GrowLog({
      user: req.userId,
      date: req.body.date,
      title: req.body.title,
      notes: req.body.notes,
      photos: req.body.photos || [],
      stage: req.body.stage,
      week: req.body.week,
      day: req.body.day,
      tags: req.body.tags || [],
      strain: req.body.strain,
      environment: req.body.environment
    });
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single entry
router.get("/:id", auth, async (req, res) => {
  try {
    const entry = await GrowLog.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE entry
router.put("/:id", auth, async (req, res) => {
  try {
    const entry = await GrowLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE entry
router.delete("/:id", auth, async (req, res) => {
  try {
    await GrowLog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// AI auto-tagging for a specific entry
router.post("/:id/auto-tag", auth, async (req, res) => {
  try {
    const entry = await GrowLog.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const result = await analyzeEntryWithAI(entry);

    entry.tags = result.tags;
    entry.aiInsights = result.aiInsights;

    await entry.save();

    res.json(entry);
  } catch (err) {
    console.error("Auto-tag error:", err);
    res.status(500).json({ message: "AI auto-tagging failed" });
  }
});

module.exports = router;
