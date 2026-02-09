import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { callAiTool } from "@/features/ai/callAi";
import { AiContextBlock } from "@/features/ai/AiContextBlock";

type IngredientRow = { name: string; amount: string; unit: string };

export default function TemplateRunnerScreen() {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [growId, setGrowId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [mediaLabel, setMediaLabel] = useState<string | null>(null);

  const [target, setTarget] = useState<"soil" | "npk">("soil");
  const [rows, setRows] = useState<IngredientRow[]>([
    { name: "Kelp meal", amount: "1", unit: "tbsp" },
    { name: "Worm castings", amount: "2", unit: "cups" }
  ]);

  const [uiError, setUiError] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const canRun = useMemo(() => Boolean(facilityId), [facilityId]);

  function updateRow(i: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", amount: "", unit: "" }]);
  }

  async function run() {
    if (!facilityId) return;

    setRunning(true);
    setUiError(null);
    setResult(null);

    try {
      const args = {
        target,
        ingredients: rows
          .map((r) => ({
            name: r.name.trim(),
            amount: r.amount.trim(),
            unit: r.unit.trim()
          }))
          .filter((r) => r.name.length > 0)
      };

      const res = await callAiTool(facilityId, {
        tool: target,
        fn: "analyzeTemplate",
        args,
        context: {
          facilityId,
          growId,
          roomId,
          mediaId: null,
          notes: notes || null
        }
      });

      setResult(res);
    } catch (e) {
      setUiError(handleApiError(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScreenBoundary name="facility.ai.templateRunner">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>Template Runner</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <AiContextBlock
              growId={growId}
              roomId={roomId}
              notes={notes}
              mediaLabel={mediaLabel}
              onChangeGrowId={setGrowId}
              onChangeRoomId={setRoomId}
              onChangeNotes={setNotes}
              onPickPhoto={() => setMediaLabel("photo-stub.jpg")}
              error={null}
            />

            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Template type</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setTarget("soil")}
                  style={{
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                    opacity: target === "soil" ? 1 : 0.5
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>Soil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTarget("npk")}
                  style={{
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 10,
                    opacity: target === "npk" ? 1 : 0.5
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>NPK</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ opacity: 0.7 }}>
                Step 2B upgrades these to dropdown ingredient pickers + unit normalization
                + CEC/ratio helpers.
              </Text>
            </View>

            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Ingredients (Step 2B: dropdowns)</Text>

              {rows.map((r, idx) => (
                <View
                  key={idx}
                  style={{ borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 }}
                >
                  <Text style={{ fontWeight: "800" }}>Row {idx + 1}</Text>

                  <TextInput
                    value={r.name}
                    onChangeText={(v) => updateRow(idx, { name: v })}
                    placeholder="Ingredient name"
                    style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
                  />

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={r.amount}
                      onChangeText={(v) => updateRow(idx, { amount: v })}
                      placeholder="Amount"
                      keyboardType="numeric"
                      style={{ borderWidth: 1, borderRadius: 10, padding: 10, flex: 1 }}
                    />
                    <TextInput
                      value={r.unit}
                      onChangeText={(v) => updateRow(idx, { unit: v })}
                      placeholder="Unit"
                      style={{ borderWidth: 1, borderRadius: 10, padding: 10, flex: 1 }}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={addRow}
                style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
              >
                <Text style={{ fontWeight: "900" }}>+ Add ingredient</Text>
              </TouchableOpacity>
            </View>

            {uiError ? (
              <InlineError
                title={uiError.title || "Template run failed"}
                message={uiError.message}
                requestId={uiError.requestId}
              />
            ) : null}

            <TouchableOpacity
              onPress={run}
              disabled={!canRun || running}
              style={{
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                opacity: !canRun || running ? 0.5 : 1
              }}
            >
              <Text style={{ fontWeight: "900" }}>
                {running ? "Running…" : "Run Template"}
              </Text>
            </TouchableOpacity>

            {result ? (
              <View style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}>
                <Text style={{ fontWeight: "900" }}>Result (raw receipt)</Text>
                <Text selectable style={{ opacity: 0.85 }}>
                  {JSON.stringify(result, null, 2)}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenBoundary>
  );
}
