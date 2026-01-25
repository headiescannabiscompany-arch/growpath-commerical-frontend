import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useComplianceLogs } from "../../hooks/useComplianceLogs";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import type { ComplianceLogType } from "../../types/compliance";

const TYPES: { label: string; value: ComplianceLogType }[] = [
  { label: "Daily Check", value: "DAILY_CHECK" },
  { label: "Sanitation", value: "SANITATION" },
  { label: "Pest Control", value: "PEST_CONTROL" },
  { label: "Nutrient Mix", value: "NUTRIENT_MIX" },
  { label: "IPM Spray", value: "IPM_SPRAY" },
  { label: "Equipment Cal", value: "EQUIPMENT_CAL" },
  { label: "Incident", value: "INCIDENT" },
  { label: "Other", value: "OTHER" }
];

export default function ComplianceLogsScreen() {
  const [type, setType] = useState<ComplianceLogType>("DAILY_CHECK");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const { data, isLoading, error, createLog, creating } = useComplianceLogs();
  const logs = Array.isArray(data) ? data : [];

  const submit = async () => {
    if (!title.trim()) return;
    await createLog({ type, title: title.trim(), notes: notes.trim() || undefined });
    setTitle("");
    setNotes("");
  };

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorState
        message="Failed to load compliance logs"
        onRetry={() => window.location.reload()}
      />
    );

  if (!logs || logs.length === 0) {
    return (
      <EmptyState
        title="No compliance logs yet"
        description="Record your first compliance log to stay audit-ready."
        actionLabel={creating ? "Saving..." : "Record Log"}
        onAction={submit}
      />
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
        Compliance Logs
      </Text>
      {/* Type selector (Phase-0 simple buttons) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TYPES.slice(0, 4).map((t) => {
          const active = t.value === type;
          return (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                opacity: active ? 1 : 0.6
              }}
            >
              <Text style={{ fontWeight: "600" }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Log title (required)"
        style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        multiline
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 10,
          minHeight: 80,
          marginBottom: 10
        }}
      />
      <Pressable
        onPress={submit}
        disabled={creating}
        style={{
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          alignItems: "center",
          opacity: creating ? 0.6 : 1,
          marginBottom: 16
        }}
      >
        <Text style={{ fontWeight: "700" }}>{creating ? "Saving..." : "Create Log"}</Text>
      </Pressable>
      <FlatList
        data={logs}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View
            style={{ padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 }}
          >
            <Text style={{ fontWeight: "800" }}>{item.title}</Text>
            <Text style={{ opacity: 0.7, marginTop: 2 }}>
              {item.type} • {new Date(item.createdAt).toLocaleString()}
            </Text>
            {!!item.notes && <Text style={{ marginTop: 8 }}>{item.notes}</Text>}
            <Text style={{ marginTop: 8, opacity: 0.65 }}>
              By:{" "}
              {item.createdBy?.name ||
                item.createdBy?.email ||
                item.createdBy?.userId ||
                "Unknown"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
