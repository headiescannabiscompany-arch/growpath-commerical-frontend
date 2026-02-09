type AnyObj = Record<string, any>;

function pick<T = any>(obj: AnyObj, paths: string[]): T | null {
  for (const p of paths) {
    const parts = p.split(".");
    let cur: any = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in cur) cur = cur[part];
      else {
        ok = false;
        break;
      }
    }
    if (ok) return cur as T;
  }
  return null;
}

export type FormattedAi = {
  primaryTake?: string | null;
  probabilities?: Array<{ label: string; p: number }> | null;
  bestPractice?: string | null;
  options?: Array<{
    action: string;
    benefit?: string | null;
    risk?: string | null;
  }> | null;
  recommended?: string | null;
  rationale?: string | null;
  youDecide?: string | null;
  rawText?: string | null;
};

export function formatAiReceipt(receipt: any): { formatted: FormattedAi; raw: any } {
  // We accept many envelopes. We normalize to "text" + "structured if present".
  const structured =
    pick<AnyObj>(receipt, [
      "result.structured",
      "result.data.structured",
      "data.structured",
      "structured"
    ]) || null;

  const text =
    pick<string>(receipt, [
      "result.text",
      "result.data.text",
      "data.text",
      "text",
      "result.message",
      "message",
      "result.output",
      "output"
    ]) || null;

  // If backend returns our preferred schema later, we read it.
  const formatted: FormattedAi = {
    primaryTake: pick<string>(structured || {}, ["primaryTake"]) || null,
    probabilities: pick<any[]>(structured || {}, ["probabilities"]) || null,
    bestPractice: pick<string>(structured || {}, ["bestPractice"]) || null,
    options: pick<any[]>(structured || {}, ["options"]) || null,
    recommended: pick<string>(structured || {}, ["recommended"]) || null,
    rationale: pick<string>(structured || {}, ["rationale"]) || null,
    youDecide: pick<string>(structured || {}, ["youDecide"]) || null,
    rawText: text
  };

  return { formatted, raw: receipt };
}
