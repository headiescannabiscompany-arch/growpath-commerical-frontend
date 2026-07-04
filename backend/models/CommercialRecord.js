const mongoose = require("mongoose");

const CommercialRecordSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    commercialAccountId: { type: String, default: null, index: true },
    recordType: { type: String, required: true, index: true },

    name: { type: String, default: "" },
    title: { type: String, default: "" },
    slug: { type: String, default: "", index: true },
    status: { type: String, default: "draft", index: true },

    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

CommercialRecordSchema.index({ userId: 1, recordType: 1, createdAt: -1 });
CommercialRecordSchema.index({ recordType: 1, slug: 1, status: 1 });

module.exports =
  mongoose.models.CommercialRecord ||
  mongoose.model("CommercialRecord", CommercialRecordSchema);
