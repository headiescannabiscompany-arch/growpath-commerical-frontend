import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
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
        label: "Tools",
        href: "/home/commercial/tools",
        description: "Open Commercial planning, formulation, reporting, and AI tools."
      }
    ]
  }
];

function WorkspaceLink({ description, href, label }: WorkspaceDestination) {
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
            {group.destinations.map((destination) => (
              <WorkspaceLink key={destination.href} {...destination} />
            ))}
          </View>
        </AppCard>
      ))}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  destination: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 120,
    minWidth: 220,
    padding: 14
  },
  destinationAction: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10
  },
  destinationDescription: {
    color: "#475569",
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
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  groupTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  header: {
    gap: 6
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900"
  }
});
