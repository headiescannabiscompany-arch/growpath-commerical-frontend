import React from "react";

import BackendCalculatorToolScreen, { tomorrow } from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function TissueCultureToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="tissue-culture"
      toolKey="tissue-culture"
      title="Tissue Culture"
      subtitle="Track TC batch status, vessels, contamination, rooting, acclimation, SOP version, and next transfer tasks."
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "TC Project" },
        { key: "batchNumber", label: "Batch number", defaultValue: "TC-001" },
        { key: "geneticsId", label: "Genetics ID", defaultValue: "" },
        { key: "mediaRecipe", label: "Media recipe", defaultValue: "starter media" },
        { key: "vessels", label: "Total vessels", defaultValue: "24", keyboardType: "numeric" },
        { key: "contaminatedVessels", label: "Contaminated vessels", defaultValue: "2", keyboardType: "numeric" },
        { key: "rootedVessels", label: "Rooted vessels", defaultValue: "10", keyboardType: "numeric" },
        { key: "acclimatedPlants", label: "Acclimated plants", defaultValue: "6", keyboardType: "numeric" },
        { key: "SOPVersion", label: "SOP version", defaultValue: "SOP-TC-1" },
        { key: "transfersDueDays", label: "Next transfer due in days", defaultValue: "14", keyboardType: "numeric" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        projectName: values.projectName,
        batchNumber: values.batchNumber,
        geneticsId: values.geneticsId,
        mediaRecipe: values.mediaRecipe,
        vessels: values.vessels,
        contaminatedVessels: values.contaminatedVessels,
        rootedVessels: values.rootedVessels,
        acclimatedPlants: values.acclimatedPlants,
        SOPVersion: values.SOPVersion,
        transfersDueDays: values.transfersDueDays
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Status", value: outputs.projectStatus },
        { key: "contamination", label: "Contamination %", value: outputs.contaminationRate },
        { key: "rooting", label: "Rooting %", value: outputs.rootingRate },
        { key: "acclimation", label: "Acclimation %", value: outputs.acclimationRate }
      ]}
      defaultLogTitle={(outputs) => `${outputs.projectName || "Tissue culture"} batch check`}
      defaultTask={(outputs) => ({
        title: outputs.nextTransferTasks?.[0]?.title || "Review TC vessels for transfer",
        priority: outputs.nextTransferTasks?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.nextTransferTasks?.[0]?.dueInDays || 14),
        description: "Review vessel IDs, contamination, rooting status, media, and transfer notes."
      })}
    />
  );
}
