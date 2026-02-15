import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiRequest";

export type PersonalTask = {
  id: string;
  title: string;
  status?: "open" | "done" | string;
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

function normalizeTasks(res: any): PersonalTask[] {
  if (Array.isArray(res)) return res as PersonalTask[];
  if (Array.isArray(res?.items)) return res.items as PersonalTask[];
  if (Array.isArray(res?.data?.items)) return res.data.items as PersonalTask[];
  if (Array.isArray(res?.data?.tasks)) return res.data.tasks as PersonalTask[];
  if (Array.isArray(res?.tasks)) return res.tasks as PersonalTask[];
  return [];
}

export async function fetchPersonalTasks(): Promise<PersonalTask[]> {
  const res = await apiRequest("/api/personal/tasks");
  return normalizeTasks(res);
}

export function usePersonalTasks(): UseQueryResult<PersonalTask[], unknown> {
  return useQuery({
    queryKey: ["personalTasks"],
    queryFn: fetchPersonalTasks
  });
}
