import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createGrowpathModuleRecord,
  listGrowpathModuleRecords,
  type GrowpathModuleRecord
} from "@/api/growpathModules";

type Props = {
  growId: string;
  plantId?: string;
  selectedProjectId: string;
  onSelectProject: (project: GrowpathModuleRecord | null) => void;
  onOpenPhEc: () => void;
};

function recordId(record: GrowpathModuleRecord) {
  return String(record.id || record._id || "");
}

function projectIdFor(record: GrowpathModuleRecord) {
  return String(record.inputs?.projectId || record.payload?.projectId || "");
}

function summary(record: GrowpathModuleRecord) {
  const output = record.outputs || {};
  if (record.recordType === "crop_steering_entry") {
    return [output.phase, output.pressureLevel, output.recoveryStatus]
      .filter(Boolean)
      .join(" · ");
  }
  return [output.phStatus, output.runoffPHStatus, output.runoffECStatus]
    .filter(Boolean)
    .join(" · ");
}

export default function CropSteeringProjectPanel({
  growId,
  plantId,
  selectedProjectId,
  onSelectProject,
  onOpenPhEc
}: Props) {
  const [projects, setProjects] = useState<GrowpathModuleRecord[]>([]);
  const [entries, setEntries] = useState<GrowpathModuleRecord[]>([]);
  const [checks, setChecks] = useState<GrowpathModuleRecord[]>([]);
  const [name, setName] = useState("");
  const [intent, setIntent] = useState("");
  const [stage, setStage] = useState("");
  const [medium, setMedium] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const selectedProjectIdRef = useRef(selectedProjectId);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const load = useCallback(async () => {
    if (!growId) {
      setProjects([]);
      setEntries([]);
      setChecks([]);
      onSelectProject(null);
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const [projectRows, entryRows, checkRows] = await Promise.all([
        listGrowpathModuleRecords({
          recordType: "crop_steering_project",
          growId,
          limit: 100
        }),
        listGrowpathModuleRecords({
          recordType: "crop_steering_entry",
          growId,
          limit: 100
        }),
        listGrowpathModuleRecords({ recordType: "ph_ec_check", growId, limit: 100 })
      ]);
      setProjects(projectRows);
      setEntries(entryRows);
      setChecks(checkRows);
      const selected = projectRows.find(
        (row) => recordId(row) === selectedProjectIdRef.current
      );
      if (selected) onSelectProject(selected);
      else if (projectRows.length === 1) onSelectProject(projectRows[0]);
      else if (selectedProjectIdRef.current) onSelectProject(null);
    } catch (error: any) {
      setFeedback(error?.message || "Could not reload crop steering projects.");
    } finally {
      setBusy(false);
    }
  }, [growId, onSelectProject]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedEntries = useMemo(
    () => entries.filter((row) => projectIdFor(row) === selectedProjectId),
    [entries, selectedProjectId]
  );
  const selectedChecks = useMemo(
    () => checks.filter((row) => projectIdFor(row) === selectedProjectId),
    [checks, selectedProjectId]
  );

  async function createProject() {
    if (!growId || !name.trim() || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const project = await createGrowpathModuleRecord({
        recordType: "crop_steering_project",
        title: name.trim(),
        status: "active",
        growId,
        plantId: plantId || null,
        phenoPlantId: plantId || null,
        inputs: {
          cropType: "cannabis",
          cannabisContext: true,
          steeringIntent: intent.trim() || null,
          stage: stage.trim() || null,
          medium: medium.trim() || null,
          notes: notes.trim() || null
        },
        outputs: {
          projectStatus: "active",
          entryCount: 0,
          phEcCheckCount: 0
        },
        payload: {
          steeringIntent: intent.trim() || null,
          stage: stage.trim() || null,
          medium: medium.trim() || null,
          notes: notes.trim() || null
        },
        methodIds: ["crop-steering", "soil-nutrients"],
        sourceIds: [],
        limitations: [
          "Project targets are owner-entered planning context; each steering decision still requires current measurements and plant-response evidence."
        ],
        tags: ["crop_steering_project", intent.trim(), stage.trim()].filter(Boolean)
      });
      setProjects((current) => [project, ...current]);
      onSelectProject(project);
      setName("");
      setNotes("");
      setFeedback("Crop steering project created and selected.");
    } catch (error: any) {
      setFeedback(error?.message || "Could not create crop steering project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>1. Create or select a steering project</Text>
          <Text style={styles.help}>
            The project groups repeated steering entries and pH/EC checks so response can
            be compared over time.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reload crop steering projects"
          disabled={busy || !growId}
          onPress={() => void load()}
          style={[styles.smallButton, (busy || !growId) && styles.disabled]}
        >
          <Text style={styles.smallButtonText}>{busy ? "Loading…" : "Reload"}</Text>
        </Pressable>
      </View>

      {projects.length ? (
        <View style={styles.projectList}>
          {projects.map((project) => {
            const id = recordId(project);
            const selected = id === selectedProjectId;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Select crop steering project ${project.title}`}
                onPress={() => onSelectProject(project)}
                style={[styles.projectPill, selected && styles.projectPillSelected]}
              >
                <Text
                  style={[
                    styles.projectPillText,
                    selected && styles.projectPillTextSelected
                  ]}
                >
                  {project.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>No crop steering project is saved for this grow.</Text>
      )}

      <TextInput
        accessibilityLabel="Crop steering project name"
        value={name}
        onChangeText={setName}
        placeholder="Project name, for example Flower Room P1 steering"
        style={styles.input}
      />
      <View style={styles.twoColumn}>
        <TextInput
          accessibilityLabel="Crop steering project intent"
          value={intent}
          onChangeText={setIntent}
          placeholder="Intent: vegetative, generative, recovery, finish"
          style={[styles.input, styles.flex]}
        />
        <TextInput
          accessibilityLabel="Crop steering project stage"
          value={stage}
          onChangeText={setStage}
          placeholder="Stage"
          style={[styles.input, styles.flex]}
        />
      </View>
      <TextInput
        accessibilityLabel="Crop steering project medium"
        value={medium}
        onChangeText={setMedium}
        placeholder="Medium or substrate"
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Crop steering project notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Project boundaries, measurement method, stop conditions"
        multiline
        style={[styles.input, styles.multiline]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create crop steering project"
        disabled={!growId || !name.trim() || busy}
        onPress={() => void createProject()}
        style={[
          styles.primaryButton,
          (!growId || !name.trim() || busy) && styles.disabled
        ]}
      >
        <Text style={styles.primaryButtonText}>Create project</Text>
      </Pressable>

      {selectedProjectId ? (
        <View style={styles.history}>
          <Text style={styles.title}>Selected project history</Text>
          <Text style={styles.help}>
            {selectedEntries.length} steering entr
            {selectedEntries.length === 1 ? "y" : "ies"}
            {" · "}
            {selectedChecks.length} pH/EC check{selectedChecks.length === 1 ? "" : "s"}
          </Text>
          {[...selectedEntries, ...selectedChecks].slice(0, 4).map((record) => (
            <View
              key={`${record.recordType}:${recordId(record)}`}
              style={styles.historyRow}
            >
              <Text style={styles.historyTitle}>{record.title}</Text>
              <Text style={styles.historyMeta}>
                {summary(record) || record.recordType.replaceAll("_", " ")}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open linked pH and EC range check"
            onPress={onOpenPhEc}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Run linked pH / EC check</Text>
          </Pressable>
        </View>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    gap: 10
  },
  headingRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headingCopy: { flex: 1, gap: 4 },
  title: { color: "#14532D", fontSize: 16, fontWeight: "800" },
  help: { color: "#355E45", lineHeight: 19 },
  empty: { color: "#64748B", fontStyle: "italic" },
  projectList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  projectPill: {
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999
  },
  projectPillSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  projectPillText: { color: "#166534", fontWeight: "700" },
  projectPillTextSelected: { color: "#FFFFFF" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A"
  },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex: { flex: 1, minWidth: 150 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 10,
    padding: 12
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 10,
    padding: 11
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  smallButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  smallButtonText: { color: "#166534", fontWeight: "700" },
  disabled: { opacity: 0.45 },
  history: {
    borderTopWidth: 1,
    borderColor: "#BBF7D0",
    paddingTop: 12,
    gap: 8
  },
  historyRow: {
    borderLeftWidth: 3,
    borderColor: "#22C55E",
    backgroundColor: "#FFFFFF",
    padding: 9,
    gap: 2
  },
  historyTitle: { color: "#14532D", fontWeight: "700" },
  historyMeta: { color: "#64748B", fontSize: 12 },
  feedback: { color: "#166534", fontWeight: "600" }
});
