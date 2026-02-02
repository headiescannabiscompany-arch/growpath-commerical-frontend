export type TeamMember = {
  id: string;
  userId: string;
  email?: string;
  role: "OWNER" | "MANAGER" | "STAFF" | "VIEWER";
  deletedAt?: string | null;
};
