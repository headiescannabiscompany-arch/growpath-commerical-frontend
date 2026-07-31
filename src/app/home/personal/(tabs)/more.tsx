import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Destination = {
  description: string;
  href: string;
  label: string;
};

const groups: Array<{ title: string; destinations: Destination[] }> = [
  {
    title: "Tools and AI",
    destinations: [
      {
        label: "AI Tools",
        href: "/home/personal/tools",
        description: "Open the personal AI tools and calculators."
      },
      {
        label: "Diagnose",
        href: "/home/personal/diagnose",
        description: "Review plant issues, symptoms, and follow-up guidance."
      },
      {
        label: "Field Studies",
        href: "/field-observations",
        description: "Explore shared, location-aware field findings."
      }
    ]
  },
  {
    title: "Learning and records",
    destinations: [
      {
        label: "Courses",
        href: "/courses",
        description: "Open training, lessons, and learning resources."
      },
      {
        label: "Videos",
        href: "/videos?tab=library",
        description: "Open the video library and storage-managed uploads."
      },
      {
        label: "Logs",
        href: "/home/personal/grows",
        description: "Choose a grow to review its journal and event history."
      },
      {
        label: "Tasks",
        href: "/home/personal/tasks",
        description: "Review personal follow-up work and action items."
      }
    ]
  },
  {
    title: "Workspace",
    destinations: [
      {
        label: "Profile",
        href: "/home/personal/profile",
        description: "Manage your account, mode, theme, and privacy."
      },
      {
        label: "Switch workspace",
        href: "/account/mode",
        description: "Move between Personal, Commercial, and Facility."
      }
    ]
  }
];

function MoreLink({ description, href, label }: Destination) {
  const { palette } = useAppTheme();
  return (
    <Link href={href as any} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${label}`}
        style={StyleSheet.flatten([
          styles.destination,
          { backgroundColor: palette.surface, borderColor: palette.border }
        ])}
      >
        <Text style={[styles.destinationTitle, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.destinationDescription, { color: palette.textMuted }]}>
          {description}
        </Text>
        <Text style={[styles.destinationAction, { color: palette.accent }]}>Open</Text>
      </Pressable>
    </Link>
  );
}

export default function PersonalMoreRoute() {
  const { palette } = useAppTheme();

  return (
    <AppPage
      routeKey="personal-more"
      longContent
      header={
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.title, { color: palette.text }]}
          >
            More Personal Workspaces
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Open the tools and secondary surfaces that do not fit in the compact tab bar.
          </Text>
        </View>
      }
    >
      {groups.map((group) => (
        <AppCard key={group.title}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={[styles.groupTitle, { color: palette.text }]}
          >
            {group.title}
          </Text>
          <View style={styles.destinationGrid}>
            {group.destinations.map((destination) => (
              <MoreLink key={destination.href} {...destination} />
            ))}
          </View>
        </AppCard>
      ))}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  destination: {
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
    minHeight: 120,
    minWidth: 220,
    padding: 14
  },
  destinationAction: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10
  },
  destinationDescription: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  },
  destinationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: "900"
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  header: {
    gap: 6
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "900"
  }
});
