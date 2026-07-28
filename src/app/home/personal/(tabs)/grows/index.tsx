import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { listPersonalGrows } from "@/api/grows";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  content: { paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },
  panel: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC"
  },
  panelTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  panelText: { fontSize: 14, color: "#64748B" },
  growCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF"
  },
  growTitle: { fontSize: 16, fontWeight: "700" },
  growMeta: { marginTop: 4, fontSize: 12, color: "#64748B" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  action: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.card,
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
    borderRadius: radius.card
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" }
});

export default function GrowsListScreen() {
  const entitlements = useEntitlements();
  const hasCreateCapability = entitlements.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const [grows, setGrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const maxGrows = Number(entitlements.limits?.maxGrows ?? 0);
  const activeGrows = grows.filter(
    (grow) => String(grow?.status || "") !== "harvested"
  ).length;
  const latestGrow = [...grows].sort((left, right) => {
    const leftAt = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightAt = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightAt - leftAt;
  })[0];
  const canCreateGrow =
    hasCreateCapability &&
    !loading &&
    !error &&
    (maxGrows <= 0 || grows.length < maxGrows);
  const limitTitle = maxGrows === 1 ? "Free grow limit reached" : "Grow limit reached";
  const limitMessage =
    maxGrows === 1
      ? "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      : `This plan includes up to ${maxGrows} active grows. Upgrade to create more.`;

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
    <ScrollView
      testID="screen-personal-grows"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Grows
        </Text>
        <Text style={styles.subtitle}>
          Keep each grow labeled, visual, and one tap away from logs, tools, tasks, and
          field-study work.
        </Text>
      </View>

      <PersonalFeedPlacement placement="top" routeKey="personal_grows" longContent />

      <View style={styles.heroGrid}>
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>Grow overview</Text>
          <Text style={styles.heroTitle}>
            {loading
              ? "Loading your grows..."
              : `${grows.length} grow${grows.length === 1 ? "" : "s"} saved`}
          </Text>
          <Text style={styles.heroText}>
            The first screen should show what is active, what needs attention, and what
            you can do next.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{grows.length}</Text>
              <Text style={styles.heroStatLabel}>Total grows</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeGrows}</Text>
              <Text style={styles.heroStatLabel}>Active</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{latestGrow?.name || "None"}</Text>
              <Text style={styles.heroStatLabel}>Latest grow</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <Link href="/home/personal/tools" asChild>
              <Pressable style={styles.heroAction}>
                <Text style={styles.heroActionText}>Open AI Tools</Text>
              </Pressable>
            </Link>
            <Link href="/home/personal/field-studies" asChild>
              <Pressable style={styles.heroAction}>
                <Text style={styles.heroActionText}>Field Studies</Text>
              </Pressable>
            </Link>
            <Link href="/home/personal/tasks" asChild>
              <Pressable style={styles.heroAction}>
                <Text style={styles.heroActionText}>Tasks</Text>
              </Pressable>
            </Link>
            {canCreateGrow ? (
              <Link href="/home/personal/grows/new" asChild>
                <Pressable style={styles.heroActionPrimary}>
                  <Text style={styles.heroActionPrimaryText}>New Grow</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        </View>
      </View>

      <PersonalFeedPlacement placement="top" routeKey="personal_grows" longContent />

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
          {error ? (
            <Text style={[styles.panelText, { marginTop: 8 }]}>{error}</Text>
          ) : null}
          {error ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try loading grows again"
              onPress={() => void load()}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          ) : canCreateGrow ? (
            <Link href="/home/personal/grows/new" asChild>
              <Pressable testID="btn-create-first-grow" style={styles.cta}>
                <Text style={styles.ctaText}>+ New Grow</Text>
              </Pressable>
            </Link>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{limitTitle}</Text>
              <Text style={styles.panelText}>{limitMessage}</Text>
            </View>
          )}
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
                      <Text style={styles.actionText}>AI Tools</Text>
                    </Pressable>
                  </Link>
                  <Link href={`/home/personal/tools/integrations?growId=${id}`} asChild>
                    <Pressable style={styles.action}>
                      <Text style={styles.actionText}>Data Integrations</Text>
                    </Pressable>
                  </Link>
                  <Link href={`/home/personal/tools/pdf-export?growId=${id}`} asChild>
                    <Pressable style={styles.action}>
                      <Text style={styles.actionText}>Export Report</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            );
          })}

          {canCreateGrow ? (
            <Link href="/home/personal/grows/new" asChild>
              <Pressable testID="btn-new-grow" style={styles.cta}>
                <Text style={styles.ctaText}>+ New Grow</Text>
              </Pressable>
            </Link>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{limitTitle}</Text>
              <Text style={styles.panelText}>{limitMessage}</Text>
            </View>
          )}
        </View>
      )}
      <PersonalFeedPlacement placement="bottom" routeKey="personal_grows" longContent />
    </ScrollView>
  );
}
