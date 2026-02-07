import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { useAICall } from "@/hooks/useAICall";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

/**
 * HarvestAIMvpScreen
 *
 * Demonstrates end-to-end AI workflow:
 * 1. User provides trichome distribution + context
 * 2. POST /api/facility/:facilityId/ai/call (harvest.estimateHarvestWindow)
 * 3. Receives HarvestDecision + 3 CalendarEvent writes
 * 4. GET /api/facility/:facilityId/calendar to display created events
 */
export default function HarvestAIMvpScreen({
  facilityId,
  growId
}: {
  facilityId: string;
  growId: string;
}) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const {
    items: calendarItems,
    fetchCalendar,
    loading: calLoading
  } = useCalendarEvents(facilityId);

  const [daysSinceFlip, setDaysSinceFlip] = useState("65");
  const [goal, setGoal] = useState<"balanced" | "yield" | "potency">("balanced");

  const [clear, setClear] = useState("0.25");
  const [cloudy, setCloudy] = useState("0.65");
  const [amber, setAmber] = useState("0.10");

  const parsed = useMemo(() => {
    const d = Number(daysSinceFlip);
    return {
      daysSinceFlip: Number.isFinite(d) ? d : undefined,
      distribution: {
        clear: Number(clear),
        cloudy: Number(cloudy),
        amber: Number(amber)
      }
    };
  }, [daysSinceFlip, clear, cloudy, amber]);

  async function runEstimate() {
    const res = await callAI({
      tool: "harvest",
      fn: "estimateHarvestWindow",
      args: {
        daysSinceFlip: parsed.daysSinceFlip,
        goal,
        distribution: parsed.distribution
      },
      context: { growId }
    });

    if (res.success) {
      // prove readback: show HARVEST_WINDOW events created by AI
      await fetchCalendar({ growId, type: "HARVEST_WINDOW", limit: 50 });
    }
  }

  const decision = (last?.data as any)?.result;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Harvest AI</Text>
      <Text style={styles.sub}>
        Estimate harvest window → writes HarvestDecision + CalendarEvents
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Days since flip</Text>
        <TextInput
          value={daysSinceFlip}
          onChangeText={setDaysSinceFlip}
          keyboardType="numeric"
          style={styles.input}
          placeholder="65"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Goal</Text>
        <View style={styles.row}>
          {(["balanced", "yield", "potency"] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={[styles.pill, goal === g && styles.pillActive]}
            >
              <Text style={[styles.pillText, goal === g && styles.pillTextActive]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Trichome distribution</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.small}>Clear</Text>
            <TextInput
              value={clear}
              onChangeText={setClear}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.25"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Cloudy</Text>
            <TextInput
              value={cloudy}
              onChangeText={setCloudy}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.65"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Amber</Text>
            <TextInput
              value={amber}
              onChangeText={setAmber}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.10"
            />
          </View>
        </View>

        <Pressable
          onPress={runEstimate}
          disabled={loading}
          style={[styles.cta, loading && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {loading ? "Running…" : "Estimate Harvest Window"}
          </Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!decision && (
        <View style={styles.card}>
          <Text style={styles.h2}>Result</Text>
          <Text style={styles.line}>Recommendation: {decision.recommendation}</Text>
          <Text style={styles.line}>
            Partial harvest: {String(decision.partialHarvest)}
          </Text>
          <Text style={styles.line}>Confidence: {String(decision.confidence)}</Text>
          <Text style={styles.line}>Min: {decision.window?.min}</Text>
          <Text style={styles.line}>Ideal: {decision.window?.ideal}</Text>
          <Text style={styles.line}>Max: {decision.window?.max}</Text>

          <Text style={[styles.h2, { marginTop: 12 }]}>Writes (Persisted)</Text>
          {((last?.data as any)?.writes || []).map((w: any, idx: number) => (
            <Text key={`${w.type}-${w.id}-${idx}`} style={styles.line}>
              • {w.type}: {w.id}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.h2}>Calendar (HARVEST_WINDOW)</Text>
        <Pressable
          onPress={() => fetchCalendar({ growId, type: "HARVEST_WINDOW", limit: 50 })}
          disabled={calLoading}
          style={[styles.cta, calLoading && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {calLoading ? "Loading…" : "Refresh Calendar"}
          </Text>
        </Pressable>

        {calendarItems.length === 0 ? (
          <Text style={styles.empty}>No events yet</Text>
        ) : (
          calendarItems.map((e) => (
            <Text key={e.id} style={styles.line}>
              • {e.title} — {e.date}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#fff"
  },
  label: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  small: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontSize: 14
  },
  inputSm: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minWidth: 80
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  col: { gap: 0 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  pillActive: { borderColor: "#111827", backgroundColor: "#111827" },
  pillText: { fontWeight: "700", opacity: 0.7, fontSize: 13 },
  pillTextActive: { opacity: 1, color: "#fff" },
  cta: {
    marginTop: 10,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  error: { color: "#B91C1C", fontWeight: "700", marginTop: 8 },
  empty: { opacity: 0.6, fontStyle: "italic", marginTop: 8 },
  line: { fontSize: 13, opacity: 0.9, marginTop: 4 }
});
