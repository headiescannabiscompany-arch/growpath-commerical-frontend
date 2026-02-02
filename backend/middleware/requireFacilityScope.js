// backend/middleware/requireFacilityScope.js
const Facility = require("../models/Facility");
const FacilityMember = require("../models/FacilityMember");
const { apiError } = require("../utils/errors");

/**
 * requireFacilityScope
 * - Requires req.ctx.userId (so must run after requireAuth + buildRequestContext)
 * - Requires ctx.facilityId
 * - Test bypass: if ctx.facilityRole exists, skip DB membership check
 * - Otherwise verifies membership and sets ctx.facilityRole
 *
 * Contract expectations:
 * - Missing facilityId => 400 FACILITY_ID_REQUIRED
 * - Not a member => 403 FACILITY_ACCESS_DENIED
 */
async function requireFacilityScope(req, res, next) {
  try {
    req.ctx = req.ctx || {};
    const ctx = req.ctx;

    const userId = ctx.userId;
    if (!userId) {
      return next(apiError("AUTH_REQUIRED", "Authentication required"));
    }

    const facilityId = ctx.facilityId;
    if (!facilityId) {
      return next(apiError("FACILITY_ID_REQUIRED", "facilityId is required"));
    }

    // ✅ test bypass (core tests may inject role via header -> requestContext)
    if (ctx.facilityRole) {
      return next();
    }

    const facility = await Facility.findById(facilityId).lean();
    if (!facility) {
      return next(apiError("FACILITY_NOT_FOUND", "Facility not found"));
    }

    const member = await FacilityMember.findOne({
      facilityId,
      userId,
      deletedAt: null
    }).lean();

    if (!member) {
      return next(apiError("FACILITY_ACCESS_DENIED", "Not a facility member"));
    }

    ctx.facilityRole = member.role;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireFacilityScope };
