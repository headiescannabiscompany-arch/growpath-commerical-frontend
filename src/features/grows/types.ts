export type Grow = {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  stage: string;
  yield?: number;
  notes?: string;
  deletedAt?: string | null;
};
