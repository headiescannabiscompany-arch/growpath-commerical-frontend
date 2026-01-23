import React from "react";
import { StyleSheet } from "react-native";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "../context/AuthContext";

export default function FacilityInventoryScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.facilityInventory;
  return (
    <ScreenScaffold
      mode="facility"
      title="Inventory"
      subtitle="View and manage your facility’s inventory, stock, and supplies."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Inventory." tone="locked" />
        ) : (
          <Pill
            text="No inventory items found. Add an item to see them here."
            tone="locked"
          />
        )
      }
    >
      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill text="• Inventory list" />
          <Pill text="• Stock management" />
          <Pill text="• Inventory actions" />
        </Card>
      </Section>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sub: { fontSize: 14, opacity: 0.8, marginBottom: 12 },
  metaCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12
  },
  metaTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  metaLine: { fontSize: 13, marginBottom: 4, opacity: 0.9 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff"
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  li: { fontSize: 14, marginBottom: 6 },
  hr: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10
  },
  small: { fontSize: 13, opacity: 0.85 },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#f0d58a",
    backgroundColor: "#fff7db",
    borderRadius: 12,
    padding: 12
  },
  lockedTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  lockedText: { fontSize: 14, marginBottom: 6 },
  lockedMeta: { fontSize: 12, opacity: 0.8 },
  errorCard: {
    borderWidth: 1,
    borderColor: "#f0b4b4",
    backgroundColor: "#ffecec",
    borderRadius: 12,
    padding: 12,
    alignItems: "center"
  },
  errorIcon: { fontSize: 26, marginBottom: 6 },
  errorTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  errorMessage: { fontSize: 14, textAlign: "center", marginBottom: 6 },
  errorDetails: { fontSize: 12, color: "#a40000", textAlign: "center" }
});
