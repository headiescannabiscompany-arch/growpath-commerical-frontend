"use strict";

const mongoose = require("mongoose");

const TelemetryPointSchema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TelemetrySource",
      required: true,
      index: true
    },
    ts: { type: Date, required: true, index: true },
    airTempC: { type: Number, required: true },
    rh: { type: Number, required: true },
    leafTempC: { type: Number, default: null },
    canopyTempC: { type: Number, default: null },
    canopyRh: { type: Number, default: null },
    dewPointC: { type: Number, required: true },
    vpdKpa: { type: Number, default: null },
    co2Ppm: { type: Number, default: null },
    lightLux: { type: Number, default: null },
    ppfd: { type: Number, default: null },
    airPressureHpa: { type: Number, default: null },
    voc: { type: Number, default: null }
  },
  { timestamps: true }
);

TelemetryPointSchema.index({ sourceId: 1, ts: 1 }, { unique: true });

module.exports = mongoose.model("TelemetryPoint", TelemetryPointSchema);
