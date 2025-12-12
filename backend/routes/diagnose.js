const express = require("express");
const router = express.Router();
const fs = require("fs");
const OpenAI = require("openai");
const Diagnosis = require("../models/Diagnosis");
const GrowLog = require("../models/GrowLog");
const auth = require("../middleware/auth");
const proOnly = require("../middleware/proOnly");
const upload = require("../middleware/upload");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// AI prompt for vision-based diagnosis
const diagnosisPrompt = `
You are an expert cannabis horticulture analyzer.
Given a plant photo, respond ONLY in JSON using exactly this structure:

{
  "issues": [
    {
      "name": "Issue name",
      "type": "pest | deficiency | stress | disease | environment",
      "severity": "low | medium | high",
      "confidence": 0-100,
      "symptomsObserved": [],
      "recommendedActions": []
    }
  ],
  "overallHealth": "excellent | good | moderate | poor",
  "notes": ""
}

Rules:
- If no issue is present, return an empty issues array.
- Use cannabis-specific details.
- Always output valid JSON.
`;

// SIMPLE heuristic AI helper – can be swapped for real model later
function analyzeDiagnosisAI({ notes = "", tags = [], stage }) {
  const text = (notes || "").toLowerCase();
  const allTags = new Set(tags || []);

  let issueSummary = "General plant health check";
  let severity = 1;
  const actions = [];
  let explanation = "";

  // Very simple heuristic rules
  if (text.includes("yellow") || text.includes("pale")) {
    allTags.add("yellowing");
    issueSummary = "Possible nutrient deficiency";
    severity = Math.max(severity, 3);
    actions.push("Check pH and EC of your feed and runoff.");
    actions.push("Ensure adequate nitrogen and micronutrients.");
  }

  if (text.includes("burn") || text.includes("tip burn")) {
    allTags.add("nuteburn");
    issueSummary = "Possible nutrient burn";
    severity = Math.max(severity, 3);
    actions.push("Reduce nutrient strength 25–50% for next watering.");
    actions.push("Consider a light flush if medium is hot.");
  }

  if (text.includes("droop") || text.includes("droopy")) {
    allTags.add("overwatered");
    issueSummary = "Possible overwatering";
    severity = Math.max(severity, 2);
    actions.push("Allow pot to dry out more between waterings.");
    actions.push("Ensure good drainage and adequate airflow.");
  }

  if (text.includes("crispy") || text.includes("dry")) {
    allTags.add("underwatered");
    issueSummary = "Possible underwatering or heat stress";
    severity = Math.max(severity, 3);
    actions.push("Water thoroughly and check soil moisture patterns.");
    actions.push("Check canopy temperature and distance to lights.");
  }

  if (text.includes("mildew") || text.includes("powdery")) {
    allTags.add("powdery mildew");
    issueSummary = "Possible powdery mildew";
    severity = Math.max(severity, 4);
    actions.push("Remove heavily infected leaves if possible.");
    actions.push("Increase airflow and reduce humidity.");
    actions.push("Consider an appropriate IPM product safe for late flower stage.");
  }

  if (severity === 1) {
    issueSummary = "No obvious issue detected";
    actions.push("Monitor plants over the next few days.");
    actions.push("Keep environment in stable target ranges.");
  }

  explanation =
    "This diagnosis is based on keywords in your description and tagged symptoms. " +
    "Treat it as a starting point and always confirm visually before making major changes.";

  return {
    issueSummary,
    severity,
    tags: Array.from(allTags),
    aiExplanation: explanation,
    aiActions: actions
  };
}

// Vision-based diagnosis using OpenAI
router.post("/", auth, proOnly, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Photo is required" });
    const imageBuffer = fs.readFileSync(req.file.path);

    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [
        { role: "system", content: diagnosisPrompt },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this cannabis plant photo." },
            { type: "input_image", image_url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}` }
          ]
        }
      ]
    });

    const diagnostics = JSON.parse(result.choices[0].message.content);

    res.json({ success: true, diagnostics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Analysis failed" });
  }
});

// POST /diagnose/analyze
router.post("/analyze", auth, async (req, res) => {
  try {
    const { photos = [], notes = "", stage, strain, fromGrowLogId } = req.body;

    // Run heuristic AI (or plug real AI here)
    const aiResult = analyzeDiagnosisAI({ notes, stage });

    const doc = await Diagnosis.create({
      user: req.userId,
      photos,
      notes,
      stage,
      strain,
      fromGrowLogId: fromGrowLogId || null,
      ...aiResult
    });

    return res.json(doc);
  } catch (err) {
    console.error("Diagnosis error:", err);
    res.status(500).json({ message: "Diagnosis failed" });
  }
});

// GET /diagnose/history
router.get("/history", auth, async (req, res) => {
  const history = await Diagnosis.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(history);
});

// GET /diagnose/:id
router.get("/:id", auth, async (req, res) => {
  const diag = await Diagnosis.findOne({
    _id: req.params.id,
    user: req.userId
  });
  if (!diag) return res.status(404).json({ message: "Not found" });
  res.json(diag);
});

module.exports = router;
