"use strict";

const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    uploaderUserId: { type: String, required: true, index: true },
    workspaceType: {
      type: String,
      enum: ["personal", "commercial", "facility"],
      required: true,
      index: true
    },
    workspaceId: { type: String, required: true, index: true },
    ownerDisplayName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "deleted"],
      default: "draft",
      index: true
    },
    visibility: {
      type: String,
      enum: [
        "public",
        "followers",
        "unlisted",
        "private",
        "course_only",
        "facility_internal"
      ],
      default: "private",
      index: true
    },
    mediaSource: { type: mongoose.Schema.Types.Mixed, required: true },
    thumbnailUrl: { type: String, default: "" },
    durationSeconds: { type: Number, default: 0, min: 0 },
    storageBytes: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, default: "" },
    tags: { type: [String], default: [] },
    growInterests: { type: [String], default: [] },
    cannabisSpecific: { type: Boolean, default: false, index: true },
    transcriptText: { type: String, default: "" },
    captionsText: { type: String, default: "" },
    metrics: {
      viewCount: { type: Number, default: 0 },
      engagementCount: { type: Number, default: 0 }
    },
    publishedAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
    storageDeletionStatus: {
      type: String,
      enum: ["not_applicable", "active", "pending", "released", "failed"],
      default: "not_applicable"
    },
    storageReleasedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

VideoSchema.index({ workspaceType: 1, workspaceId: 1, deletedAt: 1, createdAt: -1 });
VideoSchema.index({ status: 1, visibility: 1, cannabisSpecific: 1, publishedAt: -1 });
VideoSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  growInterests: "text",
  transcriptText: "text",
  captionsText: "text",
  ownerDisplayName: "text"
});

module.exports = mongoose.models.Video || mongoose.model("Video", VideoSchema);
