import React from "react";
import ScreenScaffold, { Section, Card, Pill } from "../components/ScreenScaffold";
import { useAuth } from "@/auth/AuthContext";

export default function FacilityRoomsScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.facilityRooms;
  return (
    <ScreenScaffold
      mode="facility"
      title="Rooms"
      subtitle="Define rooms/zones and set environmental targets for each area."
      status={locked ? "LOCKED" : "STUB"}
      emptyState={
        locked ? (
          <Pill text="Locked: Your plan does not include Rooms." tone="locked" />
        ) : (
          <Pill text="No rooms found. Add a room to see them here." tone="locked" />
        )
      }
    >
      <Section title="Planned features">
        <Card title="Roadmap">
          <Pill text="• Rooms list (veg/flower/dry/prop)" />
          <Pill text="• Room details: targets + notes" />
          <Pill text="• Assign plants/batches to rooms" />
          <Pill text="• Alerts: out-of-range conditions" />
        </Card>
      </Section>
    </ScreenScaffold>
  );
}
