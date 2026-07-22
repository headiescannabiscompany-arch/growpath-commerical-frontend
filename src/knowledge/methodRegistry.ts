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
    ["crop-steering-project", "crop-steering-entry", "ph-ec-check"]
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
      "commercial batch yield, packaging, cost completeness and inventory review",
      "tasks"
    ],
    [
      "Compost, biology, mineralization and long-term availability remain uncertain without testing.",
      "Official labels support guaranteed analysis and use rates, not superiority, uptake or crop response.",
      "Do not coerce missing batch quantity, analysis, cost, shrinkage, margin, lot or inventory values to zero.",
      "Calculate blended label analysis only from complete values expressed in compatible quantity units; inventory review never decrements stock."
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
    [
      "select owned cannabis/hemp grow",
      "count batch",
      "record direct root evidence",
      "record measured context",
      "review bottlenecks and missing evidence",
      "schedule recount",
      "record outcome"
    ],
    [
      "days since cut",
      "total/rooted/failed counts",
      "direct root evidence",
      "optional callus/wilt counts",
      "timestamp and measurement source",
      "humidity, air/root-zone temperature, PPFD and photoperiod when measured",
      "mother health, sanitation, medium, stem and leaf observations",
      "photo analysis provenance"
    ],
    [
      "evidence status",
      "validated batch counts and percentages",
      "measured environment snapshot",
      "structured bottlenecks and counter-limits",
      "missing information",
      "source and method IDs",
      "recount/photo/environment/outcome tasks"
    ],
    [
      "Require an owned cannabis/hemp grow at the API boundary.",
      "Do not use elapsed days, top growth, callus, or tug resistance as proof of hidden roots.",
      "Do not silently default counts, environmental measurements, donor health, sanitation, or media observations.",
      "Present published environmental ranges as cultivar- and study-specific context, never universal targets.",
      "Attached media is not analyzed unless provider execution evidence confirms pixel inspection."
    ],
    ["clone-rooting"]
  ),
  method(
    "tissue-culture",
    "Tissue Culture",
    ["lab", "propagation", "genetics"],
    "tissue-culture-method.md",
    [
      "select owned cannabis/hemp grow",
      "identify batch, workflow lane and stage",
      "record timestamped direct vessel counts",
      "link lineage, SOP, media, sterilization and custody",
      "review visible patterns without naming microorganisms",
      "review quality controls and release blockers",
      "compare protocol, acclimation, storage and recovery outcomes",
      "schedule owner-timed follow-up"
    ],
    [
      "project and batch identifiers",
      "mother-bank, production, cold-storage or cryopreservation lane",
      "stage and direct-inspection status",
      "timestamp, observation source and total/condition vessel counts",
      "lineage, vessel/rack/shelf, SOP/media/sterilization lots and custody",
      "quality-control reports and disposition",
      "measured environment, protocol cohort, acclimation, cost and storage evidence",
      "photo analysis provenance"
    ],
    [
      "assessment, lane and stage",
      "validated counts and percentages",
      "structured visible failure modes and limits",
      "traceability and release blockers",
      "quality, protocol, acclimation, cost, storage and recovery records",
      "source and method IDs",
      "evidence and owner-timed tasks"
    ],
    [
      "Require an owned cannabis/hemp grow at the API boundary.",
      "Do not silently default counts, identifiers, lots, measurements, costs or transfer timing.",
      "Visible patterns and photos cannot identify microorganisms, prove pathogen freedom or replace laboratory evidence.",
      "Do not automatically release material; surface blockers for owner review.",
      "Keep ordinary cold storage separate from validated cryopreservation.",
      "Published protocol values are study- and genotype-specific context, not universal targets."
    ],
    ["tissue-culture"]
  ),
  method(
    "run-comparison",
    "Run Comparison and Grow History",
    ["run comparison", "grow history", "analytics"],
    "run-comparison-method.md",
    [
      "select two to five owned grows",
      "choose reference, objective and equivalent scope",
      "inventory saved evidence",
      "compare recorded values",
      "separate differences from associated drivers",
      "review missing data and alternatives",
      "save report and optional next-run tasks"
    ],
    [
      "owned grow IDs",
      "reference grow",
      "comparison objective",
      "equivalent stage or whole-run scope",
      "saved logs, tasks, ToolRuns, diagnoses, telemetry and outcomes"
    ],
    [
      "evidence inventory by grow",
      "normalized snapshots",
      "recorded differences",
      "associated-driver hypotheses with alternatives",
      "missing information",
      "confidence and limitations",
      "method and source IDs",
      "owner-reviewed follow-up tasks"
    ],
    [
      "Do not use demo runs or silently convert missing values to zero.",
      "Do not rank an overall best run with hidden weights.",
      "Do not compare unlike stages without an explicit limitation.",
      "Do not claim causation from an observational run comparison.",
      "Exclude synthetic QA evidence from ordinary production conclusions unless it is explicitly selected and labeled.",
      "The deterministic comparison uses no AI credit; optional AI explanation must preserve the same evidence limits."
    ],
    ["run-comparison"]
  ),
  method(
    "harvest-dry-cure",
    "Harvest, Dry and Cure",
    ["harvest", "post-harvest"],
    "harvest-dry-cure-method.md",
    [
      "readiness evidence",
      "decision",
      "measured dry/cure",
      "outcome",
      "photo-review provenance and AI-credit outcome"
    ],
    [
      "three macro bud-site photos plus one wider context photo",
      "maturity",
      "telemetry",
      "sensory",
      "simultaneous measured room temperature and RH",
      "optional coldest material or container surface temperature",
      "equilibrated jar or bag RH",
      "measurement time and source",
      "days in the current stage",
      "explicit light exposure condition",
      "airflow and material density"
    ],
    [
      "window",
      "missing media",
      "risk",
      "tasks",
      "air dew point and explicitly labeled air spread",
      "surface-to-dew-point margin only when a surface temperature was measured",
      "evidence used, missing information, and limitations",
      "stage timing that distinguishes a 24-hour recheck from completion",
      "10-14 day controlled-dry planning context and 5-7 day fast-dry quality warning",
      "review ID, evidence IDs, provider/model, image quality, visible traits, limitations, photo count, and credit status"
    ],
    [
      "Never estimate sensor values from images.",
      "Never default missing dry/cure temperature, RH, airflow, or density to a plausible-looking value; incomplete measurements produce an insufficient-evidence result.",
      "Never call air temperature minus dew point a surface condensation margin. Calculate a surface margin only from an entered coldest-surface measurement.",
      "Never label mold risk as low or ruled out from one room reading, a photo, or the absence of visible growth.",
      "Keep drying and curing material protected from light; record dark, brief work light, continuous indirect light, direct light, or unknown without guessing from a photo.",
      "Treat a 24-hour task as a recheck, never completion. Show 10-14 days only as a controlled-drying planning window, 5-7 days as a possible fast/hot/low-humidity quality concern, and longer than 14 days as possible but not recommended as routine; elapsed time alone never completes the stage.",
      "Require cannabis/hemp grow context at the Dry / Cure Guard API boundary before saving a ToolRun.",
      "Never fill trichome percentages after upload failure, unavailable analysis, incomplete provider output, or unusable media; show actionable retake guidance.",
      "Block provider use and spend no AI credit until three sharp macro bud-site samples plus one wider context photo are uploaded and approved for this workflow.",
      "Reserve one disclosed AI credit only after evidence ownership is verified, refund provider failures, and preserve the charge/refund result in the review.",
      "Reject crop-neutral accounts and unrelated horticulture grows before loading harvest evidence or reserving an AI credit.",
      "Never silently coerce missing trichome observations to zero or score a distribution that does not total about 100%.",
      "Keep the shared harvest-readiness route discoverable in cannabis-aware Personal Tools and contextual cannabis grow surfaces, including untagged legacy cannabis grows and grows with attached cannabis-only workflow evidence."
    ],
    ["harvest-readiness", "dry-cure-guard"]
  ),
  method(
    "course-media-workflow",
    "Course Media Workflow",
    ["course", "lesson", "education", "media"],
    "course-media-workflow-method.md",
    [
      "choose source",
      "normalize provider",
      "review rights and availability",
      "record accessibility fallback",
      "publish",
      "privacy-aware playback"
    ],
    [
      "GrowPath upload or video-page URL",
      "creator rights confirmation",
      "timestamped availability check",
      "captions or transcript status",
      "learner-visible text summary"
    ],
    [
      "normalized provider metadata",
      "canonical URL and provider ID",
      "Vimeo unlisted privacy hash when present",
      "approved embed capability or link-only fallback",
      "learner-visible availability and accessibility status",
      "external provider link",
      "GrowPath-only explicit completion state",
      "owner-only draft preview and published-only public detail access",
      "learner preview without authoring controls"
    ],
    [
      "Never accept or execute author-supplied iframe, script, object, embed, video, or HTML markup.",
      "Never imply GrowPath owns, hosts, continuously monitors, or verifies watch analytics for third-party media.",
      "Never publish video without rights confirmation, a timestamped availability check, accessibility status, text summary, and external-link fallback.",
      "Never drop a Vimeo unlisted privacy hash while normalizing its canonical or player URL.",
      "Never expose unpublished course or lesson content to anonymous users or unrelated accounts, including through a direct record ID.",
      "Provider playback never completes a GrowPath lesson automatically."
    ],
    ["course-builder", "course-player", "commercial-courses", "facility-training"]
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
      "owner-scoped event analytics",
      "owner-scoped production batches linked to ToolRuns and Commercial tasks",
      "published-course discovery limited to published storefronts and explicit public fields",
      "direct draft-course detail limited to the authenticated author or platform administrator",
      "explicit eligible workspace preference preserved across plan-backed modes",
      "workspace preference reapplied before restricted-route access decisions",
      "workspace selection and routing use the same effective paid-plan capabilities"
    ],
    [
      "Never cross workspace scope or invent product claims.",
      "A batch calculation may report inventory shortages but cannot decrement stock, assign lots, publish claims or authorize release.",
      "Never expose drafts, owner/account IDs, arbitrary authoring fields, or private records through public commercial-course discovery.",
      "Never treat knowledge of a draft course ID as permission to read, enroll, check out, discuss, or review it.",
      "Never honor deterministic test identity headers as production authentication.",
      "Never silently replace an explicitly selected eligible workspace with the account's primary billing mode.",
      "Never pass reserved public route words or malformed record IDs into database ID queries."
    ],
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
      "title-based public outreach destination selection with advanced reference fallback",
      "read-after-write reconciled facility task queues",
      "stable accessible Facility task queue links",
      "credential-autofill-safe AI and parental-control inputs",
      "record-backed report counts with explicit untracked compliance evidence",
      "human-readable audit summaries with full-record drill-in",
      "readable selected-Facility context without database identifiers",
      "named Facility task assignments, rooms, and record summaries",
      "template-backed or owner-entered SOP checklists",
      "human-readable two-run SOP comparison selection",
      "review-complete and mutation-locked SOP evidence runs",
      "readable SOP evidence summaries and step differences",
      "separate seed-readiness and post-seed QA evidence"
    ],
    [
      "A selected facility and authorization are required.",
      "Local previews require explicit preview intent; bare routes preserve real authenticated Facility sessions.",
      "Never hide a confirmed Facility task write behind a cached or stale queue response.",
      "Never make Facility outreach operators type raw course, live-event, or Forum identifiers when readable public records are available.",
      "Never make Facility task operators work from raw database fields, user IDs, room IDs, or JSON records.",
      "Never expose raw source-object IDs in Facility task queue summaries or route a task row anywhere except its selected task detail.",
      "Never invite saved account credentials into an AI prompt or parental-control PIN field.",
      "Never use an internal Facility identifier as the visible workspace name, operational context label, or downloaded evidence filename.",
      "Never convert unavailable Facility compliance evidence to a zero or expose raw JSON, entity IDs, or identifier arrays in primary audit lists and summaries.",
      "Never create an empty SOP run or require a user to type internal run IDs for comparison.",
      "Never complete an SOP run with unreviewed steps, mutate completed evidence, or expose raw run JSON as the primary interface.",
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
