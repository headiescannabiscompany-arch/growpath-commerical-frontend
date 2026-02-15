import React from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
  Platform
} from "react-native";
import { sanitizeViewChildren } from "@/components/layout/sanitizeViewChildren";
import { useEntitlements } from "@/entitlements";
import FeedRail from "@/components/feed/FeedRail";
import ForumHighlights from "@/components/feed/ForumHighlights";
import { getFeedPolicy } from "@/utils/feedPolicy";

type AppPageProps = {
  routeKey: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  railOverride?: React.ReactNode | null;
};

export default function AppPage({
  routeKey,
  header,
  children,
  railOverride
}: AppPageProps) {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= 900;
  const ent = useEntitlements();
  const plan = ent.plan || "free";
  const policy = getFeedPolicy({ routeKey, plan, mode: ent.mode });

  const computedRail =
    policy.includeForumHighlights || policy.slots > 0 ? (
      <View style={styles.railStack}>
        {policy.includeForumHighlights ? <ForumHighlights /> : null}
        {policy.slots > 0 ? (
          <FeedRail
            slots={policy.slots}
            mode={ent.mode}
            plan={plan}
            railMode={policy.railMode}
          />
        ) : null}
      </View>
    ) : null;

  const rail = railOverride !== undefined ? railOverride : computedRail;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {header ? (
        <View style={styles.header}>
          {sanitizeViewChildren(header, "AppPage.header")}
        </View>
      ) : null}
      <View style={[styles.columns, isWide ? styles.columnsWide : styles.columnsNarrow]}>
        <View style={styles.main}>{sanitizeViewChildren(children, "AppPage.main")}</View>
        {rail ? (
          <View style={[styles.rail, !isWide && styles.railNarrow]}>
            {sanitizeViewChildren(rail, "AppPage.rail")}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  pageContent: {
    padding: 20,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center"
  },
  header: {
    marginBottom: 16
  },
  columns: {
    gap: 20
  },
  columnsWide: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  columnsNarrow: {
    flexDirection: "column"
  },
  main: {
    flex: 2,
    gap: 16
  },
  rail: {
    flex: 1,
    minWidth: 260,
    maxWidth: 360,
    gap: 16
  },
  railStack: {
    gap: 16
  },
  railNarrow: {
    marginTop: 12
  }
});
