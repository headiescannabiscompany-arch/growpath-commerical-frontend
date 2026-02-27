import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import BackButton from "@/components/nav/BackButton";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function asString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toNum(v: string) {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function dewPointC(tempC: number, rhPct: number) {
  if (!Number.isFinite(tempC) || !Number.isFinite(rhPct)) return NaN;
  const rh = Math.max(1, Math.min(100, rhPct));
  const a = 17.62;
  const b = 243.12;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return (b * gamma) / (a - gamma);
}

function fToC(f: number) {
  return (f - 32) * (5 / 9);
}

function cToF(c: number) {
  return c * (9 / 5) + 32;
}

function deltaCToF(deltaC: number) {
  return deltaC * (9 / 5);
}

function Field({
  label,
  value,
  onChangeText,
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

export default function DewPointGuardToolScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const growId = asString(params.growId);

  const [savingAndOpening, setSavingAndOpening] = useState(false);

  const [lightsOffTempF, setLightsOffTempF] = useState("75");
  const [lightsOffRh, setLightsOffRh] = useState("55");
  const [nightMinTempF, setNightMinTempF] = useState("68");
  const [nightMaxRh, setNightMaxRh] = useState("62");
  const [assumedLeafAirDeltaF, setAssumedLeafAirDeltaF] = useState("1.0");
  const [lateIrrigation, setLateIrrigation] = useState("0");
  const [fanOffIncident, setFanOffIncident] = useState("0");
  const [dehuStruggling, setDehuStruggling] = useState("0");

  const computed = useMemo(() => {
    const tOffF = toNum(lightsOffTempF);
    const rhOff = toNum(lightsOffRh);
    const tMinF = toNum(nightMinTempF);
    const rhMax = toNum(nightMaxRh);
    const deltaF = toNum(assumedLeafAirDeltaF);

    if ([tOffF, rhOff, tMinF, rhMax, deltaF].some((n) => !Number.isFinite(n))) return null;

    const tOffC = fToC(tOffF);
    const tMinC = fToC(tMinF);
    const dpOffC = dewPointC(tOffC, rhOff);
    const dpWorstC = dewPointC(tMinC, rhMax);
    const leafWorstC = fToC(tMinF - deltaF);
    const marginWorstC = leafWorstC - dpWorstC;

    let riskBand: "low" | "medium" | "high" = "low";
    if (marginWorstC <= 0) riskBand = "high";
    else if (marginWorstC <= 0.5) riskBand = "medium";

    const recs: Array<{ code: string; message: string }> = [];
    if (riskBand !== "low") {
      recs.push({
        code: "LOWER_NIGHT_RH",
        message: "Lower night RH or increase dehumidification capacity at lights-off."
      });
      recs.push({
        code: "INCREASE_AIR_MOVEMENT",
        message: "Increase canopy air movement during lights-off to prevent microclimate saturation."
      });
      recs.push({
        code: "RAMP_LIGHTS_OFF",
        message: "Reduce temperature drop rate at lights-off by tuning transition setpoints."
      });
    } else {
      recs.push({
        code: "MAINTAIN",
        message: "Current night conditions look safe. Keep monitoring lights-off transitions."
      });
    }

    if (toNum(lateIrrigation) === 1) {
      recs.push({
        code: "SHIFT_IRRIGATION_TIMING",
        message: "Avoid late irrigation close to lights-off; it can drive overnight RH spikes."
      });
    }
    if (toNum(fanOffIncident) === 1) {
      recs.push({
        code: "FAN_CONTINUITY",
        message: "Ensure critical circulation/exhaust stays active through lights-off."
      });
    }
    if (toNum(dehuStruggling) === 1) {
      recs.push({
        code: "DEHU_CAPACITY",
        message: "If dehumidification runs constantly, increase capacity or improve placement."
      });
    }

    return {
      inputs: {
        lightsOff: { tempF: tOffF, rh: rhOff, dewPointF: cToF(dpOffC) },
        worstCase: { tempF: tMinF, rh: rhMax, dewPointF: cToF(dpWorstC) },
        assumedLeafAirDeltaF: deltaF
      },
      worstCase: {
        leafTempF: tMinF - deltaF,
        marginF: deltaCToF(marginWorstC)
      },
      riskBand,
      recommendations: recs
    };
  }, [
    lightsOffTempF,
    lightsOffRh,
    nightMinTempF,
    nightMaxRh,
    assumedLeafAirDeltaF,
    lateIrrigation,
    fanOffIncident,
    dehuStruggling
  ]);

  async function onSaveAndOpen() {
    if (savingAndOpening) return;
    setSavingAndOpening(true);
    try {
      const input = {
        mode: "manual_estimate",
        lightsOff: { tempF: toNum(lightsOffTempF), rh: toNum(lightsOffRh) },
        night: { minTempF: toNum(nightMinTempF), maxRh: toNum(nightMaxRh) },
        assumedLeafAirDeltaF: toNum(assumedLeafAirDeltaF),
        flags: {
          lateIrrigation: toNum(lateIrrigation) === 1,
          fanOffIncident: toNum(fanOffIncident) === 1,
          dehuStruggling: toNum(dehuStruggling) === 1
        }
      };

      const output = computed
        ? {
            summary: {
              riskBand: computed.riskBand,
              lightsOffDewPointF: computed.inputs.lightsOff.dewPointF,
              worstCaseDewPointF: computed.inputs.worstCase.dewPointF,
              assumedLeafTempF: computed.worstCase.leafTempF,
              note: "Manual estimate (worst-case). Add telemetry for true spike detection."
            },
            recommendations: computed.recommendations
          }
        : {
            summary: { riskBand: "low", note: "Insufficient inputs to compute." },
            recommendations: []
          };

      const res = await saveToolRunAndOpenJournal({
        router,
        growId,
        toolKey: "dew-point-guard",
        input,
        output
      });

      if (!res?.ok) {
        Alert.alert("Couldn't save tool run", String(res?.error || "Unknown error"));
      }
    } finally {
      setSavingAndOpening(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Dew Point Guard</Text>
      <Text style={styles.subtitle}>
        V1 manual estimate for lights-off dew point spikes. Telemetry will upgrade this to a
        true detector.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Field
        label="Lights-off temperature (F)"
        value={lightsOffTempF}
        onChangeText={setLightsOffTempF}
        placeholder="75"
      />
      <Field label="Lights-off RH (%)" value={lightsOffRh} onChangeText={setLightsOffRh} placeholder="55" />
      <Field
        label="Night minimum temperature (F)"
        value={nightMinTempF}
        onChangeText={setNightMinTempF}
        placeholder="68"
      />
      <Field label="Night maximum RH (%)" value={nightMaxRh} onChangeText={setNightMaxRh} placeholder="62" />
      <Field
        label="Assumed leaf cooler than air (F)"
        value={assumedLeafAirDeltaF}
        onChangeText={setAssumedLeafAirDeltaF}
        placeholder="1.0"
      />

      <View style={styles.flags}>
        <Text style={styles.flagsTitle}>Event Flags (0 = no, 1 = yes)</Text>
        <Field
          label="Late irrigation near lights-off"
          value={lateIrrigation}
          onChangeText={setLateIrrigation}
          placeholder="0"
        />
        <Field
          label="Fan/exhaust off incident"
          value={fanOffIncident}
          onChangeText={setFanOffIncident}
          placeholder="0"
        />
        <Field
          label="Dehu struggling / nonstop runtime"
          value={dehuStruggling}
          onChangeText={setDehuStruggling}
          placeholder="0"
        />
      </View>

      <View style={styles.output}>
        <Text style={styles.flagsTitle}>Estimated Output</Text>
        <Text>
          Risk band: <Text style={styles.strong}>{computed ? computed.riskBand : "-"}</Text>
        </Text>
        {computed ? (
          <>
            <Text>
              Lights-off dew point:{" "}
              <Text style={styles.strong}>{computed.inputs.lightsOff.dewPointF.toFixed(1)}F</Text>
            </Text>
            <Text>
              Worst-case dew point:{" "}
              <Text style={styles.strong}>{computed.inputs.worstCase.dewPointF.toFixed(1)}F</Text>
            </Text>
            <Text>
              Assumed leaf temp:{" "}
              <Text style={styles.strong}>{computed.worstCase.leafTempF.toFixed(1)}F</Text>
            </Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.flagsTitle}>Recommendations</Text>
              {computed.recommendations.map((r, idx) => (
                <Text key={`${r.code}-${idx}`} style={styles.recItem}>
                  - {r.message}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </View>

      <Pressable
        onPress={onSaveAndOpen}
        disabled={savingAndOpening}
        style={[styles.button, savingAndOpening ? { opacity: 0.6 } : null]}
      >
        <Text style={styles.buttonText}>
          {savingAndOpening ? "Saving..." : "Save and Open Journal"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { marginBottom: 16, color: "#444" },
  context: { marginBottom: 8, color: "#166534", fontWeight: "700" },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  flags: { marginTop: 8, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 },
  flagsTitle: { fontWeight: "700", marginBottom: 6 },
  output: { marginTop: 8, marginBottom: 18, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 },
  strong: { fontWeight: "800" },
  recItem: { marginBottom: 4 },
  button: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: { color: "#FFF", fontWeight: "800" }
});
