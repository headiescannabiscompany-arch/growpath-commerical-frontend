import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasks, createCustomTask, completeTask } from "../api/tasks";

export function usePersonalTasks() {
  import * as React from "react";
  import { apiRequest } from "../api/apiRequest";

  type UsePersonalTasksResult<T = any> = {
    data: T | null;
    isLoading: boolean;
    error: any;
    refetch: () => Promise<void>;
  };

  export function usePersonalTasks<T = any[]>(): UsePersonalTasksResult<T> {
    const [data, setData] = React.useState<T | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<any>(null);

    const mountedRef = React.useRef(true);

    const refetch = React.useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Personal tasks list
        const out = await apiRequest<T>("/api/tasks", { method: "GET" });
        if (mountedRef.current) setData(out);
      } catch (e) {
        if (mountedRef.current) setError(e);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }, []);

    React.useEffect(() => {
      mountedRef.current = true;
      void refetch();
      return () => {
        mountedRef.current = false;
      };
    }, [refetch]);

    return { data, isLoading, error, refetch };
  }
}
