const mongoose = require("mongoose");

const EarningSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" },
  
  amount: Number,       // amount earned after platform fee
  platformFee: Number,  // your cut
  paidOut: { type: Boolean, default: false }
},
{ timestamps: true });

module.exports = mongoose.model("Earning", EarningSchema);
