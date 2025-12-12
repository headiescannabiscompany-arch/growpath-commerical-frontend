const express = require("express");
const router = express.Router();
const fs = require("fs");
const OpenAI = require("openai");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const proOnly = require("../middleware/proOnly");
const Template = require("../models/Template");

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const feedPrompt = `
You are an expert cannabis horticulture nutrient analyst.

Given a nutrient bottle label (photo or text), extract EXACTLY the following JSON format:

{
  "productName": "",
  "npk": { "n": 0, "p": 0, "k": 0 },
  "micros": {
    "calcium": "", "magnesium": "", "iron": "", "sulfur": "",
    "copper": "", "zinc": "", "boron": "", "manganese": "", "molybdenum": ""
  },
  "recommendedDose": {
    "seedling": "",
    "veg": "",
    "earlyFlower": "",
    "midFlower": "",
    "lateFlower": ""
  },
  "notes": ""
}

Rules:
- If a value is unknown, leave it blank ("").
- Values should be text EXACTLY as stated on the bottle.
- DO NOT add commentary.
- ALWAYS output valid JSON.
`;

// Label OCR + parse
router.post("/label", auth, proOnly, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Photo required" });
    const imageBuffer = fs.readFileSync(req.file.path);

    const result = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        { role: "system", content: feedPrompt },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Extract nutrient information from this label." },
            { type: "input_image", image_url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}` }
          ]
        }
      ]
    });

    const parsed = JSON.parse(result.choices[0].message.content);
    res.json({ success: true, nutrientData: parsed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Label extraction failed" });
  }
});

// Feeding schedule generator
router.post("/schedule", auth, proOnly, async (req, res) => {
  const { nutrientData, growMedium, strainType, experience, weeks } = req.body;

  const schedulePrompt = `
Generate a cannabis feeding schedule using the following nutrient data:

${JSON.stringify(nutrientData, null, 2)}

Grow medium: ${growMedium}
Strain type: ${strainType}
Experience: ${experience}
Weeks of plan: ${weeks}

Format STRICTLY in JSON:

{
  "schedule": [
    {
      "week": 1,
      "stage": "",
      "feed": {
        "amountPerGallon": "",
        "ecTarget": "",
        "ppmTarget": "",
        "notes": ""
      },
      "warnings": []
    }
  ],
  "overallStrategy": ""
}

Rules:
- Adjust NPK and micros appropriately for each stage.
- Use lower feeding for autos unless told otherwise.
- If hydro, include EC/PPM targets.
- Keep values realistic.
- Do not add commentary outside JSON.
  `;

  try {
    const result = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
      messages: [{ role: "system", content: schedulePrompt }]
    });

    const json = JSON.parse(result.choices[0].message.content);
    res.json({ success: true, schedule: json });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Schedule generation failed" });
  }
});

// Convert schedule to Template
router.post("/schedule/to-template", auth, proOnly, async (req, res) => {
  try {
    const { title, schedule, growMedium, strain } = req.body;

    const steps = (schedule.schedule || []).map((week) => ({
      day: (week.week - 1) * 7,
      label: `Feeding - Week ${week.week}`,
      stage: week.stage,
      actionType: "Feed",
      details: week.feed?.notes,
      nutrients: `Dose: ${week.feed?.amountPerGallon || ""}`
    }));

    const template = await Template.create({
      creator: req.userId,
      title,
      description: "Auto-generated feeding schedule",
      growMedium,
      strain,
      difficulty: "Intermediate",
      durationDays: (schedule.schedule || []).length * 7,
      price: 0,
      tags: ["Feeding", "AI Generated"],
      steps,
    });

    res.json({ success: true, template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Template creation failed" });
  }
});

module.exports = router;
