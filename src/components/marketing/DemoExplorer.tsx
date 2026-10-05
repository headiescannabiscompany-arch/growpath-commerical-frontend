import React, { useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import { createPublicLandingStyles } from "./PublicLandingPage";
import audiences from "./demoAudiences.json";

// No account/record reads. Only reviewed bundled screenshots and public links.
export default function DemoExplorer() {
  const { palette } = useAppTheme();
  const styles = createPublicLandingStyles(palette);
  const [selected, setSelected] = useState("free");
  const audience = audiences.find((item) => item.id === selected)!;
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
        Explore by account type
      </Text>
      <Text style={styles.cardBody}>
        Choose the work you want to do. These are guided highlights with screenshots, not
        signed-in workspaces. The interactive sample journal follows below.
      </Text>
      <View style={styles.actions}>
        {audiences.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${item.label}`}
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => setSelected(item.id)}
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
        <Link href={audience.href as never} style={styles.navigationLink}>
          {audience.linkLabel}
        </Link>
      </View>
    </View>
  );
}
