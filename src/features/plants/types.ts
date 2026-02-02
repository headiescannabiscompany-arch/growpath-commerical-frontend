export type Plant = {
  id: string;
  name: string;
  strain?: string;
  stage: string;
  roomId?: string;
  deletedAt?: string | null;
  archivedAt?: string | null;
};
