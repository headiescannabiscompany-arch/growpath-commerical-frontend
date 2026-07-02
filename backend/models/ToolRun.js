// models/ToolRun.js
const mongoose = require("mongoose");

const ToolRunSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    growId: { type: String, default: null, index: true },
    plantId: { type: String, default: null, index: true },
    cropProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropProfile",
      default: null,
      index: true
    },
    cropIdentity: { type: mongoose.Schema.Types.Mixed, default: null },
    selectedPlantContext: { type: mongoose.Schema.Types.Mixed, default: null },
    plantGrowthProfile: { type: mongoose.Schema.Types.Mixed, default: null },
    toolName: { type: String, required: true, index: true },
    toolType: { type: String, default: "" },
    schemaVersion: { type: Number, default: 1 },
    calculatorVersion: { type: String, default: "legacy" },
    inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "completed", index: true },
    summary: { type: String, default: "" },
    recommendations: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    uncertainty: { type: mongoose.Schema.Types.Mixed, default: null },
    confidence: { type: String, default: null },
    sourceType: { type: String, default: "manual_tool_run", index: true },
    sourceObjectId: { type: String, default: null, index: true },
    linkedLogId: { type: String, default: null },
    linkedTaskIds: { type: [String], default: [] },
    linkedTaskId: { type: String, default: null },
    linkedDiagnosisId: { type: String, default: null },
    linkedRecipeId: { type: String, default: null },
    sourceIntegrationId: { type: String, default: null },
    archivedAt: { type: Date, default: null, index: true },
    immutableSnapshot: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

ToolRunSchema.pre("validate", function normalizeAliases(next) {
  this.toolType = this.toolType || this.toolName;
  this.toolName = this.toolName || this.toolType;
  this.inputs =
    this.inputs && Object.keys(this.inputs).length
      ? this.inputs
      : this.input && Object.keys(this.input).length
        ? this.input
        : this.params;
  this.input = this.input && Object.keys(this.input).length ? this.input : this.inputs;
  this.params =
    this.params && Object.keys(this.params).length ? this.params : this.inputs;
  this.outputs =
    this.outputs && Object.keys(this.outputs).length
      ? this.outputs
      : this.output && Object.keys(this.output).length
        ? this.output
        : this.result;
  this.output =
    this.output && Object.keys(this.output).length ? this.output : this.outputs;
  this.result =
    this.result && Object.keys(this.result).length ? this.result : this.outputs;
  this.schemaVersion = Number.isFinite(Number(this.schemaVersion))
    ? Number(this.schemaVersion)
    : 1;
  this.calculatorVersion = String(this.calculatorVersion || "legacy");
  if (!this.immutableSnapshot) {
    this.immutableSnapshot = {
      toolName: this.toolName,
      toolType: this.toolType,
      growId: this.growId || null,
      plantId: this.plantId || null,
      cropProfileId: this.cropProfileId ? String(this.cropProfileId) : null,
      cropIdentity: this.cropIdentity || null,
      selectedPlantContext: this.selectedPlantContext || null,
      plantGrowthProfile: this.plantGrowthProfile || null,
      schemaVersion: this.schemaVersion,
      calculatorVersion: this.calculatorVersion,
      inputs: this.inputs || {},
      outputs: this.outputs || {},
      warnings: this.warnings || [],
      recommendations: this.recommendations || []
    };
  }
  next();
});

module.exports = mongoose.model("ToolRun", ToolRunSchema);
