import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import { useAppTheme } from "@/theme/appTheme";
import { createPublicLandingStyles } from "./PublicLandingPage";

// Add an asset only after its actual-interface capture and public-use review.
export const DEMO_WALKTHROUGH_IMAGES = [
  "/images/synthetic-timeline-ui.jpg",
  "/images/synthetic-diagnosis-intake-ui.jpg",
  "/images/synthetic-commercial-offers-ui.png",
  "/images/synthetic-facility-dashboard-ui.jpg",
  "/images/synthetic-story-free-start.jpg",
  "/images/synthetic-story-free-care.jpg",
  "/images/synthetic-story-free-review.jpg",
  "/images/synthetic-story-history-answer.jpg",
  "/images/synthetic-story-comparison-result.jpg",
  "/images/synthetic-story-export-package.jpg",
  "/images/synthetic-story-seller-draft.jpg",
  "/images/synthetic-story-seller-published.jpg",
  "/images/synthetic-story-seller-view.jpg",
  "/images/synthetic-story-course-owner.jpg",
  "/images/synthetic-story-course-lesson.jpg",
  "/images/synthetic-story-course-visitor.jpg",
  "/images/synthetic-story-facility-task.jpg",
  "/images/synthetic-story-facility-history.jpg"
] as const;

export const MAX_DEMO_WALKTHROUGH_SCENES = 6;

export type DemoWalkthroughScene = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly image: (typeof DEMO_WALKTHROUGH_IMAGES)[number];
  readonly alt: string;
  readonly caption: string;
  readonly width: number;
  readonly height: number;
};

export type DemoWalkthroughStory = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly result: string;
  readonly limits: string;
  readonly scenes: readonly DemoWalkthroughScene[];
};

function isBundledScreenshot(scene: DemoWalkthroughScene) {
  return (
    DEMO_WALKTHROUGH_IMAGES.some((image) => image === scene.image) &&
    Number.isFinite(scene.width) &&
    Number.isFinite(scene.height) &&
    scene.width > 0 &&
    scene.height > 0
  );
}

// Story identity remounts the reader, so another story always begins at step one.
export default function DemoWalkthrough({ story }: { story: DemoWalkthroughStory }) {
  return <WalkthroughReader key={story.id} story={story} />;
}

function WalkthroughReader({ story }: { story: DemoWalkthroughStory }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPublicLandingStyles(palette), [palette]);
  const [step, setStep] = useState(0);
  const scenes = story.scenes.length <= MAX_DEMO_WALKTHROUGH_SCENES ? story.scenes : [];
  const activeStep = Math.min(step, Math.max(0, scenes.length - 1));
  const scene = scenes[activeStep];
  const first = activeStep === 0;
  const last = activeStep === scenes.length - 1;

  return (
    <View
      testID="demo-walkthrough-card"
      style={[styles.card, { flexBasis: "auto", flexGrow: 0 }]}
    >
      <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
        {story.title}
      </Text>
      <Text style={styles.cardBody}>{story.description}</Text>
      <Text style={styles.cardBody}>
        Read-only walkthrough with synthetic example records. Screenshot controls are not
        interactive.
      </Text>
      {scene ? (
        <>
          <View style={styles.actions}>
            {scenes.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Show step ${index + 1}: ${item.title}`}
                accessibilityState={{ selected: activeStep === index }}
                aria-pressed={activeStep === index}
                onPress={() => setStep(index)}
                style={[
                  styles.secondary,
                  { maxWidth: "100%" },
                  activeStep === index && { backgroundColor: palette.hero }
                ]}
              >
                <Text style={styles.link}>
                  {index + 1}. {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.cardBody}>
            Step {activeStep + 1} of {scenes.length}: {scene.title}
          </Text>
          <Text style={styles.cardBody}>{scene.body}</Text>
          <Text style={styles.cardBody}>{scene.caption}</Text>
          {isBundledScreenshot(scene) ? (
            <>
              <Image
                source={{
                  uri:
                    Platform.OS === "web"
                      ? scene.image
                      : `https://growpathai.com${scene.image}`
                }}
                alt={scene.alt}
                accessibilityLabel={scene.alt}
                resizeMode="contain"
                style={{
                  width: "100%",
                  maxWidth: scene.width,
                  aspectRatio: scene.width / scene.height,
                  alignSelf: "center"
                }}
              />
              <Link
                href={scene.image}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.navigationLink}
              >
                Open full-size screenshot: {scene.title}
              </Link>
            </>
          ) : (
            <Text style={styles.cardBody}>Screenshot unavailable for this step.</Text>
          )}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              accessibilityState={{ disabled: first }}
              disabled={first}
              onPress={() => setStep(Math.max(0, activeStep - 1))}
              style={[styles.secondary, first && { opacity: 0.5 }]}
            >
              <Text style={styles.link}>Previous</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next step"
              accessibilityState={{ disabled: last }}
              disabled={last}
              onPress={() => setStep(Math.min(scenes.length - 1, activeStep + 1))}
              style={[styles.secondary, last && { opacity: 0.5 }]}
            >
              <Text style={styles.link}>Next</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Text style={styles.cardBody}>No walkthrough steps are available yet.</Text>
      )}
      <Text accessibilityRole="header" aria-level={4} style={styles.cardTitle}>
        What this example shows
      </Text>
      <Text style={styles.cardBody}>{story.result}</Text>
      <Text accessibilityRole="header" aria-level={4} style={styles.cardTitle}>
        Fit and limits
      </Text>
      <Text style={styles.cardBody}>{story.limits}</Text>
    </View>
  );
}
