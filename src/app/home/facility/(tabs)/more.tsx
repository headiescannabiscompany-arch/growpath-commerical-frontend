import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type WorkspaceDestination = {
  description: string;
  href: string;
  label: string;
};

const workspaceGroups: Array<{
  destinations: WorkspaceDestination[];
  title: string;
}> = [
  {
    title: "Facility operations",
    destinations: [
      {
        label: "Dashboard",
        href: "/home/facility",
        description: "Open the Facility command center and live operational status."
      },
      {
        label: "Rooms",
        href: "/home/facility/rooms",
        description: "Review rooms, zones, devices, and room-level work."
      },
      {
        label: "Grows",
        href: "/home/facility/grows",
        description: "Track grows, runs, task context, and operational evidence."
      },
      {
        label: "Plants",
        href: "/home/facility/plants",
        description: "Manage plant records, context, and linked observations."
      },
      {
        label: "Tasks",
        href: "/home/facility/tasks",
        description: "Review assigned work, proof, approvals, and follow-up items."
      },
      {
        label: "SOPs",
        href: "/home/facility/sop-runs",
        description: "Run, compare, and review facility procedures."
      },
      {
        label: "Compliance",
        href: "/home/facility/compliance",
        description: "Review verification, audit readiness, and compliance exports."
      }
    ]
  },
  {
    title: "Admin and records",
    destinations: [
      {
        label: "Inventory",
        href: "/home/facility/inventory",
        description: "Track facility inventory, lots, and adjustments."
      },
      {
        label: "Team",
        href: "/home/facility/team",
        description: "Invite members, manage roles, and assign work."
      },
      {
        label: "Sales",
        href: "/home/facility/transfers",
        description: "Review licensed transfers, manifests, and totals."
      },
      {
        label: "Reports",
        href: "/home/facility/reports",
        description: "Open operational summaries and export packets."
      },
      {
        label: "Analytics",
        href: "/home/facility/analytics",
        description: "Inspect room stability, SOPs, alerts, and training metrics."
      },
      {
        label: "Integrations",
        href: "/home/facility/integrations",
        description: "Connect room data, sensors, and read-only import previews."
      },
      {
        label: "AI",
        href: "/home/facility/ai-ask",
        description: "Open facility AI prompts, review, and helper workflows."
      }
    ]
  },
  {
    title: "Learning and community",
    destinations: [
      {
        label: "Feed",
        href: "/home/facility/feed",
        description: "Share updates, campaigns, and public-facing activity."
      },
      {
        label: "Courses",
        href: "/courses",
        description: "Open facility training courses and shared lesson resources."
      },
      {
        label: "Videos",
        href: "/videos?tab=library",
        description: "Manage the video library and workspace storage use."
      },
      {
        label: "Forum / Q&A",
        href: "/forum",
        description: "Open discussion, help threads, and community questions."
      },
      {
        label: "Notifications",
        href: "/home/notifications?workspace=facility",
        description: "Review alerts, delivery status, and notification preferences."
      }
    ]
  },
  {
    title: "Workspace",
    destinations: [
      {
        label: "Profile",
        href: "/home/facility/profile",
        description: "Manage the facility identity, plan, and AI usage."
      },
      {
        label: "Switch workspace",
        href: "/account/mode",
        description: "Move between Personal, Commercial, and Facility accounts."
      }
    ]
  }
];

const VIEWER_DESCRIPTIONS: Record<string, string> = {
  Plants: "Review plant records, context, and linked observations.",
  Compliance: "Review verification and audit-readiness records.",
  Inventory: "Review facility inventory and lot records.",
  Team: "View facility members and their access roles.",
  Reports: "Review available operational summaries.",
  Integrations: "Review connected room data and sensor previews.",
  Feed: "Review facility updates and public-facing activity.",
  Videos: "Review the shared video library and workspace storage use.",
  Profile: "Review the facility identity, plan, and AI usage."
};

function WorkspaceLink({ description, href, label }: WorkspaceDestination) {
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

export default function FacilityMoreRoute() {
  const { palette } = useAppTheme();
  const entitlements = useEntitlements();
  const isViewer = String(entitlements.facilityRole || "").toUpperCase() === "VIEWER";
  return (
    <AppPage
      routeKey="facility-more"
      longContent
      header={
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.title, { color: palette.text }]}
          >
            More Facility Workspaces
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Open the admin, learning, and social surfaces that do not fit in the compact
            Facility tab bar.
          </Text>
        </View>
      }
    >
      {workspaceGroups.map((group) => (
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
              <WorkspaceLink
                key={destination.href}
                {...destination}
                description={
                  isViewer
                    ? VIEWER_DESCRIPTIONS[destination.label] || destination.description
                    : destination.description
                }
              />
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
