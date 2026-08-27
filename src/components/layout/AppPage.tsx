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
import FeedBanner from "@/components/feed/FeedBanner";
import FeedRail from "@/components/feed/FeedRail";
import BackButton from "@/components/nav/BackButton";
import { getFeedBannerPolicy, getFeedPolicy } from "@/utils/feedPolicy";
import { useAppTheme } from "@/theme/appTheme";

type AppPageProps = {
  routeKey: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  railOverride?: React.ReactNode | null;
  longContent?: boolean;
  showBack?: boolean;
  backFallbackHref?: string;
};

export default function AppPage({
  routeKey,
  header,
  children,
  railOverride,
  longContent = false,
  showBack,
  backFallbackHref
}: AppPageProps) {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= 900;
  const ent = useEntitlements();
  const plan = ent.plan || "free";
  const policy = getFeedPolicy({ routeKey, plan, mode: ent.mode });
  const bannerPolicy = getFeedBannerPolicy({
    routeKey,
    plan,
    mode: ent.mode,
    longContent
  });
  const { palette } = useAppTheme();

  const computedRail =
    policy.slots > 0 ? (
      <View style={styles.railStack}>
        <FeedRail
          slots={policy.slots}
          mode={ent.mode}
          plan={plan}
          railMode={policy.railMode}
          routeKey={routeKey}
        />
      </View>
    ) : null;

  const rail = railOverride !== undefined ? railOverride : computedRail;
  const resolvedBackHref = backFallbackHref || "/account/workspace";

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.pageContent}
    >
      {(showBack ?? true) ? (
        <View style={styles.backRow}>
          <BackButton fallbackHref={resolvedBackHref} />
        </View>
      ) : null}
      {header ? (
        <View style={styles.header}>
          {sanitizeViewChildren(header, "AppPage.header")}
        </View>
      ) : null}
      {bannerPolicy.top ? (
        <View style={styles.topBanner}>
          <FeedBanner
            placement="top"
            slots={bannerPolicy.slotsByPlacement.top}
            mode={ent.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
            routeKey={routeKey}
          />
        </View>
      ) : null}
      <View style={[styles.columns, isWide ? styles.columnsWide : styles.columnsNarrow]}>
        <View
          role="main"
          testID="app-page-main"
          style={[styles.main, isWide ? styles.mainWide : styles.mainNarrow]}
        >
          {sanitizeViewChildren(children, "AppPage.main")}
          {bannerPolicy.middle ? (
            <FeedBanner
              placement="middle"
              slots={bannerPolicy.slotsByPlacement.middle}
              mode={ent.mode}
              plan={plan}
              railMode={bannerPolicy.railMode}
              routeKey={routeKey}
            />
          ) : null}
        </View>
        {rail ? (
          <View
            testID="app-page-rail"
            style={[styles.rail, isWide ? styles.railWide : styles.railNarrow]}
          >
            {sanitizeViewChildren(rail, "AppPage.rail")}
          </View>
        ) : null}
      </View>
      {bannerPolicy.bottom ? (
        <View style={styles.bottomBanner}>
          <FeedBanner
            placement="bottom"
            slots={bannerPolicy.slotsByPlacement.bottom}
            mode={ent.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
            routeKey={routeKey}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
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
  backRow: {
    marginBottom: 12
  },
  topBanner: {
    marginBottom: 16
  },
  bottomBanner: {
    marginTop: 20
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
    gap: 16
  },
  mainWide: {
    flex: 2,
    minWidth: 0
  },
  mainNarrow: {
    flexGrow: 0,
    flexShrink: 0,
    width: "100%"
  },
  rail: {
    minWidth: 260,
    maxWidth: 360,
    gap: 16
  },
  railWide: {
    flex: 1
  },
  railStack: {
    gap: 16
  },
  railNarrow: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 12,
    maxWidth: "100%",
    minWidth: 0,
    width: "100%"
  }
});
