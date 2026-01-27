// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

module.exports = function auth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Standardize: always attach req.user.id
    req.user = { id: payload.id || payload._id || payload.userId };
    if (!req.user.id) return res.status(401).json({ message: "Invalid token" });
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlements";
