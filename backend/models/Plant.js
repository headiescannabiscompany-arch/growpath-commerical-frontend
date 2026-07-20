"use strict";

const mongoose = require("mongoose");

const PlantSchema = new mongoose.Schema(
  {
    // Multi-tenant scope (optional in personal mode)
    facilityId: { type: String, required: false, index: true },

    // Owner identity (acceptance tests query by `user: ObjectId`)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true
    },

    // Back-compat (some legacy flows may use string user ids)
    userId: { type: String, required: false, index: true },

    // Grow linkage (acceptance/legacy tests check these)
    growId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grow",
      default: null,
      index: true
    },
    grow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grow",
      default: null,
      index: true
    },
    growIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grow",
        default: null
      }
    ],

    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },

    // Core identity
    tag: { type: String, default: "", index: true },
    name: { type: String, default: "" },
    strain: { type: String, default: "" },
    cultivar: { type: String, default: "" },
    scientificName: { type: String, default: "" },
    cropCommonName: { type: String, default: "" },
    commonNames: { type: [String], default: [] },
    cropIdentity: { type: mongoose.Schema.Types.Mixed, default: null },
    cropIdentityConfirmedAt: { type: Date, default: null },
    cropProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropProfile",
      default: null,
      index: true
    },
    stage: { type: String, default: "" },
    photos: { type: [String], default: [] },
    video: { type: String, default: "" },

    // Soft delete / active flag
    deletedAt: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

/**
 * Sync hook:
 * - If user exists -> set userId
 * - If userId is an ObjectId -> set user
 */
PlantSchema.pre("validate", function (next) {
  try {
    if (this.user && !this.userId) this.userId = String(this.user);
    if (!this.user && this.userId && mongoose.isValidObjectId(String(this.userId))) {
      this.user = new mongoose.Types.ObjectId(String(this.userId));
    }
    next();
  } catch (e) {
    next(e);
  }
});

// Helpful compound indexes
PlantSchema.index({ facilityId: 1, deletedAt: 1 });
PlantSchema.index({ facilityId: 1, roomId: 1, deletedAt: 1 });
PlantSchema.index({ user: 1, deletedAt: 1 });
PlantSchema.index({ growId: 1, deletedAt: 1 });
PlantSchema.index({ user: 1, cropProfileId: 1, deletedAt: 1 });

module.exports = mongoose.model("Plant", PlantSchema);
