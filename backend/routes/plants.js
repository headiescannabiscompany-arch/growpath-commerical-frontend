const express = require("express");
const router = express.Router();
const Plant = require("../models/Plant");
const GrowLog = require("../models/GrowLog");
const auth = require("../middleware/auth");
const proOnly = require("../middleware/proOnly");

// Create plant
router.post("/", auth, async (req, res) => {
  try {
    // Free users limited to 1 plant
    if (!req.user.isPro) {
      const count = await Plant.countDocuments({ user: req.userId });
      if (count >= 1) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Free users can only create 1 plant. Upgrade to PRO."
          });
      }
    }

    const plant = await Plant.create({
      user: req.userId,
      name: req.body.name,
      strain: req.body.strain,
      growMedium: req.body.growMedium,
      startDate: req.body.startDate || new Date(),
      notes: req.body.notes || ""
    });
    res.json(plant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List plants for user
router.get("/", auth, async (req, res) => {
  try {
    const plants = await Plant.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(plants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get plant + its logs
router.get("/:id", auth, async (req, res) => {
  try {
    const plant = await Plant.findOne({ _id: req.params.id, user: req.userId });
    if (!plant) return res.status(404).json({ message: "Not found" });
    const logs = await GrowLog.find({ plant: plant._id }).sort({ date: 1 });
    res.json({ plant, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function detectStage(plant, log) {
  const start = plant.startDate ? new Date(plant.startDate) : new Date();
  const now = log.date ? new Date(log.date) : new Date();
  const days = (now - start) / (1000 * 60 * 60 * 24);
  if (days < 14) return "Seedling";
  if (days < 35) return "Vegetative";
  if (days < 70) return "Flower";
  return plant.stage;
}

// Create log for plant + detect stage
router.post("/:id/logs", auth, async (req, res) => {
  try {
    const plant = await Plant.findOne({ _id: req.params.id, user: req.userId });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const logData = {
      user: req.userId,
      plant: plant._id,
      date: req.body.date || new Date(),
      note: req.body.note,
      photos: req.body.photos || [],
      heightCm: req.body.heightCm,
      environment: req.body.environment,
      stageOverride: req.body.stageOverride || null
    };

    const log = await GrowLog.create(logData);

    if (!log.stageOverride) {
      const newStage = detectStage(plant, log);
      if (newStage && newStage !== plant.stage) {
        plant.stage = newStage;
        await plant.save();
      }
    }

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stats for charts
router.get("/:id/stats", auth, async (req, res) => {
  try {
    const plant = await Plant.findOne({ _id: req.params.id, user: req.userId });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const logs = await GrowLog.find({ plant: plant._id }).sort({ date: 1 });

    const growthSeries = logs
      .filter((l) => typeof l.heightCm === "number")
      .map((l) => ({ date: l.date, heightCm: l.heightCm }));

    res.json({ plant, growthSeries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export plant data as PDF
router.get("/:id/export", auth, async (req, res) => {
  try {
    const plant = await Plant.findOne({ _id: req.params.id, user: req.userId });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const logs = await GrowLog.find({ plant: plant._id }).sort({ date: 1 });

    const { generatePlantPDF } = require("../utils/growExport");
    const fs = require("fs");
    const path = require("path");

    // Ensure exports directory exists
    const exportsDir = path.join(__dirname, "..", "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const filename = `plant-${plant._id}-${Date.now()}.pdf`;
    const outputPath = path.join(exportsDir, filename);

    await generatePlantPDF(plant, logs, outputPath);

    res.download(outputPath, `${plant.name}-grow-report.pdf`, (err) => {
      // Clean up file after download
      if (err) {
        console.error("Download error:", err);
      }
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error("Cleanup error:", unlinkErr);
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
