import React, { useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import { parseDemoStory, type DemoStoryId } from "@/utils/demoStoryLink";
import { createPublicLandingStyles } from "./PublicLandingPage";
import audiences from "./demoAudiences.json";

const storyChoices: ReadonlyArray<{ id: DemoStoryId; label: string }> = [
  { id: "free", label: "Free · around the house" },
  { id: "pro", label: "Pro · more growing room" },
  { id: "seller", label: "Commercial · sellers" },
  { id: "creator", label: "Commercial · educators & hosts" },
  { id: "facility", label: "Facility · teams & rooms" }
];

export type DemoExplorerProps = {
  story?: DemoStoryId;
  onStoryChange?: (story: DemoStoryId) => void;
  showScreenshot?: boolean;
};

// No account/record reads. Only reviewed bundled screenshots and public links.
export default function DemoExplorer({
  story,
  onStoryChange,
  showScreenshot = true
}: DemoExplorerProps = {}) {
  const { palette } = useAppTheme();
  const styles = createPublicLandingStyles(palette);
  const [localStory, setLocalStory] = useState<DemoStoryId>("free");
  const selected = parseDemoStory(story ?? localStory);
  const audienceId =
    selected === "seller" || selected === "creator" ? "commercial" : selected;
  const audience = audiences.find((item) => item.id === audienceId) || audiences[0];
  function selectStory(nextStory: DemoStoryId) {
    if (nextStory === selected) return;
    if (story === undefined) setLocalStory(nextStory);
    onStoryChange?.(nextStory);
  }
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
        Explore by story
      </Text>
      <Text style={styles.cardBody}>
        Choose the work you want to do. Five stories use four account types: sellers and
        creators both use Commercial. These are guided highlights with screenshots, not
        signed-in workspaces. The interactive sample journal follows below.
      </Text>
      <View style={styles.actions}>
        {storyChoices.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${item.label}`}
            accessibilityState={{ selected: selected === item.id }}
            aria-pressed={selected === item.id}
            onPress={() => selectStory(item.id)}
            style={[
              styles.secondary,
              selected === item.id && { backgroundColor: palette.hero }
            ]}
          >
            <Text style={styles.link}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View
        testID="demo-audience-card"
        style={[styles.card, { flexBasis: "auto", flexGrow: 0 }]}
      >
        <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
          {audience.title}
        </Text>
        <Text style={styles.cardBody}>{audience.description}</Text>
        {audience.highlights.map((highlight) => (
          <Text key={highlight} style={styles.cardBody}>
            • {highlight}
          </Text>
        ))}
        <Text style={styles.cardBody}>{audience.limits}</Text>
        {showScreenshot ? (
          <>
            <Text style={styles.cardBody}>{audience.caption}</Text>
            <Image
              source={{
                uri:
                  Platform.OS === "web"
                    ? audience.image
                    : `https://growpathai.com${audience.image}`
              }}
              alt={audience.alt}
              accessibilityLabel={audience.alt}
              resizeMode="contain"
              style={{
                width: "100%",
                maxWidth: audience.width,
                aspectRatio: audience.width / audience.height,
                alignSelf: "center"
              }}
            />
            <Link
              href={audience.image as never}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.navigationLink}
            >
              Open full-size {audience.label} screenshot
            </Link>
          </>
        ) : null}
        <Link href={audience.href as never} style={styles.navigationLink}>
          {audience.linkLabel}
        </Link>
      </View>
    </View>
  );
}
