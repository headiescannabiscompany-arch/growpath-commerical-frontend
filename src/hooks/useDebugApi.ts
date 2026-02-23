import { useMutation } from "@tanstack/react-query";
import { getDebugInfo, pingHealth } from "@/api/debug";

function unwrapOrThrow(res: any, fallbackMessage: string) {
  if (res && typeof res === "object" && "success" in res) {
    if (!res.success) {
      const err = new Error(res.message || fallbackMessage);
      // @ts-ignore
      err.payload = res;
      throw err;
    }
    return res.data;
  }
  return res;
}

export function useDebugApi() {
  const ping = useMutation({
    mutationFn: async () => {
      const pingRes = await pingHealth();
      return unwrapOrThrow(pingRes, "Could not reach server.");
    }
  });

  const info = useMutation({
    mutationFn: async () => {
      const infoRes = await getDebugInfo();
      return unwrapOrThrow(infoRes, "Could not load debug info.");
    }
  });

  return {
    pingAsync: ping.mutateAsync,
    infoAsync: info.mutateAsync,
    isWorking: ping.isPending || info.isPending
  };
}
