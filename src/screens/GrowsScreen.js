import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function GrowsScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.personalGrows;
  return (
    <ScreenScaffold
      mode="personal"
      title="Grows"
      subtitle="Grow list, batch management, and harvest tracking. Placeholder UI until endpoints are wired."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Grows." tone="locked" />
        ) : (
          <Pill text="No grows found. Add a grow to see them here." tone="locked" />
        )
      }
    >
      <Section
        title="Filters"
        right={
          <Pill
            text={locked ? "Locked" : "Batch / Stage / Strain (todo)"}
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

      <Section title="Grow List">
        <Card title="No grows yet">
          <Pill
            text={locked ? "Feature locked" : "Add a grow to get started"}
            tone="locked"
          />
        </Card>
      </Section>

      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill
            text={locked ? "Upgrade to unlock" : "• Batch management"}
            tone={locked ? "locked" : undefined}
          />
          {!locked && <Pill text="• Harvest tracking" />}
          {!locked && <Pill text="• Grow analytics" />}
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
