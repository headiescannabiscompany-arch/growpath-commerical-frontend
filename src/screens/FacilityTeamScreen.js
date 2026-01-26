import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function FacilityTeamScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.facilityTeam;
  return (
    <ScreenScaffold
      mode="facility"
      title="Team"
      subtitle="Manage your facility’s team, roles, and permissions."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill
            text="Locked: Your plan does not include Team management."
            tone="locked"
          />
        ) : (
          <Pill
            text="No team members found. Invite a user to see them here."
            tone="locked"
          />
        )
      }
    >
      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill text="• Team list" />
          <Pill text="• Role management" />
          <Pill text="• Invite users" />
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
