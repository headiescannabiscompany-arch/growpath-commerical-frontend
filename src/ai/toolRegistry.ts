import { calcVpdFromTemp, type TempUnit } from "@/tools/vpd";

export type ToolName = "calc_vpd";

export type CalcVpdArgs = {
  temp: number;
  unit: TempUnit; // "F" | "C"
  rh: number; // 0-100
};

export type ToolCall = { name: "calc_vpd"; args: CalcVpdArgs };

export type ToolResult =
  | {
      ok: true;
      name: "calc_vpd";
      data: { tempC: number; vpdKpa: number };
    }
  | {
      ok: false;
      name: ToolName;
      error: { code: "INVALID_ARGS"; message: string };
    };

function invalid(name: ToolName, message: string): ToolResult {
  return { ok: false, name, error: { code: "INVALID_ARGS", message } };
}

export function runTool(call: ToolCall): ToolResult {
  if (call.name === "calc_vpd") {
    const { temp, unit, rh } = call.args;

    if (!Number.isFinite(temp)) return invalid("calc_vpd", "temp must be a number");
    if (unit !== "F" && unit !== "C")
      return invalid("calc_vpd", "unit must be 'F' or 'C'");
    if (!Number.isFinite(rh) || rh < 0 || rh > 100) {
      return invalid("calc_vpd", "rh must be 0–100");
    }

    const data = calcVpdFromTemp(temp, unit, rh);
    if (!Number.isFinite(data.vpdKpa)) return invalid("calc_vpd", "calculation failed");

    return { ok: true, name: "calc_vpd", data };
  }

  // exhaustive
  return invalid(call.name, "unknown tool");
}
