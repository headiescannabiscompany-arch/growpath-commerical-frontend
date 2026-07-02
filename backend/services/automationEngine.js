"use strict";

const AutomationPolicy = require("../models/AutomationPolicy");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const GrowLog = require("../models/GrowLog");
const stableObjectIdFromAny = require("../helpers/stableObjectIdFromAny");
const { dispatchAppWebhookEvent } = require("./appWebhookDispatcher");

function personalFacilityId(userId) {
  return `personal:${String(userId)}`;
}

function getValueByPath(obj, path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
}

function conditionMatches(condition, payload) {
  const actual = getValueByPath(payload || {}, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than":
      return Number(actual) > Number(expected);
    case "greater_than_or_equal":
      return Number(actual) >= Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    case "less_than_or_equal":
      return Number(actual) <= Number(expected);
    case "includes":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual || "").includes(String(expected));
    case "exists":
      return actual !== undefined && actual !== null;
    default:
      return false;
  }
}

function withinCooldown(policy) {
  if (!policy.lastTriggeredAt) return false;
  const diffMinutes = (Date.now() - new Date(policy.lastTriggeredAt).getTime()) / 60000;
  return diffMinutes < Number(policy.cooldownMinutes || 0);
}

function dailyLimitReached(policy) {
  const today = new Date().toISOString().slice(0, 10);
  if (policy.triggerCountDate !== today) return false;
  return Number(policy.triggerCountToday || 0) >= Number(policy.maxTriggersPerDay || 0);
}

function eventInPolicyScope(policy, event) {
  if (policy.facilityId && String(policy.facilityId) !== String(event.facilityId || "")) {
    return false;
  }
  if (policy.growId && String(policy.growId) !== String(event.growId || "")) {
    return false;
  }
  if (policy.plantId && String(policy.plantId) !== String(event.plantId || "")) {
    return false;
  }
  return true;
}

async function executeAction({ action, event, policy, dryRun }) {
  const payload =
    action.payload && typeof action.payload === "object" ? action.payload : {};
  if (dryRun) {
    return { dryRun: true, actionType: action.type, payload };
  }

  const userId = String(event.userId || policy.userId);
  const facilityId = String(
    event.facilityId || policy.facilityId || personalFacilityId(userId)
  );
  const growId = event.growId || policy.growId || null;
  const plantId = event.plantId || policy.plantId || null;

  if (action.type === "create_task") {
    const task = await Task.create({
      facilityId,
      createdByUserId: userId,
      assignedToUserId: payload.assignedToUserId || userId,
      growId,
      plantId,
      title: String(payload.title || `Follow up: ${event.eventType}`),
      notes: String(
        payload.description ||
          payload.notes ||
          `Automation triggered by ${event.source}:${event.eventType}`
      ),
      priority: payload.priority || "medium",
      dueAt: payload.dueInHours
        ? new Date(Date.now() + Number(payload.dueInHours) * 3600000)
        : new Date(Date.now() + 86400000),
      sourceType: "automation_event",
      sourceObjectId: event._id ? String(event._id) : String(policy._id),
      sourceToolRunId: event.payload?.toolRunId ? String(event.payload.toolRunId) : null,
      sourceDiagnosisId: event.payload?.diagnosisId
        ? String(event.payload.diagnosisId)
        : null
    });
    return { actionType: "create_task", taskId: String(task._id) };
  }

  if (action.type === "create_notification") {
    const dedupeKey = `automation:${policy._id}:${event._id || event.eventType}:${action.type}`;
    const notification = await Notification.create({
      user: stableObjectIdFromAny(userId),
      type: "system",
      title: String(payload.title || "GrowPathAI Alert"),
      body: String(payload.body || `Automation triggered: ${event.eventType}`),
      data: {
        automationPolicyId: String(policy._id),
        automationEventId: event._id ? String(event._id) : null,
        source: event.source,
        eventType: event.eventType,
        growId,
        plantId,
        facilityId
      },
      source: { model: "AutomationPolicy", id: String(policy._id) },
      channel: "in_app",
      read: false,
      readAt: null,
      dedupeKey
    });
    return {
      actionType: "create_notification",
      notificationId: String(notification._id)
    };
  }

  if (action.type === "create_grow_log") {
    const notes = String(
      payload.notes ||
        `Automation triggered from ${event.source}:${event.eventType}\n\n${JSON.stringify(
          event.payload || {},
          null,
          2
        )}`
    );
    const log = await GrowLog.create({
      facilityId,
      userId,
      growId,
      plantId,
      title: String(payload.title || `Automation log: ${event.eventType}`),
      note: notes,
      notes,
      type: payload.type || "AUTOMATION",
      tags: Array.isArray(payload.tags)
        ? payload.tags
        : ["automation", String(event.eventType)]
    });
    return { actionType: "create_grow_log", logId: String(log._id) };
  }

  if (action.type === "webhook") {
    const deliveries = await dispatchAppWebhookEvent({
      event: "AUTOMATION_TRIGGERED",
      userId,
      facilityId: event.facilityId || policy.facilityId || null,
      data: {
        automationPolicyId: String(policy._id),
        automationEventId: event._id ? String(event._id) : null,
        source: event.source,
        eventType: event.eventType,
        payload: event.payload || {}
      }
    });
    return {
      actionType: "webhook",
      deliveries: deliveries.map((delivery) => String(delivery._id))
    };
  }

  return {
    actionType: action.type,
    skipped: true,
    reason: "Action executor not implemented for this action type"
  };
}

async function evaluateAutomationEvent(event, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const query = {
    userId: String(event.userId),
    enabled: true,
    "trigger.source": String(event.source),
    "trigger.eventType": String(event.eventType)
  };
  if (options.onlyPolicyId) query._id = options.onlyPolicyId;

  const policies = await AutomationPolicy.find(query);
  const matched = [];
  const executed = [];
  const skipped = [];

  for (const policy of policies) {
    if (!eventInPolicyScope(policy, event)) {
      skipped.push({ policyId: String(policy._id), reason: "scope" });
      continue;
    }
    if (!dryRun && withinCooldown(policy)) {
      skipped.push({ policyId: String(policy._id), reason: "cooldown" });
      continue;
    }
    if (!dryRun && dailyLimitReached(policy)) {
      skipped.push({ policyId: String(policy._id), reason: "daily_limit" });
      continue;
    }

    const conditions = Array.isArray(policy.conditions) ? policy.conditions : [];
    if (
      !conditions.every((condition) => conditionMatches(condition, event.payload || {}))
    ) {
      continue;
    }

    matched.push(policy._id);
    for (const action of policy.actions || []) {
      executed.push(await executeAction({ action, event, policy, dryRun }));
    }

    if (!dryRun) {
      const today = new Date().toISOString().slice(0, 10);
      policy.lastTriggeredAt = new Date();
      policy.triggerCount = Number(policy.triggerCount || 0) + 1;
      if (policy.triggerCountDate !== today) {
        policy.triggerCountDate = today;
        policy.triggerCountToday = 1;
      } else {
        policy.triggerCountToday = Number(policy.triggerCountToday || 0) + 1;
      }
      await policy.save();
    }
  }

  if (event._id && !dryRun) {
    event.processed = true;
    event.matchedPolicyIds = matched;
    await event.save();
  }

  return {
    matchedPolicyCount: matched.length,
    matchedPolicyIds: matched.map((id) => String(id)),
    executed,
    skipped
  };
}

module.exports = {
  conditionMatches,
  evaluateAutomationEvent
};
