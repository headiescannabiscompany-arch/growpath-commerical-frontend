import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedComparison = {
  id: string;
  facilityId: string;
  createdAtISO: string;
  highlight?: {
    headline: string;
    bullets: string[];
  };
  compareHref: string;
};

const STORE_KEY = "gp:saved-comparisons";

export const savedComparisonsStore = {
  async list(): Promise<SavedComparison[]> {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(comparison: SavedComparison): Promise<void> {
    const all = await savedComparisonsStore.list();
    const next = [comparison, ...all.filter((c) => c.id !== comparison.id)];
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
  },
  async remove(id: string): Promise<void> {
    const all = await savedComparisonsStore.list();
    const next = all.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
  },
  async get(id: string): Promise<SavedComparison | undefined> {
    const all = await savedComparisonsStore.list();
    return all.find((c) => c.id === id);
  }
};
