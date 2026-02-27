import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { listPersonalGrows } from "@/api/grows";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },
  panel: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC"
  },
  panelTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  panelText: { fontSize: 14, color: "#64748B" },
  growCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF"
  },
  growTitle: { fontSize: 16, fontWeight: "700" },
  growMeta: { marginTop: 4, fontSize: 12, color: "#64748B" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF"
  },
  actionText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  cta: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" }
});

export default function GrowsListScreen() {
  const [grows, setGrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPersonalGrows();
      setGrows(Array.isArray(res) ? res : []);
    } catch {
      setGrows([]);
      setError("Failed to load grows.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grows</Text>
        <Text style={styles.subtitle}>
          Grows are the parent object for journal entries, tool runs, and tasks.
        </Text>
      </View>

      {loading ? (
        <View style={styles.panel}>
          <ActivityIndicator />
          <Text style={[styles.panelText, { marginTop: 8 }]}>Loading grows...</Text>
        </View>
      ) : grows.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>No grows yet</Text>
          <Text style={styles.panelText}>
            Create your first grow to unlock grow-linked logs, tools, and tasks.
          </Text>
          {error ? <Text style={[styles.panelText, { marginTop: 8 }]}>{error}</Text> : null}
          <Link href="/home/personal/grows/new" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>+ New Grow</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View>
          {grows.map((grow) => {
            const id = String(grow?._id || grow?.id || "");
            if (!id) return null;
            const updatedLabel = grow?.updatedAt
              ? new Date(grow.updatedAt).toLocaleDateString()
              : "n/a";
            return (
              <View key={id} style={styles.growCard}>
                <Link href={`/home/personal/grows/${id}`} asChild>
                  <Pressable>
                    <Text style={styles.growTitle}>{grow?.name || "Untitled Grow"}</Text>
                    <Text style={styles.growMeta}>
                      Status: {grow?.status || "active"} | Updated: {updatedLabel}
                    </Text>
                  </Pressable>
                </Link>

                <View style={styles.actionRow}>
                  <Link href={`/home/personal/logs/new?growId=${id}`} asChild>
                    <Pressable style={styles.action}>
                      <Text style={styles.actionText}>Log</Text>
                    </Pressable>
                  </Link>
                  <Link href={`/home/personal/tools?growId=${id}`} asChild>
                    <Pressable style={styles.action}>
                      <Text style={styles.actionText}>Tools</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            );
          })}

          <Link href="/home/personal/grows/new" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>+ New Grow</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}
