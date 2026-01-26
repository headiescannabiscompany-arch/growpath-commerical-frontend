import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function FacilityCommunityScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.facilityCommunity;
  return (
    <ScreenScaffold
      mode="facility"
      title="Community"
      subtitle="Connect with other facility operators, share tips, and ask questions."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Community." tone="locked" />
        ) : (
          <Pill
            text="No community posts yet. Posts will appear here when available."
            tone="locked"
          />
        )
      }
    >
      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill text="• Community feed" />
          <Pill text="• Q&A" />
          <Pill text="• Tips and best practices" />
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
