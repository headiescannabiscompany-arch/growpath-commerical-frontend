import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";

export type CommercialAction = {
  label: string;
  href: string;
};

export type CommercialSection = {
  title: string;
  body: string;
  bullets?: string[];
  actions?: CommercialAction[];
  status?: "ready" | "beta" | "needs-backend";
};

type CommercialWorkflowPageProps = {
  title: string;
  subtitle: string;
  sections: CommercialSection[];
  primaryActions?: CommercialAction[];
  routeKey?: string;
};

function ActionButton({ action }: { action: CommercialAction }) {
  return (
    <Link href={action.href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    </Link>
  );
}

function statusLabel(status?: CommercialSection["status"]) {
  if (status === "ready") return "Live";
  if (status === "beta") return "Beta";
  if (status === "needs-backend") return "Backend needed";
  return null;
}

export default function CommercialWorkflowPage({
  title,
  subtitle,
  sections,
  primaryActions = [],
  routeKey = "commercial"
}: CommercialWorkflowPageProps) {
  const auth = useAuth();
  const ent = useEntitlements();

  return (
    <AppPage
      routeKey={routeKey}
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.accountLine}>
              {[auth.user?.email, `${ent.plan || "commercial"} plan`]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          {primaryActions.length ? (
            <View style={styles.headerActions}>
              {primaryActions.map((action) => (
                <ActionButton key={`${action.href}-${action.label}`} action={action} />
              ))}
            </View>
          ) : null}
        </View>
      }
    >
      {sections.map((section) => {
        const label = statusLabel(section.status);
        return (
          <AppCard key={section.title}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              {label ? <Text style={styles.status}>{label}</Text> : null}
            </View>
            <Text style={styles.body}>{section.body}</Text>
            {section.bullets?.length ? (
              <View style={styles.bullets}>
                {section.bullets.map((bullet) => (
                  <Text key={bullet} style={styles.bullet}>
                    {bullet}
                  </Text>
                ))}
              </View>
            ) : null}
            {section.actions?.length ? (
              <View style={styles.actions}>
                {section.actions.map((action) => (
                  <ActionButton key={`${section.title}-${action.href}`} action={action} />
                ))}
              </View>
            ) : null}
          </AppCard>
        );
      })}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  accountLine: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8
  },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 440
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    flex: 1,
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  bullets: {
    gap: 6,
    marginTop: 10
  },
  bullet: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  status: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#075985",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase"
  }
});
