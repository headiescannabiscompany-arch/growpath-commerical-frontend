"use strict";

const mongoose = require("mongoose");

const CalendarEventSchema = new mongoose.Schema(
  {
    facilityId: { type: String, required: true, index: true },
    growId: { type: String, required: true, index: true },

    type: { type: String, required: true }, // HARVEST_WINDOW, TOPDRESS, etc.
    title: { type: String, required: true },

    date: { type: Date, required: true, index: true },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    deletedAt: { type: Date, default: null, index: true }
  },
  {
    timestamps: true,
    minimize: false
  }
);

CalendarEventSchema.index({ facilityId: 1, growId: 1, deletedAt: 1, date: 1 });

module.exports =
  mongoose.models.CalendarEvent || mongoose.model("CalendarEvent", CalendarEventSchema);
