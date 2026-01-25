import { useAuth } from "../context/AuthContext";
import { ApiError } from "./errors";

export function useApiGuards() {
  const { logout } = useAuth();

  function onError(e: unknown) {
    const err = e as ApiError;
    if (err?.code === "UNAUTHORIZED" || err?.status === 401) {
      // token expired / invalid -> force sign-out
      logout();
    }
  }

  return { onError };
}
