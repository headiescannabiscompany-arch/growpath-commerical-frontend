const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashed });
    await user.save();

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "change_this_secret", {
      expiresIn: "7d"
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Signup (alias for register with displayName support)
router.post("/signup", async (req, res) => {
  const { displayName, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    user = new User({ 
      name: displayName || email.split('@')[0], 
      email, 
      password: hashed 
    });
    await user.save();

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "change_this_secret", {
      expiresIn: "7d"
    });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        displayName: user.name,
        role: user.role 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "change_this_secret", {
      expiresIn: "7d"
    });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        displayName: user.name,
        role: user.role 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Become Creator
router.post("/become-creator", async (req, res) => {
  const auth = require("../middleware/auth");
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    const userId = decoded.user?.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "creator";
    await user.save();

    res.json({ ok: true, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save Push Token
router.post("/save-push-token", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pushToken = req.body.pushToken;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
