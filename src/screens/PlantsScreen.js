import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function PlantsScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.personalPlants;
  return (
    <ScreenScaffold
      mode="personal"
      title="Plants"
      subtitle="Plant list by grow + strain tags + photos. Placeholder UI until plant endpoints are wired."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Plants." tone="locked" />
        ) : (
          <Pill
            text="No plants found. Add plants from a grow to see them here."
            tone="locked"
          />
        )
      }
    >
      <Section
        title="Filters"
        right={
          <Pill
            text={locked ? "Locked" : "Grow / Stage / Strain (todo)"}
            tone={locked ? "locked" : undefined}
          />
        }
      >
        <Card title="Filter controls">
          <Pill
            text={locked ? "Feature locked" : "No filters implemented"}
            tone={locked ? "locked" : undefined}
          />
        </Card>
      </Section>

      <Section title="Plant List">
        <Card title="No plants yet">
          <Pill
            text={locked ? "Feature locked" : "Add plants from a Grow"}
            tone="locked"
          />
        </Card>
      </Section>

      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill
            text={locked ? "Upgrade to unlock" : "• Status chips (healthy/stressed)"}
            tone={locked ? "locked" : undefined}
          />
          {!locked && <Pill text="• Photo timeline per plant" />}
          {!locked && <Pill text="• Move plant stage + tag notes" />}
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
