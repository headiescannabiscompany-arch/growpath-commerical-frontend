import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useEntitlements } from "../context/EntitlementsContext";

import PersonalNavigator from "./PersonalNavigator";
import CommercialNavigator from "./CommercialNavigator";
import FacilityNavigator from "./FacilityNavigator";

import SelectFacilityScreen from "../screens/common/SelectFacilityScreen";
import NotEntitledScreen from "../screens/common/NotEntitledScreen";

export default function AppNavigator() {
  const { loading, authChecked } = useAuth();
  const ent = useEntitlements();

  if (!authChecked || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!ent) return <NotEntitledScreen reason="Missing entitlements" />;

  switch (ent.mode) {
    case "personal":
      return <PersonalNavigator />;

    case "commercial":
      return <CommercialNavigator />;

    case "facility":
      if (!ent.selectedFacilityId) return <SelectFacilityScreen />;
      return <FacilityNavigator />;

    default:
      return <NotEntitledScreen reason="Unknown mode" />;
  }
}
