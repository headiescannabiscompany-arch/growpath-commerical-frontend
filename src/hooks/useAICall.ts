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
  raw?: any;
};

export function normalizeAIEnvelope<TData = any>(res: any): AIEnvelope<TData> {
  const success = Boolean(res?.success);
  if (!success) {
    return {
      success: false,
      data: (res?.data ?? null) as TData | null,
      error: res?.error || { code: "AI_ERROR", message: "AI call failed" },
      raw: res
    };
  }

  const data =
    res && Object.prototype.hasOwnProperty.call(res, "data")
      ? res.data
      : {
          result: res?.result ?? null,
          tool: res?.tool,
          fn: res?.fn,
          growId: res?.growId ?? null,
          writes: Array.isArray(res?.writes) ? res.writes : []
        };

  return {
    success: true,
    data: data as TData,
    error: null,
    raw: res
  };
}

export function useAICall(facilityId: string) {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<AIEnvelope | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const callAI = useCallback(
    async <TData = any>(body: AICallBody) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<any>(
          `/api/facility/${encodeURIComponent(facilityId)}/ai/call`,
          { method: "POST", body }
        );
        const normalized = normalizeAIEnvelope<TData>(res);
        setLast(normalized);
        if (!normalized.success) setError(normalized.error);
        return normalized;
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
