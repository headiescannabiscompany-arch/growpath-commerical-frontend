import React from "react";
import { View, Text } from "react-native";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function SelectFacilityRoute() {
  function getFacilityId(f: any): string {
    return String(f?.id || f?._id || f?.facilityId || "");
  }

  function getFacilityName(f: any): string {
    return String(f?.name || f?.label || getFacilityId(f) || "Facility");
  }

  export default function FacilitySelectRoute() {
    const router = useRouter();
    const { facilities, isReady, selectFacility } = useFacility();

    const items = Array.isArray(facilities) ? facilities : [];

    return (
      <ErrorBoundary>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            Select Facility
          </Text>

          {!isReady ? (
            <Text>Loading facilities…</Text>
          ) : items.length === 0 ? (
            <Text>No facilities available for this user.</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(f: any) => getFacilityId(f)}
              renderItem={({ item }: any) => {
                const id = getFacilityId(item);
                const name = getFacilityName(item);

                return (
                  <TouchableOpacity
                    onPress={() => {
                      selectFacility(id);
                      router.replace("/home/facility/(tabs)/dashboard" as any);
                    }}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderRadius: 8,
                      marginBottom: 10
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{name}</Text>
                    <Text style={{ marginTop: 4, opacity: 0.75 }}>{id}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </ErrorBoundary>
    );
  }
