import React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/api/apiRequest";

const GROWS_CREATE_PATH = "/api/personal/grows";

type SystemPreset = "soil" | "coco" | "hydro";
type AnchorType = "vegStart" | "flowerDay1";

export default function NewGrowScreen() {
  const router = useRouter();
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const [name, setName] = React.useState("");
  const [systemPreset, setSystemPreset] = React.useState<SystemPreset>("soil");
  const [anchorDateType, setAnchorDateType] = React.useState<AnchorType>("vegStart");
  const [anchorDate, setAnchorDate] = React.useState("");
  const [timeZone, setTimeZone] = React.useState(defaultTimeZone);

  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [flipDate, setFlipDate] = React.useState("");
  const [potSize, setPotSize] = React.useState("");
  const [potCount, setPotCount] = React.useState("");
  const [cultivar, setCultivar] = React.useState("");
  const [targetVpdBand, setTargetVpdBand] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isValid = name.trim().length > 0 && anchorDate.trim().length > 0;

  const onCreate = React.useCallback(async () => {
    if (!isValid) {
      setError("Name and anchor date are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiRequest(GROWS_CREATE_PATH, {
        method: "POST",
        body: {
          name: name.trim(),
          systemPreset,
          anchorDateType,
          anchorDate: anchorDate.trim(),
          timezone: timeZone.trim() || "UTC",
          flipDate: flipDate.trim() || undefined,
          potSize: potSize.trim() || undefined,
          potCount: potCount ? Number(potCount) : undefined,
          cultivar: cultivar.trim() || undefined,
          targetVpdBand: targetVpdBand.trim() || undefined,
          notes: notes.trim() || undefined
        }
      });

      router.replace(`/home/personal/grows?r=${Date.now()}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create grow.");
    } finally {
      setSaving(false);
    }
  }, [
    anchorDate,
    anchorDateType,
    cultivar,
    flipDate,
    isValid,
    name,
    notes,
    potCount,
    potSize,
    router,
    systemPreset,
    targetVpdBand,
    timeZone
  ]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>New Grow</Text>
      <Text style={{ color: "#475569" }}>
        Set required anchors so logs, tools, and tasks can map to this grow correctly.
      </Text>

      {error ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#FCA5A5",
            borderRadius: 10,
            padding: 10,
            backgroundColor: "#FEF2F2"
          }}
        >
          <Text style={{ color: "#7F1D1D", fontWeight: "700" }}>{error}</Text>
        </View>
      ) : null}

      <Text style={{ fontWeight: "700" }}>Grow name</Text>
      <TextInput
        testID="input-grow-name"
        value={name}
        onChangeText={setName}
        placeholder="Blueberry Muffin Run 3"
        style={{
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10
        }}
      />

      <Text style={{ fontWeight: "700" }}>System preset</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["soil", "coco", "hydro"] as SystemPreset[]).map((preset) => (
          <Pressable
            key={preset}
            onPress={() => setSystemPreset(preset)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: systemPreset === preset ? "#166534" : "#CBD5E1",
              backgroundColor: systemPreset === preset ? "#166534" : "#FFFFFF"
            }}
          >
            <Text style={{ color: systemPreset === preset ? "#FFFFFF" : "#0F172A" }}>
              {preset}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontWeight: "700" }}>Anchor type</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(
          [
            { key: "vegStart", label: "Veg start" },
            { key: "flowerDay1", label: "Flower day 1" }
          ] as { key: AnchorType; label: string }[]
        ).map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setAnchorDateType(opt.key)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: anchorDateType === opt.key ? "#166534" : "#CBD5E1",
              backgroundColor: anchorDateType === opt.key ? "#166534" : "#FFFFFF"
            }}
          >
            <Text style={{ color: anchorDateType === opt.key ? "#FFFFFF" : "#0F172A" }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontWeight: "700" }}>Anchor date (YYYY-MM-DD)</Text>
      <TextInput
        value={anchorDate}
        onChangeText={setAnchorDate}
        placeholder="2026-02-27"
        style={{
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10
        }}
      />

      <Text style={{ fontWeight: "700" }}>Timezone</Text>
      <TextInput
        value={timeZone}
        onChangeText={setTimeZone}
        placeholder="America/New_York"
        style={{
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10
        }}
      />

      <Pressable
        onPress={() => setShowAdvanced((prev) => !prev)}
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 10,
          padding: 10
        }}
      >
        <Text style={{ fontWeight: "700" }}>
          {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
        </Text>
      </Pressable>

      {showAdvanced ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: "700" }}>Flip date (optional)</Text>
          <TextInput
            value={flipDate}
            onChangeText={setFlipDate}
            placeholder="YYYY-MM-DD"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />

          <Text style={{ fontWeight: "700" }}>Pot size (optional)</Text>
          <TextInput
            value={potSize}
            onChangeText={setPotSize}
            placeholder="5 gal"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />

          <Text style={{ fontWeight: "700" }}>Pot count (optional)</Text>
          <TextInput
            value={potCount}
            onChangeText={setPotCount}
            placeholder="4"
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />

          <Text style={{ fontWeight: "700" }}>Cultivar (optional)</Text>
          <TextInput
            value={cultivar}
            onChangeText={setCultivar}
            placeholder="Blue Dream"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />

          <Text style={{ fontWeight: "700" }}>Target VPD band (optional)</Text>
          <TextInput
            value={targetVpdBand}
            onChangeText={setTargetVpdBand}
            placeholder="0.9-1.2 kPa"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />

          <Text style={{ fontWeight: "700" }}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any setup notes"
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 80,
              textAlignVertical: "top"
            }}
          />
        </View>
      ) : null}

      <Pressable
        testID="btn-save-grow"
        onPress={onCreate}
        disabled={saving || !isValid}
        style={{
          marginTop: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: "#166534",
          borderRadius: 10,
          backgroundColor: "#166534",
          opacity: saving || !isValid ? 0.6 : 1,
          alignSelf: "flex-start"
        }}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Create grow</Text>
        )}
      </Pressable>
    </View>
  );
}
