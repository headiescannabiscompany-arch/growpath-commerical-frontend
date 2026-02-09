import React from "react";
import { LegacyFacilityRouteShim } from "@/features/routing/LegacyFacilityRouteShim";

export default function LegacyFacilityTeam() {
  return <LegacyFacilityRouteShim section="team" />;
}
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569"
  }
});

export default function FacilityTeam() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return (
    <AppPage
      routeKey="facility_ops"
      header={
        <View>
          <Text style={styles.headerTitle}>Team</Text>
          <Text style={styles.headerSubtitle}>facilityId: {facilityId}</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Team Roster</Text>
        <Text style={styles.cardDesc}>Stub screen</Text>
      </AppCard>
    </AppPage>
  );
}
