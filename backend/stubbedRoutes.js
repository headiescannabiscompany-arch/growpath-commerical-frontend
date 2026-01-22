// Stubs for missing endpoints to prevent 404 errors
module.exports = function (app) {
  app.get("/api/links", (req, res) => res.json([]));
  app.get("/api/campaigns", (req, res) => res.json([]));
  app.get("/api/social/accounts", (req, res) => res.json([]));
};
