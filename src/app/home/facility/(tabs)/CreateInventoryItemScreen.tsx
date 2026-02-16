$root="C:\growpath-commercial\frontend"; cd $root

@'
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

export default function CreateInventoryItemScreen() {
  const { selectedId: facilityId } = useFacility();
  const router = useRouter();
  const onApiError = useApiErrorHandler();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const canSave = useMemo(() => !!facilityId && name.trim().length > 0 && !saving, [facilityId, name, saving]);

  const onSave = useCallback(async () => {
    if (!facilityId) return;
    if (!name.trim()) {
      setError({ title: "Missing name", message: "Item name is required." });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: any = { name: name.trim() };
      if (sku.trim()) body.sku = sku.trim();
      if (unit.trim()) body.unit = unit.trim();

      await apiRequest(endpoints.inventory(facilityId), {
        method: "POST",
        body
      });

      router.replace("/home/facility/(tabs)/inventory");
    } catch (e: any) {
      setError(onApiError(e));
    } finally {
      setSaving(false);
    }
  }, [facilityId, name, sku, unit, onApiError, router]);

  return (
    <ScreenBoundary name="facility.inventory.createItem">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Create Inventory Item</Text>

        {!facilityId ? (
          <>
            <Text style={{ opacity: 0.75 }}>Select a facility first.</Text>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/select")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <InlineError title={error?.title} message={error?.message} requestId={error?.requestId} />

            <TextInput
              placeholder="Item name *"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />

            <TextInput
              placeholder="SKU (optional)"
              value={sku}
              onChangeText={setSku}
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />

            <TextInput
              placeholder="Unit (optional) — e.g. g, ml, each"
              value={unit}
              onChangeText={setUnit}
              autoCapitalize="none"
              style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />

            <TouchableOpacity
              onPress={onSave}
              disabled={!canSave}
              style={{
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                opacity: canSave ? 1 : 0.5,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 10
              }}
            >
              {saving ? <ActivityIndicator /> : null}
              <Text style={{ fontWeight: "900" }}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontWeight: "900" }}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
'@ | Set-Content -Encoding UTF8 .\src\app\home\facility\(tabs)\CreateInventoryItemScreen.tsx
