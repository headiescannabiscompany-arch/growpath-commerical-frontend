import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { api } from "../../../api/client";
import { useFacility } from "../../facility/FacilityProvider";

export default function AuditTrail() {
  const { facilityId } = useFacility();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get(`/api/facility/${facilityId}/audit`).then(setEvents);
  }, [facilityId]);

  return (
    <ScrollView style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Audit Trail</Text>
      {events.map((e, i) => (
        <View key={i} style={{ marginVertical: 8 }}>
          <Text>
            {e.timestamp} — {e.userName} — {e.action} — {e.details}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
