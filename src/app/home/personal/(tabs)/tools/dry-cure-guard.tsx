import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function DryCureGuardToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="dry-cure-guard"
      toolKey="dry-cure-guard"
      title="Dry / Cure Guard"
      subtitle="Check dry-room and jar moisture risk without pretending one target guarantees quality."
      fields={[
        { key: "mode", label: "Mode", defaultValue: "drying" },
        { key: "dryRoomTemp", label: "Dry room temp", defaultValue: "68", keyboardType: "numeric" },
        { key: "tempUnit", label: "Temperature unit", defaultValue: "F" },
        { key: "dryRoomRH", label: "Dry room RH", defaultValue: "60", keyboardType: "numeric" },
        { key: "jarRH", label: "Jar RH (optional)", defaultValue: "", keyboardType: "numeric" },
        { key: "airflow", label: "Airflow", defaultValue: "medium" },
        { key: "budDensity", label: "Bud density", defaultValue: "medium" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        mode: values.mode,
        dryRoomTemp: n(values.dryRoomTemp),
        tempUnit: values.tempUnit,
        dryRoomRH: n(values.dryRoomRH),
        jarRH: values.jarRH ? n(values.jarRH) : undefined,
        airflow: values.airflow,
        budDensity: values.budDensity
      })}
      buildMetrics={(outputs) => [
        { key: "mold", label: "Mold risk", value: outputs.moldRisk || "-" },
        { key: "overdry", label: "Overdry risk", value: outputs.overdryRisk || "-" },
        { key: "dew", label: "Dew point", value: `${outputs.dewPointF ?? "-"} F` },
        { key: "spread", label: "Dew spread", value: `${outputs.dewPointSpreadC ?? "-"} C` },
        { key: "action", label: "Next action", value: outputs.nextAction || "-" }
      ]}
      defaultLogTitle={() => "Dry / cure check"}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestions?.[0]?.title || "Check dry/cure conditions",
        description: outputs.nextAction || "Check dry/cure conditions.",
        priority: outputs.taskSuggestions?.[0]?.priority || "medium",
        dueDate: tomorrow(1)
      })}
    />
  );
}
