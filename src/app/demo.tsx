import React, { useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";
import { createPublicLandingStyles } from "@/components/marketing/PublicLandingPage";
import demo from "@/components/marketing/syntheticGrowDemo.json";
import { useAppTheme } from "@/theme/appTheme";
import { fmtDate } from "@/features/grows/routeUtils";
import { sharePublicLink } from "@/utils/publicLinks";

// This route never accepts a grow ID, token or supplied record. All examples are
// bundled synthetic fixtures; private grow access continues through its own routes.
export default function PublicGrowDemo() {
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createPublicLandingStyles(palette), [palette]);
  const [list, setList] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const events = useMemo(
    () =>
      demo.events.map((event) => ({
        ...event,
        photos: event.photos?.map((path) =>
          Platform.OS === "web" ? path : `https://growpathai.com${path}`
        )
      })),
    []
  );
  const compact = width < 600;
  async function share() {
    try {
      const result = await sharePublicLink(
        "GrowPathAI — synthetic grow journal demo",
        "/demo"
      );
      setShareStatus(
        result.method === "web-clipboard" ? "Demo link copied." : "Share options opened."
      );
    } catch {
      setShareStatus(
        "Sharing was canceled or unavailable. You can copy the demo address below."
      );
    }
  }
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
    >
      <View style={styles.nav}>
        <Link href="/" style={styles.brand}>
          GrowPathAI
        </Link>
        <View style={styles.navLinks}>
          <Link href="/features" style={styles.navigationLink}>
            Features
          </Link>
          <Link href="/pricing" style={styles.navigationLink}>
            Pricing
          </Link>
          <Link href="/login" style={styles.navigationLink}>
            Sign in
          </Link>
        </View>
      </View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <Text style={styles.eyebrow}>Read-only product demo</Text>
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={[styles.title, compact && styles.titleCompact]}
        >
          {demo.title}
        </Text>
        <Text style={styles.intro}>{demo.description}</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          {demo.growTitle}
        </Text>
        <Text style={styles.cardBody}>{demo.disclosure}</Text>
        <Text style={styles.cardBody}>
          This is the same timeline viewer used for shared grows. This sample cannot be
          edited and does not run AI tools or change your account.
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !list }}
            onPress={() => setList(false)}
            style={styles.secondary}
          >
            <Text style={styles.link}>Visual timeline</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: list }}
            onPress={() => setList(true)}
            style={styles.secondary}
          >
            <Text style={styles.link}>Read all 5 entries</Text>
          </Pressable>
        </View>
      </View>
      {list ? (
        events.map((event) => (
          <View key={event.id} style={styles.card}>
            <Text style={styles.cardBody}>{fmtDate(event.timestamp)}</Text>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              {event.title}
            </Text>
            <Text style={styles.cardBody}>{event.summary}</Text>
          </View>
        ))
      ) : (
        <GrowTimelineFlow events={events} />
      )}
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Ready to start your own journal?
        </Text>
        <Text style={styles.cardBody}>
          Start with your own grow, then add your notes and photos. Free account. No
          payment card required.
        </Text>
        <View style={styles.actions}>
          <Link href="/register" style={styles.primary}>
            Create free account
          </Link>
          <Pressable
            accessibilityRole="button"
            onPress={() => void share()}
            style={styles.secondary}
          >
            <Text style={styles.link}>Share this demo</Text>
          </Pressable>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.cardBody}>
          {shareStatus}
        </Text>
        <Link href="/demo" style={styles.navigationLink}>
          Demo address: growpathai.com/demo
        </Link>
      </View>
      <View style={styles.footer}>
        <Link href="/privacy" style={styles.navigationLink}>
          Privacy
        </Link>
        <Link href="/terms" style={styles.navigationLink}>
          Terms
        </Link>
        <Link href="/updates" style={styles.navigationLink}>
          Updates
        </Link>
      </View>
    </ScrollView>
  );
}
