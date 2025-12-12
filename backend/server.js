const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Static files
app.use("/certificates", express.static(path.join(__dirname, "certificates")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

connectDB();

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/grows", require("./routes/grows"));
app.use("/api/forum", require("./routes/forum"));
app.use("/api/courses", require("./routes/courses"));
app.use("/courses", require("./routes/courses"));
app.use("/diagnose", require("./routes/diagnose"));
app.use("/templates", require("./routes/templates"));
app.use("/tasks", require("./routes/tasks"));
app.use("/feeding", require("./routes/feeding"));
app.use("/api/subscription", require("./routes/subscription-stripe"));
app.use("/subscribe", require("./routes/subscribe"));
app.use("/api/growlog", require("./routes/growlog"));
app.use("/api/plants", require("./routes/plants"));
app.use("/posts", require("./routes/posts"));
app.use("/environment", require("./routes/environment"));
app.use("/webhooks", require("./routes/webhooks"));
app.use("/webhook", require("./routes/webhook"));
app.use("/payments", require("./routes/payments"));
app.use("/iap", require("./routes/iap"));
app.use("/creator", require("./routes/creator"));
app.use("/certificates", require("./routes/certificates"));
app.use("/admin", require("./routes/admin"));
// Search route (mounted both under /search and /api/search for client compatibility)
app.use("/api/search", require("./routes/search"));
app.use("/search", require("./routes/search"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
