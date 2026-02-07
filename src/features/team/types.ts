export type TeamMember = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
  deletedAt?: string | null;
};
