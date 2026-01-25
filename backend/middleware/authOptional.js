// backend/middleware/authOptional.js
const jwt = require("jsonwebtoken");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

module.exports = function authOptional(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id || payload._id || payload.userId };
  } catch (err) {
    // Optional means: ignore invalid token and proceed unauthenticated
  }
  return next();
};
