import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { callAiTool } from "@/features/ai/callAi";
import { AiContextBlock } from "@/features/ai/AiContextBlock";
import { formatAiReceipt } from "@/features/ai/formatAi";

export default function AskAiScreen() {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [growId, setGrowId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [mediaLabel, setMediaLabel] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [uiError, setUiError] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const canRun = useMemo(
    () => Boolean(facilityId && prompt.trim().length > 0),
    [facilityId, prompt]
  );

  async function run() {
    if (!facilityId) return;

    setRunning(true);
    setUiError(null);
    setResult(null);

    try {
      const res = await callAiTool(facilityId, {
        tool: "assistant",
        fn: "ask",
        args: { prompt },
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
    <ScreenBoundary name="facility.ai.ask">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>Ask AI</Text>

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

            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "900" }}>Your question</Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Ask anything. The AI must return uncertainty + options + recommendation tied to your goal."
                multiline
                style={{
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 110,
                  textAlignVertical: "top"
                }}
              />
              <Text style={{ opacity: 0.7 }}>
                Output contract: uncertainty • best-practice patterns • options/benefits •
                recommendation • you decide.
              </Text>
            </View>

            {uiError ? (
              <InlineError
                title={uiError.title || "AI call failed"}
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
                {running ? "Running…" : "Run Ask AI"}
              </Text>
            </TouchableOpacity>

            {result
              ? (() => {
                  const { formatted, raw } = formatAiReceipt(result);

                  return (
                    <View
                      style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}
                    >
                      <Text style={{ fontWeight: "900", fontSize: 16 }}>AI Answer</Text>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>1) Primary take</Text>
                        <Text>{formatted.primaryTake || formatted.rawText || "—"}</Text>
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>2) Probabilities</Text>
                        {Array.isArray(formatted.probabilities) &&
                        formatted.probabilities.length ? (
                          formatted.probabilities.map((x, idx) => (
                            <Text key={idx}>
                              • {x.label}: {Math.round((Number(x.p) || 0) * 100)}%
                            </Text>
                          ))
                        ) : (
                          <Text>—</Text>
                        )}
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>
                          3) What successful growers do
                        </Text>
                        <Text>{formatted.bestPractice || "—"}</Text>
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>
                          4) Possible actions + benefits
                        </Text>
                        {Array.isArray(formatted.options) && formatted.options.length ? (
                          formatted.options.map((o: any, idx: number) => (
                            <Text key={idx}>
                              • {o.action}
                              {o.benefit ? ` — Benefit: ${o.benefit}` : ""}
                              {o.risk ? ` — Risk: ${o.risk}` : ""}
                            </Text>
                          ))
                        ) : (
                          <Text>—</Text>
                        )}
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>
                          5) Recommended action (based on your goal)
                        </Text>
                        <Text>{formatted.recommended || "—"}</Text>
                        {formatted.rationale ? (
                          <Text style={{ opacity: 0.8 }}>{formatted.rationale}</Text>
                        ) : null}
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={{ fontWeight: "900" }}>6) You decide</Text>
                        <Text>
                          {formatted.youDecide ||
                            "Pick the option that matches your constraints."}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                        <TouchableOpacity
                          style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
                        >
                          <Text style={{ fontWeight: "900" }}>Save to Log (Step 3)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
                        >
                          <Text style={{ fontWeight: "900" }}>Create Task (Step 3)</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontWeight: "900" }}>Raw receipt</Text>
                        <Text selectable style={{ opacity: 0.75 }}>
                          {JSON.stringify(raw, null, 2)}
                        </Text>
                      </View>
                    </View>
                  );
                })()
              : null}
          </>
        )}
      </ScrollView>
    </ScreenBoundary>
  );
}
