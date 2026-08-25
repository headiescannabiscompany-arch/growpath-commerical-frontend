import { Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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
    title: "Shared core surfaces",
    destinations: [
      {
        label: "Dashboard",
        href: "/home/commercial",
        description: "Open the commercial command center and launch readiness view."
      },
      {
        label: "Grows",
        href: "/home/commercial/grows",
        description: "Review trial runs, journals, tasks, and timeline evidence."
      },
      {
        label: "Videos",
        href: "/videos?tab=library",
        description:
          "Upload once, manage workspace video storage, and publish videos for discovery."
      },
      {
        label: "Discover",
        href: "/home/commercial/discover",
        description: "Browse published storefronts, videos, courses, and field findings."
      },
      {
        label: "Notifications",
        href: "/home/notifications",
        description: "Review inbox alerts, read status, and delivery preferences."
      },
      {
        label: "Tasks",
        href: "/home/commercial/tasks",
        description: "Track action items that keep the workspace moving."
      }
    ]
  },
  {
    title: "Learning and engagement",
    destinations: [
      {
        label: "Courses",
        href: "/home/commercial/courses",
        description: "Build product education and manage learner-facing courses."
      },
      {
        label: "Lives",
        href: "/home/commercial/lives",
        description: "Plan live sessions, connection status, and audience access."
      },
      {
        label: "Forum / Q&A",
        href: "/home/commercial/community",
        description:
          "Answer product, course, and live questions through the shared Forum."
      },
      {
        label: "External Channels",
        href: "/home/commercial/social-tools",
        description:
          "Review connected social channels and metrics, with a clear provider handoff for publishing."
      }
    ]
  },
  {
    title: "Sales and measurement",
    destinations: [
      {
        label: "Orders",
        href: "/home/commercial/orders",
        description: "Review paid internal orders and fulfillment status."
      },
      {
        label: "Analytics",
        href: "/home/commercial/analytics",
        description:
          "Review event-backed storefront, campaign, course, live, and order activity."
      },
      {
        label: "Business Desk",
        href: "/home/commercial/business-desk",
        description:
          "Price, quote, follow up, capture expenses, compare vendors, and review cash-flow work."
      }
    ]
  },
  {
    title: "Products and production",
    destinations: [
      {
        label: "Product Lines",
        href: "/home/commercial/product-lines",
        description: "Organize related products and public storefront families."
      },
      {
        label: "Product Batches",
        href: "/home/commercial/batch-planner",
        description: "Connect reviewed formulas, batches, lots, tasks, and evidence."
      },
      {
        label: "Product Trials",
        href: "/home/commercial/trials",
        description: "Collect evidence before making product-performance claims."
      },
      {
        label: "Inventory Support",
        href: "/home/commercial/inventory",
        description:
          "Track supporting ingredients, lots, costs, and availability records."
      },
      {
        label: "Horticulture Operations",
        href: "/home/commercial/horticulture",
        description:
          "Review plant and product evidence, nursery care history, holds, and fulfillment readiness."
      }
    ]
  },
  {
    title: "Workspace",
    destinations: [
      {
        label: "Profile",
        href: "/home/commercial/profile",
        description:
          "Manage the commercial identity, storefront setup, and account context."
      },
      {
        label: "Public Links",
        href: "/home/commercial/links",
        description:
          "Manage the public links shown with the Commercial brand and storefront."
      },
      {
        label: "Tools",
        href: "/home/commercial/tools",
        description: "Open Commercial planning, formulation, reporting, and AI tools."
      }
    ]
  }
];

function WorkspaceLink({ description, href, label }: WorkspaceDestination) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialMoreStyles(palette), [palette]);

  return (
    <Link href={href as any} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${label}`}
        style={styles.destination}
      >
        <Text style={styles.destinationTitle}>{label}</Text>
        <Text style={styles.destinationDescription}>{description}</Text>
        <Text style={styles.destinationAction}>Open</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialMoreRoute() {
  const { palette } = useAppTheme();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const styles = useMemo(() => createCommercialMoreStyles(palette), [palette]);
  const isPlatformAdmin = String(auth.user?.role || "").toLowerCase() === "admin";

  return (
    <AppPage
      routeKey="commercial-more"
      longContent
      header={
        <View style={styles.header}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            More Commercial Workspaces
          </Text>
          <Text style={styles.subtitle}>
            Open every Commercial workspace that does not fit in the compact bottom
            navigation.
          </Text>
        </View>
      }
    >
      {workspaceGroups.map((group) => (
        <AppCard key={group.title}>
          <Text accessibilityRole="header" aria-level={2} style={styles.groupTitle}>
            {group.title}
          </Text>
          <View style={styles.destinationGrid}>
            {group.destinations
              .filter(
                (destination) =>
                  !["Business Desk", "Horticulture Operations"].includes(
                    destination.label
                  ) || entitlements.can(CAPABILITY_KEYS.BUSINESS_DESK_READ)
              )
              .map((destination) => (
                <WorkspaceLink key={destination.href} {...destination} />
              ))}
          </View>
        </AppCard>
      ))}
      {isPlatformAdmin ? (
        <AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.groupTitle}>
            Platform administration
          </Text>
          <View style={styles.destinationGrid}>
            <WorkspaceLink
              label="Admin Tools"
              href="/admin"
              description="Review moderation, reports, security, accounts, and platform operations."
            />
          </View>
        </AppCard>
      ) : null}
    </AppPage>
  );
}

export function createCommercialMoreStyles(palette: ThemePalette) {
  return StyleSheet.create({
    destination: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
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
      color: palette.link,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 10
    },
    destinationDescription: {
      color: palette.textMuted,
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
      color: palette.text,
      fontSize: 16,
      fontWeight: "900"
    },
    groupTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 12
    },
    header: {
      gap: 6
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 14,
      lineHeight: 20
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: "900"
    }
  });
}
