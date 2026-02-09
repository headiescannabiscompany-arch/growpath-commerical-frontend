import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function InventoryItemDetailScreen() {
  const { selectedId: facilityId } = useFacility();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();

  return (
    <ScreenBoundary name="facility.inventory.itemDetail">
      <View style={{ flex: 1, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Inventory Item</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : !itemId ? (
          <Text>Missing itemId.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>facilityId: {facilityId}</Text>
            <Text style={{ opacity: 0.75 }}>itemId: {itemId}</Text>
            <Text style={{ marginTop: 12 }}>
              Stub detail screen (Step 1 safe mount). Wire GET item endpoint in Step 3.
            </Text>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
        endpoints.inventoryItem(facilityId, itemId as string)
      );
      setItem(data);
    } catch (e: any) {
      setError(handleApiError(e));
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <InlineError error={error} />
      <Text style={styles.title}>{item?.name || "Inventory Item"}</Text>
      <Text style={styles.label}>On-Hand: {item?.onHand ?? "-"}</Text>
      {canEdit && (
        <View style={styles.adjustSection}>
          <TextInput
            style={styles.input}
            placeholder="Adjust Quantity (delta)"
            value={adjustAmount}
            onChangeText={setAdjustAmount}
            keyboardType="numeric"
            editable={!isAdjusting}
          />
          <TouchableOpacity
            style={[styles.button, !adjustAmount && styles.buttonDisabled]}
            disabled={!adjustAmount || isAdjusting}
            onPress={handleAdjust}
          >
            {isAdjusting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Adjust</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    marginBottom: 16
  },
  adjustSection: {
    marginTop: 24
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  button: {
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center"
  },
  buttonDisabled: {
    backgroundColor: "#f3f4f6"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
