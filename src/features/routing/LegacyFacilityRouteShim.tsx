import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";
import { useEntitlements } from "@/entitlements";
import { decideLegacyFacilityAccess } from "./legacyFacilityAccess";
import {
  legacyFacilitySectionToRoute,
  type LegacyFacilitySection
} from "./legacyFacilityRedirect";

export function LegacyFacilityRouteShim({ section }: { section: LegacyFacilitySection }) {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const { mode } = useAccountMode();
  const entitlements = useEntitlements();
  const { selectedId, selectFacility } = useFacility() as any;

  React.useEffect(() => {
    if (!rootNavigationState?.key || !entitlements.ready) return;

    const decision = decideLegacyFacilityAccess({
      mode,
      routeFacilityId: facilityId,
      selectedFacilityId: selectedId,
      entitledFacilityId: entitlements.facilityId
    });

    if (!decision.allowed) {
      router.replace(decision.redirect);
      return;
    }

    if (typeof selectFacility === "function" && selectedId !== decision.facilityId) {
      selectFacility(decision.facilityId);
    }

    router.replace(legacyFacilitySectionToRoute(section));
  }, [
    mode,
    facilityId,
    selectedId,
    selectFacility,
    entitlements.facilityId,
    entitlements.ready,
    rootNavigationState?.key,
    router,
    section
  ]);

  return (
    <View style={styles.centered}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    minHeight: 240
  }
});
