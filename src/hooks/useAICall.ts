import { useCallback, useState } from "react";
import { apiRequest } from "@/api/apiRequest";

export type AICallBody = {
  tool: string;
  fn: string;
  args?: any;
  context?: any;
};

export type AIEnvelope<TData = any> = {
  success: boolean;
  data: TData | null;
  error: { code: string; message: string } | null;
};

export function useAICall(facilityId: string) {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<AIEnvelope | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const callAI = useCallback(
    async <TData = any>(body: AICallBody) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<AIEnvelope<TData>>(
          `/api/facility/${encodeURIComponent(facilityId)}/ai/call`,
          { method: "POST", body }
        );
        setLast(res);
        if (!res.success)
          setError(res.error || { code: "AI_ERROR", message: "AI call failed" });
        return res;
      } catch (e: any) {
        const err = {
          code: e?.code || "NETWORK_ERROR",
          message: e?.message || "Request failed"
        };
        setError(err);
        setLast({ success: false, data: null, error: err });
        return { success: false, data: null, error: err } as AIEnvelope<TData>;
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  return { callAI, loading, last, error };
}

