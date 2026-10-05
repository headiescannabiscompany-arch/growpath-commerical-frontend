import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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
import DemoExplorer from "@/components/marketing/DemoExplorer";
import DemoWalkthrough, {
  type DemoWalkthroughStory
} from "@/components/marketing/DemoWalkthrough";
import demoStories from "@/components/marketing/demoStories.json";
import PublicTestimonials from "@/components/marketing/PublicTestimonials";
import { demoStoryPath, parseDemoStory, type DemoStoryId } from "@/utils/demoStoryLink";

// This route never accepts a grow ID, token or supplied record. All examples are
// bundled synthetic fixtures; private grow access continues through its own routes.
export default function PublicGrowDemo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ story?: string | string[] }>();
  const story = parseDemoStory(params.story);
  const storyPath = demoStoryPath(story);
  const walkthrough = demoStories[story];
  const currentStory = useRef(story);
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createPublicLandingStyles(palette), [palette]);
  const [list, setList] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  useEffect(() => {
    currentStory.current = story;
    setShareStatus("");
  }, [story]);
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
  function selectStory(nextStory: DemoStoryId) {
    if (nextStory === story) return;
    setShareStatus("");
    // Rebuild the destination: no incoming IDs, tokens, tracking or referrer data.
    router.push(demoStoryPath(nextStory) as never);
  }
  async function share() {
    try {
      const result = await sharePublicLink(
        "GrowPathAI — synthetic grow journal demo",
        storyPath
      );
      if (currentStory.current !== story) return;
      setShareStatus(
        result.method === "web-clipboard" ? "Demo link copied." : "Share options opened."
      );
    } catch {
      if (currentStory.current !== story) return;
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
      <DemoExplorer story={story} onStoryChange={selectStory} showScreenshot={false} />
      <DemoWalkthrough story={walkthrough as DemoWalkthroughStory} />
      <View style={styles.actions}>
        <Link href={walkthrough.ctaHref as never} style={styles.primary}>
          {walkthrough.ctaLabel}
        </Link>
      </View>
      <View
        testID="demo-journal-card"
        style={[styles.card, { flexBasis: "auto", flexGrow: 0 }]}
      >
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
            aria-pressed={!list}
            onPress={() => setList(false)}
            style={styles.secondary}
          >
            <Text style={styles.link}>Visual timeline</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: list }}
            aria-pressed={list}
            onPress={() => setList(true)}
            style={styles.secondary}
          >
            <Text style={styles.link}>Read all 5 entries</Text>
          </Pressable>
        </View>
      </View>
      {list ? (
        events.map((event) => (
          <View
            key={event.id}
            testID={`demo-entry-${event.id}`}
            style={[styles.card, { flexBasis: "auto", flexGrow: 0 }]}
          >
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
      <View
        testID="demo-next-step-card"
        style={[styles.card, { flexBasis: "auto", flexGrow: 0 }]}
      >
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          {story === "free"
            ? "Ready to start your own journal?"
            : "Choose your next step"}
        </Text>
        <Text style={styles.cardBody}>
          {story === "free"
            ? "Start with your own grow, then add your notes and photos. Free account. No payment card required."
            : "Review the plan and setup for the work you want to do. This demo does not create an account, change your plan or start a purchase."}
        </Text>
        <View style={styles.actions}>
          <Link href={walkthrough.ctaHref as never} style={styles.primary}>
            {story === "free" ? "Create free account" : walkthrough.ctaLabel}
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
        <Link href={storyPath as never} style={styles.navigationLink}>
          Demo address: growpathai.com{storyPath}
        </Link>
      </View>
      <PublicTestimonials />
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
