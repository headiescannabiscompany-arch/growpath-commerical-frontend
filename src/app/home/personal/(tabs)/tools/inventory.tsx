import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function PersonalInventoryToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="personal-inventory"
      toolKey="personal-inventory"
      title="Inventory"
      subtitle="Track personal grow supplies, low-stock thresholds, recipe availability, cost per use, and reorder tasks."
      fields={[
        { key: "name", label: "Item name", defaultValue: "Kelp meal" },
        { key: "category", label: "Category", defaultValue: "amendment" },
        {
          key: "quantity",
          label: "Quantity",
          defaultValue: "5",
          keyboardType: "numeric"
        },
        { key: "unit", label: "Unit", defaultValue: "lb" },
        {
          key: "reorderAt",
          label: "Reorder threshold",
          defaultValue: "2",
          keyboardType: "numeric"
        },
        { key: "cost", label: "Unit cost", defaultValue: "12", keyboardType: "numeric" },
        {
          key: "recipeUseRate",
          label: "Recipe use rate",
          defaultValue: "1",
          keyboardType: "numeric"
        }
      ]}
      buildPayload={(values, { growId }) => ({ growId, ...values })}
      buildMetrics={(outputs) => [
        { key: "name", label: "Item", value: outputs.name },
        {
          key: "quantity",
          label: "Quantity",
          value: `${outputs.quantity} ${outputs.unit || ""}`
        },
        {
          key: "availability",
          label: "Recipe batches",
          value: outputs.recipeAvailability
        },
        { key: "cost", label: "Cost/use", value: outputs.costPerUse }
      ]}
      defaultLogTitle={(outputs) => `Inventory check: ${outputs.name || "item"}`}
      defaultTask={(outputs) =>
        outputs.reorderSuggestions?.[0]
          ? {
              title: outputs.reorderSuggestions[0].title,
              priority: outputs.reorderSuggestions[0].priority,
              dueDate: tomorrow(outputs.reorderSuggestions[0].dueInDays || 1),
              description: "Review quantity, recipe needs, and reorder source."
            }
          : undefined
      }
    />
  );
}
