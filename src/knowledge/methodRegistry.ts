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
      "crop/stage and scout zone",
      "written symptom pattern",
      "symptom progression",
      "plants checked and affected",
      "distribution within and across plants",
      "underside and magnification findings",
      "dated trap count with location/exposure context",
      "media with analysis status",
      "explicitly selected existing grow media with grow/plant/log provenance",
      "grow history",
      "environment with explicit units",
      "pH/EC"
    ],
    [
      "evidence",
      "counterEvidence",
      "likelyIssues",
      "nextChecks",
      "discriminating follow-up question",
      "follow-up analysis that preserves the original structured evidence",
      "image analysis performed status",
      "photo count and provider/model execution evidence",
      "distinct overall confidence, ranked-candidate confidence, health status, and action urgency",
      "IPM readiness and ranked working hypotheses",
      "IPM supporting evidence, counter-evidence, and competing candidates",
      "safe treatment categories without pesticide products or dosing",
      "normalized GrowPath/GPT agreement state",
      "explicit IPM AI-credit cost and charged/refunded result",
      "user likely/uncertain/rejected decision with timestamp",
      "grow-optional draft crop identity from uploaded media",
      "defensible common, genus, or family-level candidate retained when exact species is unresolved",
      "crop-identification photo count, provider/model, quality, visible traits, evidence IDs, and limitations preserved and visible in the saved result",
      "explicitly confirmed crop identity persisted to the selected grow/plant"
    ],
    [
      "Do not declare a nutrient deficiency from appearance alone.",
      "Do not silently prefill diagnosis stage or symptom location, and do not present ranked-candidate confidence as overall confidence.",
      "Do not imply attached photos were visually analyzed by a text-only provider.",
      "Do not send existing private grow media to diagnosis or IPM until the user explicitly selects each photo and its grow/plant/log provenance is preserved.",
      "Do not drop attached photo evidence or prior crop-identity provenance during follow-up analysis, treat a supplied crop name as explicit confirmation, or coerce blank measurements to zero.",
      "A structured GPT IPM second opinion does not independently inspect photo or video pixels.",
      "Do not label a combined billable scout-and-GPT action as a free calculator or hide its AI-credit cost until after the run.",
      "Do not count empty AI-prefill keys as filled fields or display raw empty arrays as scout evidence.",
      "Do not derive scout or trap counts from photos, and do not count unknown placeholder phrases as completed IPM fields.",
      "Do not strand a newly selected diagnosis or IPM upload as non-AI-usable after explicitly disclosing and receiving current-workflow AI approval.",
      "Do not invent scout defaults, trap context, organism identity, pesticide products, or rates.",
      "Do not require a grow for crop identification or infer a cultivar from cannabis flower appearance.",
      "Do not replace a defensible broader crop candidate with a confirmation placeholder merely because exact species remains unresolved.",
      "Do not discard server-attested crop-identification vision provenance and relabel an analyzed result as text-only or unanalyzed.",
      "Collect identification photos before the AI action and reserve user confirmation for the explicit result action.",
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
      "open the unified mix-builder chooser",
      "select exactly one soil or nutrient builder",
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
      "record-backed facility analytics",
      "separate seed-readiness and post-seed QA evidence"
    ],
    [
      "A selected facility and authorization are required.",
      "Local previews require explicit preview intent; bare routes preserve real authenticated Facility sessions.",
      "Synthetic QA approval never authorizes production records, operational setpoints, publication, or external source rights."
    ],
    ["facility-rooms", "facility-grows", "facility-tasks", "forum-qna"]
  )
];

export function getMethod(id: string) {
  return methodRegistry.find((entry) => entry.id === id);
}

export function methodsForTool(toolKey: string) {
  return methodRegistry.filter((entry) => entry.relatedTools.includes(toolKey));
}
