import type { SOPChecklistStep } from "@/api/sop";

// Shared draft structure for Facility authoring and review-only AI recommendations.
export type StandardSopTemplate = {
  key: string;
  version: number;
  title: string;
  category:
    | "defol"
    | "ipm"
    | "transplant"
    | "feed"
    | "water"
    | "harvest"
    | "dry_cure"
    | "reset"
    | "other";
  summary: string;
  estimatedDurationMinutes: number;
  safetyNotes: string;
  checklist: SOPChecklistStep[];
};

function step(
  text: string,
  options: Pick<SOPChecklistStep, "required" | "requiresPhoto"> = {}
): SOPChecklistStep {
  return {
    step: text,
    required: options.required !== false,
    requiresPhoto: options.requiresPhoto === true
  };
}

export const STANDARD_SOP_LIBRARY: StandardSopTemplate[] = [
  {
    key: "daily_room_opening",
    version: 2,
    title: "Daily Room Opening Check",
    category: "other",
    summary:
      "A crop-neutral opening review for room condition, active work, equipment, and handoff notes.",
    estimatedDurationMinutes: 15,
    safetyNotes:
      "Do not enter or operate equipment when an unsafe condition is present. Stop and notify the responsible person.",
    checklist: [
      step("Confirm the correct room or zone and review the current shift handoff."),
      step("Record the inspection time and the person performing the check."),
      step(
        "Check access paths, floors, drains, doors, and work surfaces for visible hazards."
      ),
      step(
        "Confirm required equipment is powered, connected, and showing its expected operating state."
      ),
      step(
        "Record current environmental readings without replacing missing measurements with estimates."
      ),
      step(
        "Compare recorded conditions with the reviewed limits for this area and crop stage; record the limit as missing when none is documented."
      ),
      step(
        "Create a follow-up task or documented exception for every unresolved issue and identify the responsible person."
      )
    ]
  },
  {
    key: "room_sanitation_turnover",
    version: 2,
    title: "Room Sanitation and Turnover",
    category: "reset",
    summary:
      "A documented reset between production cycles without prescribing chemicals, rates, or jurisdiction-specific rules.",
    estimatedDurationMinutes: 60,
    safetyNotes:
      "Use only reviewed products, current label directions, protective equipment, contact times, and disposal procedures.",
    checklist: [
      step(
        "Confirm the room is released for cleaning and identify material that must remain."
      ),
      step(
        "Remove waste, loose plant material, used labels, and unneeded supplies using approved handling procedures."
      ),
      step(
        "Clean tools, movable equipment, work surfaces, floors, drains, and high-touch points."
      ),
      step("Apply only reviewed sanitation products according to their current labels."),
      step(
        "Inspect for residue, standing water, damage, pests, and areas that could not be reached."
      ),
      step("Return clean equipment and supplies to their assigned locations."),
      step("Document exceptions, corrective work, and final release approval.", {
        requiresPhoto: true
      })
    ]
  },
  {
    key: "ipm_scouting_escalation",
    version: 2,
    title: "IPM Scouting and Escalation",
    category: "ipm",
    summary:
      "A repeatable visual scouting record that keeps uncertain findings separate from confirmed identifications.",
    estimatedDurationMinutes: 30,
    safetyNotes:
      "Do not diagnose from one sign or apply a treatment from this checklist. Follow the applicable IPM plan, product labels, and required approvals.",
    checklist: [
      step("Confirm the area, crop, stage, inspection route, and sampling scope."),
      step(
        "Inspect representative upper, middle, and lower plant areas without claiming unobserved sections were checked."
      ),
      step(
        "Review leaf surfaces, growing points, stems, substrate surface, traps, and nearby structures."
      ),
      step(
        "Record observed signs, distribution, severity, and affected count using the documented rating scale; mark the scale as missing when none is available."
      ),
      step(
        "Capture clear overview and close-up evidence for unusual or uncertain findings.",
        {
          requiresPhoto: true
        }
      ),
      step(
        "Separate observed evidence from suspected pest, pathogen, or environmental causes."
      ),
      step(
        "Escalate thresholds, unknown findings, and rapid change to the designated reviewer."
      ),
      step("Create linked follow-up tasks and record any reviewed containment action.")
    ]
  },
  {
    key: "incoming_material_quarantine",
    version: 2,
    title: "Incoming Plant and Material Quarantine",
    category: "transplant",
    summary:
      "An intake and isolation checklist for incoming plant material, growing media, and production inputs.",
    estimatedDurationMinutes: 25,
    safetyNotes:
      "Keep unknown or rejected material separated. Do not release it until the responsible reviewer records a decision.",
    checklist: [
      step(
        "Record supplier, item identity, quantity, lot or batch information, and arrival time when available."
      ),
      step(
        "Confirm the assigned quarantine location before moving material into production areas."
      ),
      step(
        "Inspect packaging and material for damage, moisture, contamination, pests, and labeling conflicts."
      ),
      step("Photograph notable condition, labels, and any discrepancy.", {
        requiresPhoto: true
      }),
      step(
        "Record missing documents, test results, or source information as missing rather than assumed."
      ),
      step(
        "Apply the applicable quarantine or hold label and restrict use until review is complete."
      ),
      step(
        "Record the reviewer decision: release, extend hold, return, or dispose under an approved procedure."
      )
    ]
  },
  {
    key: "irrigation_event_verification",
    version: 2,
    title: "Irrigation or Feeding Event Verification",
    category: "water",
    summary:
      "A measurement-first check before and after an irrigation or feeding event without supplying a recipe or setpoint.",
    estimatedDurationMinutes: 20,
    safetyNotes:
      "Use only the reviewed recipe or water plan, intended source, equipment, labels, and mixing order for the selected crop stage.",
    checklist: [
      step(
        "Confirm the assigned area, crop, stage, recipe or water plan, and planned volume."
      ),
      step(
        "Verify source water, ingredients, measuring tools, and delivery equipment are the intended records."
      ),
      step("Record measured input values and units; leave unavailable values blank."),
      step("Confirm the reviewed mixture or water plan before application."),
      step(
        "Observe delivery for leaks, blocked emitters, uneven flow, overflow, or runoff concerns."
      ),
      step("Record actual volume, timing, and representative post-event observations."),
      step(
        "Create a linked task for any unresolved equipment, measurement, or crop-response issue."
      )
    ]
  },
  {
    key: "sensor_offline_response",
    version: 2,
    title: "Sensor Offline or Stale-Data Response",
    category: "other",
    summary:
      "A response checklist that treats missing telemetry as unknown and requires an independent observation.",
    estimatedDurationMinutes: 20,
    safetyNotes:
      "Do not treat stale or missing telemetry as proof that conditions are safe or unsafe.",
    checklist: [
      step(
        "Confirm the affected device, area or zone, metric, and last recorded timestamp."
      ),
      step(
        "Check power, network, controller, cable, probe placement, and visible device status."
      ),
      step("Take an independent measurement with a verified instrument when available."),
      step(
        "Record the independent value, instrument identity, time, and units without overwriting the original stream."
      ),
      step("Restore the connection only through the documented integration procedure."),
      step("Confirm new readings are current and plausible before closing the issue."),
      step(
        "Create a maintenance task or documented exception when the stream remains unavailable or disagrees with the independent check."
      )
    ]
  },
  {
    key: "environment_excursion_response",
    version: 2,
    title: "Environmental Excursion Response",
    category: "other",
    summary:
      "A controlled response to a recorded out-of-range condition without inventing cause, duration, or crop impact.",
    estimatedDurationMinutes: 25,
    safetyNotes:
      "Follow the applicable emergency plan for unsafe heat, electrical, gas, water, or air-quality conditions; stop and contact the responsible person when no plan is documented.",
    checklist: [
      step(
        "Confirm the area, metric, units, reading source, event time, and applicable documented limit."
      ),
      step("Validate the reading with another verified source when practical."),
      step(
        "Record the observed equipment, area, and crop conditions before changing settings."
      ),
      step(
        "Identify immediate safety or containment needs and notify the responsible person."
      ),
      step("Apply only a reviewed corrective action within the operator's authority."),
      step(
        "Record follow-up measurements and whether the condition returned to the documented range."
      ),
      step(
        "Create a documented exception or investigation when cause, duration, impact, or resolution remains uncertain."
      )
    ]
  },
  {
    key: "post_harvest_area_readiness",
    version: 2,
    title: "Post-Harvest Area Readiness",
    category: "harvest",
    summary:
      "A crop-neutral pre-use review for a harvest, drying, curing, processing, or storage area.",
    estimatedDurationMinutes: 30,
    safetyNotes:
      "Use crop-, product-, and jurisdiction-specific handling procedures reviewed for this workspace. This starter does not set release criteria.",
    checklist: [
      step(
        "Confirm the intended area, crop or batch, process stage, and responsible team."
      ),
      step(
        "Verify the area was cleaned, inspected, and released under the documented sanitation procedure."
      ),
      step(
        "Confirm required racks, containers, labels, scales, instruments, and monitoring devices are present and identified."
      ),
      step(
        "Record current environmental readings and instrument timestamps without estimating missing values."
      ),
      step(
        "Compare conditions with the reviewed process limits for this exact stage; record missing limits instead of inventing them."
      ),
      step("Check material flow, separation, traceability, access, and emergency paths."),
      step(
        "Document unresolved readiness issues and obtain the required release decision before use."
      )
    ]
  }
];

export function standardSopContent(template: StandardSopTemplate) {
  return template.checklist.map((item) => item.step).join("\n");
}
