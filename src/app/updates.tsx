import React, { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BackButton from "@/components/nav/BackButton";
import { PUBLIC_UPDATES_REVIEWED } from "@/config/publicUpdates";
import {
  PUBLIC_UPDATE_GROUPS,
  UPDATE_STATUS_LABELS,
  latestGroupRelease,
  updateGroupSections
} from "@/config/publicUpdateGroups";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { releaseAgeLabel } from "@/utils/releaseAge";

export default function UpdatesPage() {
  const { palette } = useAppTheme();
  const styles = createUpdatesStyles(palette);
  const [selected, setSelected] = useState("overview");
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const releaseSummary = (item: (typeof PUBLIC_UPDATE_GROUPS)[number]) => {
    const date = latestGroupRelease(item, now);
    return date
      ? `Latest release: ${date} · ${releaseAgeLabel(date, now)}`
      : "Not released yet";
  };
  const tabs = [{ id: "overview", tab: "Overview" }, ...PUBLIC_UPDATE_GROUPS];
  const tabRefs = useRef<any[]>([]);
  const group = PUBLIC_UPDATE_GROUPS.find((item) => item.id === selected);
  const selectTab = (id: string) => {
    setSelected(id);
    setExpanded(false);
  };
  const selectAndFocus = (index: number) => {
    selectTab(tabs[index].id);
    tabRefs.current[index]?.focus?.();
  };
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.backRow}>
        <BackButton fallbackHref="/support" />
      </View>
      <Text style={styles.brand}>GrowPathAI</Text>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Updates
      </Text>
      <Text style={styles.intro}>
        Major milestones, what is live, and what remains. Small fixes stay grouped inside
        each milestone instead of becoming separate announcements.
      </Text>
      <Text style={styles.date}>Last updated {PUBLIC_UPDATES_REVIEWED}</Text>
      <Text style={styles.body}>
        “100% complete” means the stated milestone is finished and live—not the whole app
        or future additions. Partially live work is not marked complete. Plans are not a
        promise of a release date.
      </Text>
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Update milestones"
        style={styles.tabs}
      >
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            nativeID={`updates-tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityLabel={tab.tab}
            accessibilityState={{ selected: selected === tab.id }}
            aria-selected={selected === tab.id}
            {...(Platform.OS === "web"
              ? {
                  tabIndex: selected === tab.id ? 0 : -1,
                  "aria-controls": "updates-panel",
                  onKeyDown: (event: any) => {
                    const delta =
                      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : delta
                            ? (index + delta + tabs.length) % tabs.length
                            : null;
                    if (next !== null) {
                      event.preventDefault();
                      selectAndFocus(next);
                    }
                  }
                }
              : {})}
            onPress={() => selectTab(tab.id)}
            style={[styles.tab, selected === tab.id && styles.selectedTab]}
          >
            <Text style={[styles.tabText, selected === tab.id && styles.selectedTabText]}>
              {tab.tab}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        nativeID="updates-panel"
        role="tabpanel"
        aria-labelledby={`updates-tab-${selected}`}
        style={styles.panel}
      >
        {!group ? (
          <>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Milestone overview
            </Text>
            {PUBLIC_UPDATE_GROUPS.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.status}>{UPDATE_STATUS_LABELS[item.status]}</Text>
                <Text style={styles.date}>{releaseSummary(item)}</Text>
                <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Text style={styles.body}>{item.scope}</Text>
                <Text style={styles.body}>{item.live}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.tab} milestone`}
                  onPress={() =>
                    selectAndFocus(tabs.findIndex((tab) => tab.id === item.id))
                  }
                  style={styles.detailButton}
                >
                  <Text style={styles.link}>View milestone →</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              {group.title}
            </Text>
            <Text style={styles.status}>{UPDATE_STATUS_LABELS[group.status]}</Text>
            <Text style={styles.date}>{releaseSummary(group)}</Text>
            <Text style={styles.body}>{group.scope}</Text>
            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                {group.status === "planned" ? "Not released yet" : "What is live"}
              </Text>
              <Text style={styles.body}>{group.live}</Text>
              <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                {group.status === "complete"
                  ? "Separate follow-ups and limits"
                  : "What remains"}
              </Text>
              <Text style={styles.body}>{group.next}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${expanded ? "Hide" : "Show"} ${group.tab} detailed history`}
              accessibilityState={{ expanded }}
              aria-expanded={expanded}
              onPress={() => setExpanded((value) => !value)}
              style={styles.tab}
            >
              <Text style={styles.tabText}>
                {expanded ? "Hide" : "Show"} detailed history ({group.entryIds.length})
              </Text>
            </Pressable>
            {expanded
              ? updateGroupSections(group).map((section) => (
                  <View key={section.id} style={styles.section}>
                    <Text
                      accessibilityRole="header"
                      aria-level={3}
                      style={styles.cardTitle}
                    >
                      {section.title}
                    </Text>
                    <Text style={styles.body}>{section.description}</Text>
                    {section.entries.map((entry) => (
                      <View key={entry.id} style={styles.card}>
                        <Text
                          accessibilityRole="header"
                          aria-level={4}
                          style={styles.cardTitle}
                        >
                          {entry.title}
                        </Text>
                        <Text style={styles.date}>
                          {entry.dateLabel} {entry.date}
                          {section.id === "live" &&
                          entry.dateLabel === "Released" &&
                          releaseAgeLabel(entry.date, now)
                            ? ` · ${releaseAgeLabel(entry.date, now)}`
                            : ""}
                        </Text>
                        <Text style={styles.body}>{entry.summary}</Text>
                      </View>
                    ))}
                  </View>
                ))
              : null}
          </>
        )}
      </View>
      <Text style={styles.body}>Need help with an existing feature?</Text>
      <Link href="/support" style={styles.link}>
        Contact Support
      </Link>
    </ScrollView>
  );
}

export function createUpdatesStyles(palette: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.page },
    content: {
      alignSelf: "center",
      maxWidth: 920,
      width: "100%",
      paddingHorizontal: 24,
      paddingVertical: 40
    },
    backRow: { marginBottom: 18 },
    brand: { color: palette.accent, fontSize: 16, fontWeight: "800", marginBottom: 10 },
    title: { color: palette.text, fontSize: 34, fontWeight: "800", marginBottom: 10 },
    intro: { color: palette.textSoft, fontSize: 17, lineHeight: 26 },
    date: { color: palette.textMuted, fontSize: 14, lineHeight: 22, marginVertical: 8 },
    section: {
      borderTopWidth: 1,
      borderColor: palette.border,
      paddingTop: 24,
      marginTop: 24,
      gap: 12
    },
    sectionTitle: { color: palette.text, fontSize: 22, fontWeight: "800" },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 18,
      gap: 10
    },
    tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 24 },
    tab: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: "center"
    },
    selectedTab: { backgroundColor: palette.accent, borderColor: palette.accent },
    tabText: { color: palette.text, fontSize: 14, fontWeight: "700", flexShrink: 1 },
    selectedTabText: { color: palette.accentText },
    panel: { gap: 16, marginBottom: 28 },
    status: { color: palette.accent, fontSize: 14, fontWeight: "800" },
    detailButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
    cardTitle: { color: palette.text, fontSize: 19, fontWeight: "700" },
    body: { color: palette.textSoft, fontSize: 16, lineHeight: 25 },
    empty: { color: palette.textMuted, fontSize: 16, lineHeight: 25, paddingVertical: 8 },
    link: {
      color: palette.link,
      fontSize: 16,
      lineHeight: 25,
      paddingVertical: 12,
      textDecorationLine: "underline"
    }
  });
}
