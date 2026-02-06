import { calcVpdKpa, type TempUnit } from "@/tools/vpd";

export type ToolCall = {
  name: "calc_vpd";
  args: { temp: number; unit: TempUnit; rh: number };
};

export type ToolResult =
  | { ok: true; name: "calc_vpd"; result: { vpdKpa: number } }
  | { ok: false; name: string; error: string };

function validateNumber(n: unknown) {
  return typeof n === "number" && Number.isFinite(n);
}

export async function runTool(call: ToolCall): Promise<ToolResult> {
  if (call.name === "calc_vpd") {
    const { temp, unit, rh } = call.args;

    if (!validateNumber(temp))
      return { ok: false, name: call.name, error: "temp must be a number" };
    if (unit !== "C" && unit !== "F")
      return { ok: false, name: call.name, error: "unit must be C or F" };
    if (!validateNumber(rh) || rh < 0 || rh > 100)
      return { ok: false, name: call.name, error: "rh must be 0–100" };

    const v = calcVpdKpa(temp, unit, rh);
    return { ok: true, name: "calc_vpd", result: { vpdKpa: v } };
  }

  return { ok: false, name: (call as any)?.name ?? "unknown", error: "Unknown tool" };
}
