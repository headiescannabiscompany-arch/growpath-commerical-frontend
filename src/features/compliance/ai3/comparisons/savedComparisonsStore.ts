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
    const saveAll = await savedComparisonsStore.list();
    const saveNext = [comparison, ...saveAll.filter((c) => c.id !== comparison.id)];
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(saveNext));
  },
  async remove(id: string): Promise<void> {
    const removeAll = await savedComparisonsStore.list();
    const removeNext = removeAll.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(removeNext));
  },
  async get(id: string): Promise<SavedComparison | undefined> {
    const getAll = await savedComparisonsStore.list();
    return getAll.find((c) => c.id === id);
  }
};
