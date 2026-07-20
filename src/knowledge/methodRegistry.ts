export interface GrowPathMethod {
  id: string;
  title: string;
  appliesTo: string[];
  summary: string;
  primaryWorkflow: string[];
  requiredInputs: string[];
  requiredOutputs: string[];
  warnings: string[];
  relatedTools: string[];
  sourcePolicy: string;
  documentPath: string;
}

function method(
  id: string,
  title: string,
  appliesTo: string[],
  document: string,
  workflow: string[],
  inputs: string[],
  outputs: string[],
  warnings: string[],
  tools: string[]
): GrowPathMethod {
  return {
    id,
    title,
    appliesTo,
    summary: workflow.join(" → "),
    primaryWorkflow: workflow,
    requiredInputs: inputs,
    requiredOutputs: outputs,
    warnings,
    relatedTools: tools,
    sourcePolicy:
      "Apply source-reliability-registry by use case; distinguish records, calculations, inference and claims.",
    documentPath: `docs/knowledge/methods/${document}`
  };
}

export const methodRegistry: GrowPathMethod[] = [
  method(
    "integration-workflow",
    "Integration Workflow",
    ["integration", "telemetry", "sensor", "controller"],
    "integration-workflow-method.md",
    ["connect", "test", "discover", "map", "confirm", "auto-build"],
    ["provider credentials", "target workspace", "reviewed mappings"],
    [
      "spaces",
      "devices",
      "normalized streams",
      "raw metric evidence",
      "tool input context",
      "field-use declarations",
      "draft alerts",
      "dashboard definitions"
    ],
    ["Read-only first; never invent metrics, units, mappings, or control access."],
    ["data-integrations", "facility-integrations", "telemetry"]
  ),
  method(
    "plant-diagnosis-etgu",
    "Plant Diagnosis — ETGU",
    ["diagnosis", "ipm"],
    "plant-diagnosis-etgu-method.md",
    ["pattern", "medium", "environment", "numbers", "likely causes"],
    [
      "selected grow/plant",
      "written symptom pattern",
      "media with analysis status",
      "grow history",
      "environment",
      "pH/EC"
    ],
    [
      "evidence",
      "counterEvidence",
      "likelyIssues",
      "nextChecks",
      "discriminating follow-up question",
      "image analysis performed status",
      "photo count and provider/model execution evidence",
      "grow-optional draft crop identity from uploaded media",
      "explicitly confirmed crop identity persisted to the selected grow/plant"
    ],
    [
      "Do not declare a nutrient deficiency from appearance alone.",
      "Do not imply attached photos were visually analyzed by a text-only provider.",
      "Do not require a grow for crop identification or infer a cultivar from cannabis flower appearance.",
      "Recognizing cannabis from deliberately submitted crop-identification evidence must not unlock or advertise unrelated cannabis-only workflows."
    ],
    ["plant-diagnosis", "ipm-scout", "ask-ai"]
  ),
  method(
    "pheno-hunting",
    "Pheno Hunting",
    ["genetics", "selection"],
    "pheno-hunting-method.md",
    ["early growth", "flower", "final product", "clone/TC", "decision"],
    ["plant history", "stress", "sensory", "yield", "propagation"],
    ["category decisions", "reasoning", "retest plan"],
    ["A composite score cannot replace final-product and role-specific decisions."],
    ["pheno-hunt", "pheno-matrix", "genetics-inventory"]
  ),
  method(
    "stress-testing",
    "Stress Testing and Recovery",
    ["stress", "selection"],
    "stress-testing-method.md",
    ["incident", "response", "recovery", "lasting impact"],
    ["stress history", "before/after evidence", "timing"],
    ["recovery record", "keeper impact", "tasks"],
    ["Do not invent resilience scores."],
    ["stress-test", "pheno-hunt"]
  ),
  method(
    "crop-steering",
    "Crop Steering",
    ["irrigation", "environment"],
    "crop-steering-method.md",
    ["intent", "measured pressure", "response", "stop/continue"],
    ["medium", "dryback", "EC/pH", "DLI/VPD", "response"],
    ["optional techniques", "prerequisites", "stop conditions"],
    ["Do not escalate pressure with missing data or unresolved stress."],
    ["crop-steering-project"]
  ),
  method(
    "soil-nutrients",
    "Soil and Nutrients",
    ["soil", "water", "nutrients"],
    "soil-and-nutrient-method.md",
    [
      "select soil or nutrient mix builder",
      "verified inputs",
      "chemistry or structure",
      "release",
      "application"
    ],
    [
      "mix goal",
      "verified labels",
      "batch and water context",
      "stage",
      "lab or measured evidence when available",
      "history"
    ],
    [
      "label/elemental math or soil structure plan",
      "release timeline",
      "source confidence and uncertainty",
      "antagonisms",
      "tasks"
    ],
    [
      "Compost, biology, mineralization and long-term availability remain uncertain without testing.",
      "Official labels support guaranteed analysis and use rates, not superiority, uptake or crop response."
    ],
    [
      "npk",
      "soil-builder",
      "ingredient-library",
      "nutrient-chemistry",
      "nutrient-source-comparison",
      "dry-amendment-mix",
      "topdress-plan",
      "ph-ec-check",
      "watering",
      "feeding-schedule"
    ]
  ),
  method(
    "clone-rooting",
    "Clone Rooting",
    ["propagation"],
    "clone-rooting-method.md",
    ["batch evidence", "environment", "progress", "outcome"],
    ["mother", "counts", "media", "time", "environment"],
    ["bottlenecks", "performance", "tasks"],
    ["Do not claim hidden roots."],
    ["clone-rooting"]
  ),
  method(
    "tissue-culture",
    "Tissue Culture",
    ["lab", "propagation", "genetics"],
    "tissue-culture-method.md",
    ["traceability", "protocol", "quality", "storage", "recovery"],
    ["lineage", "vessels", "SOP/lots", "telemetry", "testing"],
    ["traceability", "quality controls", "survival/cost", "tasks"],
    ["Cold storage and cryopreservation are distinct."],
    ["tissue-culture"]
  ),
  method(
    "harvest-dry-cure",
    "Harvest, Dry and Cure",
    ["harvest", "post-harvest"],
    "harvest-dry-cure-method.md",
    ["readiness evidence", "decision", "measured dry/cure", "outcome"],
    ["macro media", "maturity", "telemetry", "sensory"],
    ["window", "missing media", "risk", "tasks"],
    [
      "Never estimate sensor values from images.",
      "Never fill trichome percentages after upload failure, unavailable analysis, incomplete provider output, or unusable media; show actionable retake guidance.",
      "Keep the shared harvest-readiness route discoverable in cannabis-aware Personal Tools and contextual cannabis grow surfaces, including untagged legacy cannabis grows and grows with attached cannabis-only workflow evidence."
    ],
    ["harvest-readiness", "dry-cure-guard"]
  ),
  method(
    "commercial-workflow",
    "Commercial Workflow",
    ["commercial"],
    "commercial-workflow-method.md",
    ["formula", "batch", "trial", "outcome", "product"],
    ["commercial records", "verified claims"],
    [
      "linked workflow",
      "limitations",
      "tasks",
      "forum alerts",
      "moderation audit",
      "owner-scoped event analytics"
    ],
    ["Never cross workspace scope or invent product claims."],
    ["commercial-batch-planner", "soil-nutrient-batch", "products", "trials", "forum-qna"]
  ),
  method(
    "facility-workflow",
    "Facility Workflow",
    ["facility"],
    "facility-workflow-method.md",
    ["facility", "room/zone", "assignment", "SOP/task", "audit"],
    ["facility scope", "roles", "rooms", "telemetry"],
    [
      "scoped actions",
      "audit links",
      "forum tasks and alerts",
      "moderation audit",
      "read-only integration state",
      "reviewed device mapping",
      "record-backed facility analytics"
    ],
    ["A selected facility and authorization are required."],
    ["facility-rooms", "facility-grows", "facility-tasks", "forum-qna"]
  )
];

export function getMethod(id: string) {
  return methodRegistry.find((entry) => entry.id === id);
}

export function methodsForTool(toolKey: string) {
  return methodRegistry.filter((entry) => entry.relatedTools.includes(toolKey));
}
