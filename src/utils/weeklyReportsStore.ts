import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedWeeklyReport = {
  id: string;
  facilityId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  report: any; // normalized AiWeeklyReport object
};

function keyForFacility(facilityId: string) {
  return `gp:weekly-reports:${facilityId}`;
}

export async function listWeeklyReports(
  facilityId: string
): Promise<SavedWeeklyReport[]> {
  const raw = await AsyncStorage.getItem(keyForFacility(facilityId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveWeeklyReport(
  facilityId: string,
  item: Omit<SavedWeeklyReport, "facilityId">
): Promise<SavedWeeklyReport[]> {
  const existing = await listWeeklyReports(facilityId);
  const next: SavedWeeklyReport[] = [
    { ...item, facilityId },
    ...existing.filter((x) => x.id !== item.id)
  ];
  await AsyncStorage.setItem(keyForFacility(facilityId), JSON.stringify(next));
  return next;
}

export async function deleteWeeklyReport(
  facilityId: string,
  id: string
): Promise<SavedWeeklyReport[]> {
  const deleteExisting = await listWeeklyReports(facilityId);
  const deleteNext = deleteExisting.filter((x) => x.id !== id);
  await AsyncStorage.setItem(keyForFacility(facilityId), JSON.stringify(deleteNext));
  return deleteNext;
}

export async function getWeeklyReport(
  facilityId: string,
  id: string
): Promise<SavedWeeklyReport | null> {
  const reportList = await listWeeklyReports(facilityId);
  return reportList.find((x) => x.id === id) || null;
}
