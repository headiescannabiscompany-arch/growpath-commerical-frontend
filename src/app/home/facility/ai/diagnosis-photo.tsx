import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { callAiTool } from "@/features/ai/callAi";
import { AiContextBlock } from "@/features/ai/AiContextBlock";

export default function PhotoDiagnosisScreen() {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [growId, setGrowId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [mediaLabel, setMediaLabel] = useState<string | null>(null);

  const [uiError, setUiError] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const canRun = useMemo(
    () => Boolean(facilityId && mediaLabel),
    [facilityId, mediaLabel]
  );

  async function run() {
    if (!facilityId) return;

    setRunning(true);
    setUiError(null);
    setResult(null);

    try {
      const res = await callAiTool(facilityId, {
        tool: "diagnosis",
        fn: "analyzePhoto",
        args: { photo: mediaLabel }, // Step 2B: replace with mediaId + metadata
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
    <ScreenBoundary name="facility.ai.diagnosisPhoto">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>Photo Diagnosis</Text>

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

            {uiError ? (
              <InlineError
                title={uiError.title || "Diagnosis failed"}
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
                {running ? "Analyzing…" : "Analyze Photo"}
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
