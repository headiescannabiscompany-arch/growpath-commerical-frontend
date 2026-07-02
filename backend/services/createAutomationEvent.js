"use strict";

const AutomationEvent = require("../models/AutomationEvent");
const stableObjectIdFromAny = require("../helpers/stableObjectIdFromAny");
const { evaluateAutomationEvent } = require("./automationEngine");

async function createAutomationEvent(data) {
  const userId = String(data.userId || data.user || "");
  if (!userId) throw new Error("Automation event user is required");
  if (!data.source) throw new Error("Automation event source is required");
  if (!data.eventType) throw new Error("Automation event type is required");

  const event = await AutomationEvent.create({
    user: stableObjectIdFromAny(userId),
    userId,
    growId: data.growId || null,
    plantId: data.plantId || null,
    facilityId: data.facilityId || null,
    source: String(data.source),
    eventType: String(data.eventType),
    payload: data.payload || {}
  });

  const result = await evaluateAutomationEvent(event);
  return { event, result };
}

module.exports = createAutomationEvent;
