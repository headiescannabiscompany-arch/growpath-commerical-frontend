import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";

// Use as a React key so records and unsaved edits cannot cross an identity boundary.
export function useFacilityRecordScope(route: unknown) {
  const auth = useAuth();
  const { selectedId } = useFacility();
  const ent = useEntitlements();
  return JSON.stringify([
    auth.user?.id || auth.user?._id,
    auth.token,
    selectedId,
    ent.facilityRole,
    route
  ]);
}

export function useFacilityRecordRead() {
  const mapper = useApiErrorHandler();
  const mapperRef = useRef(mapper);
  useEffect(() => {
    mapperRef.current = mapper;
  }, [mapper]);
  const mounted = useRef(true);
  const [error, setError] = useState<UiErrorState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const clearError = useCallback(() => setError(null), []);
  const handleApiError = useCallback((err: unknown) => {
    if (!mounted.current) return;
    setError(
      mapperRef.current.toInlineError(err) || {
        message: "Unable to read or update this record. Check your access and try again."
      }
    );
  }, []);
  return {
    mounted,
    error,
    clearError,
    handleApiError,
    hasLoaded,
    setHasLoaded,
    readFailed,
    setReadFailed
  };
}
