import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/api/apiRequest";
import { useFacilityRecordRead } from "./useFacilityRecordRead";

// The caller keys its content by useFacilityRecordScope so neither records nor
// late completions can cross account, session, role, Facility or route boundaries.
export function useFacilityCollectionRead<T>(
  endpoint: string | null,
  normalize: (response: any) => T[]
) {
  const read = useFacilityRecordRead();
  const { mounted, clearError, handleApiError, setHasLoaded, setReadFailed } = read;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const succeeded = useRef(false);
  const load = useCallback(async () => {
    if (!endpoint || inFlight.current || !mounted.current) return;
    inFlight.current = true;
    if (succeeded.current) setRefreshing(true);
    else setLoading(true);
    clearError();
    try {
      const response = await apiRequest(endpoint);
      if (!mounted.current) return;
      setItems(normalize(response));
      succeeded.current = true;
      setHasLoaded(true);
      setReadFailed(false);
    } catch (error) {
      if (!mounted.current) return;
      setReadFailed(true);
      handleApiError(error);
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    endpoint,
    normalize,
    mounted,
    clearError,
    handleApiError,
    setHasLoaded,
    setReadFailed
  ]);
  return {
    ...read,
    items,
    loading,
    refreshing,
    load,
    readable: read.hasLoaded && !read.readFailed && !loading && !refreshing
  };
}
