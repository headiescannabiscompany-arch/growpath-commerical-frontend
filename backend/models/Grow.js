const mongoose = require("mongoose");

const LightSchema = new mongoose.Schema(
  {
    ppfd: String,
    dli: String,
    model: String,
    distance: String,
    spectrum: String
  },
  { _id: false }
);

const WaterSchema = new mongoose.Schema(
  {
    source: String,
    treatment: String,
    ph: String,
    ppm: String
  },
  { _id: false }
);

const AirSchema = new mongoose.Schema(
  {
    temperature: String,
    humidity: String,
    airflow: String
  },
  { _id: false }
);

const NutrientSchema = new mongoose.Schema(
  {
    brand: String,
    strength: String,
    schedule: String
  },
  { _id: false }
);

const SubstrateSchema = new mongoose.Schema(
  {
    type: String,
    ph: String
  },
  { _id: false }
);

const EnvironmentSchema = new mongoose.Schema(
  {
    light: LightSchema,
    water: WaterSchema,
    air: AirSchema,
    nutrients: NutrientSchema,
    substrate: SubstrateSchema
  },
  { _id: false }
);

const GrowSchema = new mongoose.Schema(
  {
    // Contract-safe: allow both user and userId as String
    userId: { type: String, index: true }, // preferred in contract + legacy
    user: { type: String, index: true }, // backward compat (some code uses `user`)

    facilityId: { type: String, required: false, index: true },

    // Deterministic string id for contract tests (optional)
    growId: { type: String, index: true },

    name: { type: String, required: true },
    strain: { type: String },
    cultivar: { type: String },
    breeder: { type: String },
    photo: { type: String },
    photoUrl: { type: String },
    photos: { type: [String], default: [] },
    stage: { type: String },
    notes: { type: String },
    growTags: { type: [String], default: [] },
    growInterests: { type: mongoose.Schema.Types.Mixed, default: {} },
    cropTypes: { type: [String], default: [] },
    environmentTypes: { type: [String], default: [] },
    growingMethods: { type: [String], default: [] },
    draftSource: { type: String, enum: ["manual", "ai_assistant"], default: "manual" },
    planning: { type: mongoose.Schema.Types.Mixed, default: {} },
    environment: EnvironmentSchema,
    startDate: { type: Date },
    germinationDate: { type: Date },
    cloneCutDate: { type: Date },
    transplantDate: { type: Date },
    systemPreset: { type: String },
    anchorDateType: { type: String },
    anchorDate: { type: Date },
    timezone: { type: String },
    flipDate: { type: Date },
    flowerDay1Date: { type: Date },
    expectedHarvestDate: { type: Date },
    actualHarvestDate: { type: Date },
    dryStartDate: { type: Date },
    cureStartDate: { type: Date },
    potSize: { type: String },
    potCount: { type: Number },
    targetVpdBand: { type: String },

    title: { type: String },
    body: { type: String },

    visibility: {
      type: String,
      enum: ["private", "facility", "public", "archived"],
      default: "private",
      index: true
    },

    // Keep both patterns around; different suites reference different fields
    archivedAt: { type: Date, default: null, index: true },
    archived: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

// Normalize writes so either user/userId works consistently
GrowSchema.pre("validate", function (next) {
  if (!this.userId && this.user) this.userId = String(this.user);
  if (!this.user && this.userId) this.user = String(this.userId);
  next();
});

module.exports = mongoose.model("Grow", GrowSchema);
