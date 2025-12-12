const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

  certificateId: { type: String, unique: true },
  pdfUrl: String,
  completedAt: Date,

}, { timestamps: true });

module.exports = mongoose.model("Certificate", CertificateSchema);
