export type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unit?: string;
  deletedAt?: string | null;
};
