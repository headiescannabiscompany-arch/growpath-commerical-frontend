// backend/models/User.js
// User model with growInterests field

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  plan: { type: String, default: "free" },
  role: { type: String, default: "user" },
  growInterests: {
    type: [String],
    default: []
  }
  // ...other fields...
});

module.exports = mongoose.model("User", UserSchema);
