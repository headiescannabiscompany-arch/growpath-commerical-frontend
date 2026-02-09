import AsyncStorage from "@react-native-async-storage/async-storage";

export type ComparisonPreset = {
  id: string;
  facilityId: string;
  label: string;
  runA: string;
  runB: string;
  createdAt: string;
};

function keyForFacility(facilityId: string) {
  return `gp:comparison-presets:${facilityId}`;
}

export async function listComparisonPresets(
  facilityId: string
): Promise<ComparisonPreset[]> {
  const key = keyForFacility(facilityId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveComparisonPreset(
  facilityId: string,
  preset: Omit<ComparisonPreset, "facilityId">
): Promise<ComparisonPreset[]> {
  const existing = await listComparisonPresets(facilityId);
  const next: ComparisonPreset[] = [
    { ...preset, facilityId },
    ...existing.filter((p) => p.id !== preset.id)
  ];
  await AsyncStorage.setItem(keyForFacility(facilityId), JSON.stringify(next));
  return next;
}

export async function deleteComparisonPreset(
  facilityId: string,
  presetId: string
): Promise<ComparisonPreset[]> {
  const existing = await listComparisonPresets(facilityId);
  const next = existing.filter((p) => p.id !== presetId);
  await AsyncStorage.setItem(keyForFacility(facilityId), JSON.stringify(next));
  return next;
}
