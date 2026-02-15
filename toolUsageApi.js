export async function recordToolUsage() {
  return { ok: true };
}

export async function getToolUsageMetrics() {
  return { ok: true, metrics: {} };
}

export default {
  recordToolUsage,
  getToolUsageMetrics
};
