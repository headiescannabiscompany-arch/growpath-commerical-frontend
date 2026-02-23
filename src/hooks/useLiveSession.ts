import { useMutation } from "@tanstack/react-query";
import { endLiveSession, hostLiveSession, joinLiveSession } from "@/api/live";

function unwrapOrThrow(res: any, fallbackMessage: string) {
  // If your api layer returns { success, data, message }, enforce it here.
  if (res && typeof res === "object" && "success" in res) {
    if (!res.success) {
      const err = new Error(res.message || fallbackMessage);
      // @ts-ignore
      err.payload = res;
      throw err;
    }
    return res.data;
  }
  // Otherwise assume the response is already the payload
  return res;
}

export function useLiveSession() {
  const host = useMutation({
    mutationFn: async (input: { displayName: string }) => {
      const res = await hostLiveSession(input);
      const data = unwrapOrThrow(res, "Could not start session.");
      return data?.session || data;
    }
  });

  const join = useMutation({
    mutationFn: async (input: { code: string; displayName: string }) => {
      const joinRes = await joinLiveSession(input);
      const joinData = unwrapOrThrow(joinRes, "Could not join session.");
      return joinData?.session || joinData;
    }
  });

  const end = useMutation({
    mutationFn: async (input: { sessionId: string }) => {
      const endRes = await endLiveSession(input);
      return unwrapOrThrow(endRes, "Could not end session.");
    }
  });

  const isWorking = host.isPending || join.isPending || end.isPending;

  return {
    hostAsync: host.mutateAsync,
    joinAsync: join.mutateAsync,
    endAsync: end.mutateAsync,
    isWorking
  };
}
