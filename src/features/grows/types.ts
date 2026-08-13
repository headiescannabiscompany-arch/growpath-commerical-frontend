export type Grow = {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  stage: string;
  yield?: number;
  notes?: string;
  cropTypes?: string[];
  growInterests?: Record<string, string[]>;
  deletedAt?: string | null;
};
