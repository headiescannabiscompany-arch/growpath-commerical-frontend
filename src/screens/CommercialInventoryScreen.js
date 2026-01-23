import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "../context/AuthContext";

export default function CommercialInventoryScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.commercialInventory;
  return (
    <ScreenScaffold
      mode="commercial"
      title="Inventory"
      subtitle="View and manage your commercial inventory, stock, and supplies."
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
