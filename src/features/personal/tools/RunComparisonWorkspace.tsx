import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import {
  compareSavedGrows,
  saveToolRunToLog,
  type RunComparisonObjective,
  type RunComparisonScope,
  type ToolRun
} from "@/api/toolRuns";
import { useEntitlements } from "@/entitlements";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { hasLocalPaidPreviewOverride } from "@/utils/localPaidPreview";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { radius } from "@/theme/theme";

type RunComparisonWorkspaceProps = {
  initialGrowId?: string;
  showIntro?: boolean;
};

const SCOPES: Array<{
  value: RunComparisonScope;
  label: string;
  description: string;
}> = [
  {
    value: "whole_run",
    label: "Whole saved run",
    description:
      "Broad history review; stage averages may hide important timing differences."
  },
  {
    value: "vegetative",
    label: "Vegetative / early growth",
    description:
      "Use only records explicitly linked to seedling, clone, propagation or veg."
  },
  {
    value: "flowering_fruiting",
    label: "Flowering / fruiting",
    description: "Compare records explicitly linked to reproductive growth."
  },
  {
    value: "harvest_final",
    label: "Harvest / final outcome",
    description: "Compare recorded yield and final-quality evidence with matching units."
  },
  {
    value: "post_harvest",
    label: "Post-harvest / dry-cure",
    description: "Compare saved post-harvest duration, conditions and quality evidence."
  }
];

const OBJECTIVES: Array<{
  value: RunComparisonObjective;
  label: string;
  description: string;
}> = [
  {
    value: "balanced_review",
    label: "Balanced evidence review",
    description:
      "Do not name an overall winner; inspect every comparable recorded metric."
  },
  {
    value: "yield",
    label: "Recorded yield",
    description: "Requires matching yield units for every selected grow."
  },
  {
    value: "final_quality",
    label: "Final quality",
    description: "Requires the same saved quality scale or rubric."
  },
  {
    value: "issue_reduction",
    label: "Issue reduction",
    description: "Uses recorded diagnosis counts and keeps severity/context visible."
  },
  {
    value: "task_execution",
    label: "Task execution",
    description:
      "Compares completion rates only where tasks are linked to the selected scope."
  },
  {
    value: "cycle_time",
    label: "Cycle time",
    description: "Requires explicit start and completion/harvest dates."
  }
];

function growIdOf(grow: PersonalGrow) {
  return String(grow.id || (grow as any)._id || (grow as any).growId || "");
}

function cleanToolRunId(toolRun: ToolRun | null) {
  return String(toolRun?.id || toolRun?._id || "");
}

function evidenceTotal(snapshot: Record<string, any>) {
  return Object.entries(snapshot?.evidenceInventory || {}).reduce(
    (total, [key, value]) =>
      key === "excludedSyntheticTelemetryPoints" || typeof value !== "number"
        ? total
        : total + value,
    0
  );
}

function EvidenceDetails({ outputs }: { outputs: Record<string, any> }) {
  const snapshots = Array.isArray(outputs.snapshots) ? outputs.snapshots : [];
  const differences = Array.isArray(outputs.keyDifferences) ? outputs.keyDifferences : [];
  const drivers = Array.isArray(outputs.associatedDrivers)
    ? outputs.associatedDrivers
    : [];
  const missing = Array.isArray(outputs.missingData) ? outputs.missingData : [];
  return (
    <View style={styles.details}>
      <Text style={styles.detailsTitle}>Evidence inventory by grow</Text>
      {snapshots.map((snapshot: any) => (
        <View key={String(snapshot.growId)} style={styles.evidenceCard}>
          <Text style={styles.evidenceTitle}>{snapshot.name}</Text>
          <Text style={styles.metaText}>
            {[snapshot.crop, snapshot.cultivar, snapshot.recordedStage]
              .filter(Boolean)
              .join(" · ") || "Crop, cultivar and stage are not fully recorded"}
          </Text>
          <Text style={styles.evidenceText}>
            Logs {snapshot.evidenceInventory?.logs || 0} · Tasks {snapshot.taskCount || 0}
            {" · "}ToolRuns {snapshot.evidenceInventory?.toolRuns || 0} · Diagnoses{" "}
            {snapshot.evidenceInventory?.diagnoses || 0} · Telemetry{" "}
            {snapshot.evidenceInventory?.telemetryPoints || 0}
          </Text>
          {snapshot.evidenceInventory?.excludedSyntheticTelemetryPoints ? (
            <Text style={styles.cautionText}>
              Excluded {snapshot.evidenceInventory.excludedSyntheticTelemetryPoints}{" "}
              synthetic telemetry point(s).
            </Text>
          ) : null}
        </View>
      ))}

      <Text style={styles.detailsTitle}>Recorded differences</Text>
      {differences.length ? (
        differences.slice(0, 20).map((difference: any, index: number) => (
          <View
            key={`${difference.category}-${difference.comparisonGrowId}-${index}`}
            style={styles.evidenceCard}
          >
            <Text style={styles.evidenceTitle}>{difference.label}</Text>
            <Text style={styles.evidenceText}>
              {difference.referenceRun}: {difference.referenceValue} {difference.unit} →{" "}
              {difference.comparisonRun}: {difference.comparisonValue} {difference.unit}
            </Text>
            <Text style={styles.metaText}>{difference.interpretation}</Text>
            <Text style={styles.cautionText}>{difference.limitation}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No matching recorded values were found. Fill the listed evidence gaps before
          drawing a comparison.
        </Text>
      )}

      {drivers.length ? (
        <>
          <Text style={styles.detailsTitle}>Possible associations—not causes</Text>
          {drivers.slice(0, 12).map((driver: any, index: number) => (
            <View key={`${driver.driver}-${index}`} style={styles.driverCard}>
              <Text style={styles.evidenceTitle}>{driver.driver}</Text>
              <Text style={styles.evidenceText}>{driver.evidence}</Text>
              <Text style={styles.metaText}>{driver.possibleAssociation}</Text>
              <Text style={styles.cautionText}>
                Alternatives: {(driver.alternatives || []).join(", ") || "not recorded"}
              </Text>
              <Text style={styles.nextCheckText}>Next check: {driver.nextCheck}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.detailsTitle}>Missing or non-comparable evidence</Text>
      {missing.length ? (
        missing.slice(0, 30).map((item: any, index: number) => (
          <Text key={`${item.growId}-${item.field}-${index}`} style={styles.missingText}>
            • {item.growName}: {item.field}. {item.reason}
          </Text>
        ))
      ) : (
        <Text style={styles.emptyText}>No missing comparison fields were reported.</Text>
      )}
    </View>
  );
}

export default function RunComparisonWorkspace({
  initialGrowId = "",
  showIntro = true
}: RunComparisonWorkspaceProps) {
  const entitlements = useEntitlements();
  const paidPreview = hasLocalPaidPreviewOverride();
  const locked =
    !paidPreview && String(entitlements.plan || "free").toLowerCase() === "free";
  const [grows, setGrows] = useState<PersonalGrow[]>([]);
  const [selected, setSelected] = useState<string[]>(
    initialGrowId ? [initialGrowId] : []
  );
  const [referenceGrowId, setReferenceGrowId] = useState(initialGrowId);
  const [scope, setScope] = useState<RunComparisonScope>("whole_run");
  const [objective, setObjective] = useState<RunComparisonObjective>("balanced_review");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<Record<string, any> | null>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);

  useEffect(() => {
    if (locked) return;
    let active = true;
    setLoading(true);
    listPersonalGrows()
      .then((rows) => {
        if (!active) return;
        setGrows(rows);
      })
      .catch(() => {
        if (active) setError("Unable to load saved grows.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locked]);

  useEffect(() => {
    if (!initialGrowId) return;
    setSelected((current) =>
      current.includes(initialGrowId) ? current : [initialGrowId, ...current].slice(0, 5)
    );
    setReferenceGrowId((current) => current || initialGrowId);
  }, [initialGrowId]);

  const selectedGrows = useMemo(
    () =>
      selected.map((id) => grows.find((grow) => growIdOf(grow) === id)).filter(Boolean),
    [grows, selected]
  );

  if (locked) {
    return (
      <LockedScreen
        title="Run-To-Run Comparison is a Pro tool"
        message="Upgrade to compare saved grow histories, evidence coverage, outcomes, and next-run decisions."
      />
    );
  }

  function resetResult() {
    setOutputs(null);
    setToolRun(null);
    setError("");
  }

  function toggleGrow(id: string) {
    if (!id) return;
    resetResult();
    setSelected((current) => {
      if (current.includes(id)) {
        const next = current.filter((value) => value !== id);
        if (referenceGrowId === id) setReferenceGrowId(next[0] || "");
        return next;
      }
      if (current.length >= 5) {
        setError("Compare no more than five grows at once.");
        return current;
      }
      const next = [...current, id];
      if (!referenceGrowId) setReferenceGrowId(id);
      return next;
    });
  }

  async function runComparison() {
    if (running) return;
    if (selected.length < 2) {
      setError("Select at least two saved grows.");
      return;
    }
    const reference = selected.includes(referenceGrowId) ? referenceGrowId : selected[0];
    setRunning(true);
    setError("");
    try {
      const response = await compareSavedGrows({
        growIds: selected,
        referenceGrowId: reference,
        scope,
        objective,
        title,
        notes
      });
      setReferenceGrowId(reference);
      setOutputs(response.outputs);
      setToolRun(response.toolRun);
    } catch (reason: any) {
      setError(reason?.message || "Unable to compare saved grow histories.");
    } finally {
      setRunning(false);
    }
  }

  async function saveComparisonLog() {
    const id = cleanToolRunId(toolRun);
    if (!id || !outputs || !referenceGrowId) throw new Error("Run the comparison first.");
    await saveToolRunToLog(id, {
      growId: referenceGrowId,
      linkedGrowId: referenceGrowId,
      linkedToolRunId: id,
      title: outputs.comparisonTitle || "Saved grow comparison",
      notes: outputs.summary || "Saved grow-history comparison"
    });
  }

  async function createNextRunTasks() {
    const id = cleanToolRunId(toolRun);
    if (!id || !outputs || !referenceGrowId) throw new Error("Run the comparison first.");
    const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
    const tasks = planned.slice(0, 8).map((task: any, index: number) => {
      const due = new Date();
      due.setDate(due.getDate() + Number(task.dueInDays || index + 1));
      return {
        title: String(task.title || `Run comparison follow-up ${index + 1}`),
        description: String(
          task.description || "Review the saved comparison before changing the next run."
        ),
        priority:
          task.priority === "high" || task.priority === "low"
            ? task.priority
            : ("medium" as const),
        dueDate: due.toISOString().slice(0, 10),
        allDay: true,
        calendarType: "run_comparison_followup",
        sourceStage: String(task.sourceStage || `run_comparison_followup_${index + 1}`),
        reminderPlan: {
          label: "24 hours before",
          channels: ["in_app"],
          reminders: [{ offsetMinutes: -1440 }]
        }
      };
    });
    const response = await saveToolRunAndCreateTasks({
      growId: referenceGrowId,
      toolKey: "run-comparison",
      toolRunId: id,
      input: { growIds: selected, referenceGrowId, scope, objective, title, notes },
      output: outputs,
      tasks
    });
    if (!response.ok) throw new Error(response.error);
  }

  const totalEvidence = outputs
    ? (outputs.snapshots || []).reduce(
        (total: number, snapshot: Record<string, any>) => total + evidenceTotal(snapshot),
        0
      )
    : 0;

  return (
    <View style={styles.workspace}>
      {showIntro ? (
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Compare saved evidence—not demo rows</Text>
          <Text style={styles.introText}>
            Select two to five owned grows. GrowPath inventories their saved logs, tasks,
            ToolRuns, diagnoses, telemetry, harvest and post-harvest records, then
            compares only matching measured values.
          </Text>
          <Text style={styles.cautionText}>
            The deterministic comparison uses no AI credit. Missing values stay unknown,
            and recorded associations are never presented as proof of cause.
          </Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. Select saved grows</Text>
        <Text style={styles.sectionHelp}>
          Select 2–5 grows. Mark the run you want to use as the reference—not an automatic
          winner.
        </Text>
        {loading ? <ActivityIndicator /> : null}
        {!loading && !grows.length ? (
          <Text style={styles.emptyText}>
            No saved grows are available yet. Create and track at least two grows first.
          </Text>
        ) : null}
        {grows.map((grow) => {
          const id = growIdOf(grow);
          const active = selected.includes(id);
          const reference = referenceGrowId === id;
          return (
            <View key={id} style={[styles.growCard, active && styles.growCardSelected]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Compare saved grow ${grow.name || id}`}
                onPress={() => toggleGrow(id)}
                style={styles.growToggle}
              >
                <Text style={[styles.growName, active && styles.selectedText]}>
                  {grow.name || id}
                </Text>
                <Text style={[styles.metaText, active && styles.selectedSubtext]}>
                  {[grow.cropCommonName, grow.cultivar || grow.strain, grow.status]
                    .filter(Boolean)
                    .join(" · ") || "Crop, cultivar and status not fully recorded"}
                </Text>
              </Pressable>
              {active ? (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reference }}
                  accessibilityLabel={`Use ${grow.name || id} as reference run`}
                  onPress={() => {
                    resetResult();
                    setReferenceGrowId(id);
                  }}
                  style={[styles.referenceButton, reference && styles.referenceButtonOn]}
                >
                  <Text
                    style={[
                      styles.referenceButtonText,
                      reference && styles.referenceButtonTextOn
                    ]}
                  >
                    {reference ? "Reference run" : "Make reference"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        <Text style={styles.selectionCount}>
          {selectedGrows.length || selected.length} selected ·{" "}
          {referenceGrowId ? "reference chosen" : "choose a reference"}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Choose equivalent scope</Text>
        {SCOPES.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: scope === option.value }}
            accessibilityLabel={`Run comparison scope: ${option.label}`}
            onPress={() => {
              resetResult();
              setScope(option.value);
            }}
            style={[styles.optionCard, scope === option.value && styles.optionCardOn]}
          >
            <Text style={styles.optionTitle}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>3. Choose the decision objective</Text>
        {OBJECTIVES.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: objective === option.value }}
            accessibilityLabel={`Run comparison objective: ${option.label}`}
            onPress={() => {
              resetResult();
              setObjective(option.value);
            }}
            style={[styles.optionCard, objective === option.value && styles.optionCardOn]}
          >
            <Text style={styles.optionTitle}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        ))}
        <Text style={styles.fieldLabel}>Report title (optional)</Text>
        <TextInput
          accessibilityLabel="Run comparison report title"
          value={title}
          onChangeText={(value) => {
            resetResult();
            setTitle(value);
          }}
          placeholder="e.g. Spring room A vs summer room A"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>
          Owner context or decision question (optional)
        </Text>
        <TextInput
          accessibilityLabel="Run comparison owner context"
          value={notes}
          onChangeText={(value) => {
            resetResult();
            setNotes(value);
          }}
          placeholder="What stayed constant? What changed intentionally? What decision are you making?"
          multiline
          style={[styles.input, styles.multiline]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare saved grow histories"
        disabled={selected.length < 2 || running}
        onPress={runComparison}
        style={[
          styles.runButton,
          (selected.length < 2 || running) && styles.disabledButton
        ]}
      >
        <Text style={styles.runButtonText}>
          {running
            ? "Comparing saved evidence..."
            : `Compare ${selected.length} saved grows`}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {outputs ? (
        <ToolResultSurface
          title="Run-To-Run Comparison result"
          status={String(outputs.evidenceStatus || "saved")}
          summary={String(
            outputs.summary || outputs.providerLabel || "Saved grow comparison"
          )}
          metrics={[
            {
              key: "grows",
              label: "Saved grows",
              value: String(outputs.snapshots?.length || selected.length)
            },
            {
              key: "evidence",
              label: "Evidence records",
              value: String(totalEvidence)
            },
            {
              key: "metrics",
              label: "Comparable metrics",
              value: String(outputs.structuredSummary?.sharedMetricCount || 0)
            },
            {
              key: "differences",
              label: "Differences found",
              value: String(outputs.keyDifferences?.length || 0)
            },
            {
              key: "missing",
              label: "Evidence gaps",
              value: String(outputs.missingData?.length || 0)
            },
            {
              key: "confidence",
              label: "Confidence",
              value: String(outputs.confidence || "low")
            }
          ]}
          inputs={{
            growIds: selected,
            referenceGrowId,
            scope,
            objective,
            title,
            notes
          }}
          outputs={{
            methodIds: outputs.methodIds,
            sourceIds: outputs.sourceIds,
            evidenceStatus: outputs.evidenceStatus,
            providerLabel: outputs.providerLabel,
            objectiveLeader: outputs.objectiveLeader
          }}
          notices={(outputs.limitations || []).map((message: string, index: number) => ({
            key: `limitation-${index}`,
            severity: index === 0 ? "high" : "medium",
            message
          }))}
          recommendations={outputs.recommendations || []}
          uncertainty={outputs.limitations || []}
          confidence={outputs.confidence || "low"}
          details={<EvidenceDetails outputs={outputs} />}
          actions={[
            {
              key: "save-comparison-log",
              label: "Save Comparison to Grow Log",
              variant: "secondary",
              disabled: !cleanToolRunId(toolRun),
              pendingLabel: "Saving...",
              successMessage: "Saved comparison to the reference grow log.",
              onPress: saveComparisonLog
            },
            {
              key: "create-next-run-tasks",
              label: "Create Reviewed Next-Run Tasks",
              variant: "secondary",
              disabled: !cleanToolRunId(toolRun),
              pendingLabel: "Creating...",
              successMessage: "Created next-run evidence tasks.",
              onPress: createNextRunTasks
            }
          ]}
          copyPayload={{
            growId: referenceGrowId,
            toolRunId: cleanToolRunId(toolRun),
            ...outputs
          }}
          footerMessage="Ask AI is optional and must use this same saved evidence, missing-data list and causation limits."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: { gap: 14 },
  introCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    padding: 14,
    gap: 8
  },
  introTitle: { color: "#14532D", fontSize: 18, fontWeight: "800" },
  introText: { color: "#14532D", lineHeight: 20 },
  sectionCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 9
  },
  sectionTitle: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  sectionHelp: { color: "#475569", lineHeight: 19 },
  growCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 8
  },
  growCardSelected: { borderColor: "#166534", backgroundColor: "#166534" },
  growToggle: { gap: 3 },
  growName: { color: "#0F172A", fontWeight: "800", fontSize: 15 },
  selectedText: { color: "#FFFFFF" },
  selectedSubtext: { color: "#DCFCE7" },
  metaText: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  referenceButton: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  referenceButtonOn: { backgroundColor: "#DCFCE7", borderColor: "#DCFCE7" },
  referenceButtonText: { color: "#166534", fontSize: 12, fontWeight: "800" },
  referenceButtonTextOn: { color: "#14532D" },
  selectionCount: { color: "#475569", fontSize: 12, fontWeight: "700" },
  optionCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 3
  },
  optionCardOn: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  optionTitle: { color: "#0F172A", fontWeight: "800" },
  optionDescription: { color: "#475569", fontSize: 12, lineHeight: 17 },
  fieldLabel: { color: "#334155", fontSize: 13, fontWeight: "800", marginTop: 4 },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 11,
    paddingVertical: 10
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  runButton: {
    borderRadius: radius.card,
    backgroundColor: "#166534",
    padding: 14,
    alignItems: "center"
  },
  disabledButton: { opacity: 0.45 },
  runButtonText: { color: "#FFFFFF", fontWeight: "800" },
  errorText: { color: "#B91C1C", fontWeight: "700" },
  emptyText: { color: "#64748B", lineHeight: 19 },
  details: { gap: 9 },
  detailsTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800", marginTop: 6 },
  evidenceCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 4
  },
  driverCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    padding: 10,
    gap: 4
  },
  evidenceTitle: { color: "#0F172A", fontWeight: "800" },
  evidenceText: { color: "#334155", lineHeight: 18 },
  cautionText: { color: "#92400E", fontSize: 12, lineHeight: 17 },
  nextCheckText: { color: "#166534", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  missingText: { color: "#7C2D12", lineHeight: 19 }
});
