import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function FacilityProfileScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.facilityProfile;
  return (
    <ScreenScaffold
      mode="facility"
      title="Profile"
      subtitle="View and edit your facility’s profile, contact info, and settings."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Profile." tone="locked" />
        ) : (
          <Pill
            text="No profile data yet. Profile info will appear here when available."
            tone="locked"
          />
        )
      }
    >
      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill text="• Facility details" />
          <Pill text="• Contact information" />
          <Pill text="• Settings and preferences" />
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
