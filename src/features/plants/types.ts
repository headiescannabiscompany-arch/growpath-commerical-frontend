export type Plant = {
  id: string;
  name: string;
  strain?: string;
  stage: string;
  roomId?: string;
  roomName?: string;
  growId?: string;
  daysInStage?: number;
  deletedAt?: string | null;
  archivedAt?: string | null;
};
