import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { resolveFacilityCourseScope } from "@/api/facilityCourses";
import {
  listFacilityCourseLiveEvents,
  type FacilityCourseLiveEvent
} from "@/api/facilityCourseLiveEvents";

export function useFacilityCourseLiveEvents() {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const facility = useFacility();
  const scope = resolveFacilityCourseScope(
    facility.selectedId || entitlements.facilityId,
    entitlements.facilityId,
    entitlements.facilityRole,
    facility.selected
  );
  const userId = String(auth.user?.id || auth.user?._id || "");
  const facilityId = scope?.facilityId || "";
  const key =
    entitlements.ready && userId && scope ? `${userId}:${facilityId}:${scope.role}` : "";
  const [state, setState] = useState({
    key: "",
    liveEvents: [] as FacilityCourseLiveEvent[],
    loading: false,
    error: ""
  });
  const sequence = useRef(0);
  const inFlight = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current?.key === key) return inFlight.current.promise;
    const generation = ++sequence.current;
    if (!key) {
      setState({ key: "", liveEvents: [], loading: false, error: "" });
      return Promise.resolve();
    }
    setState({ key, liveEvents: [], loading: true, error: "" });
    const promise = listFacilityCourseLiveEvents(facilityId)
      .then(
        (liveEvents) => {
          if (sequence.current === generation) {
            setState({ key, liveEvents, loading: false, error: "" });
          }
        },
        () => {
          if (sequence.current === generation) {
            setState({
              key,
              liveEvents: [],
              loading: false,
              error: "Facility course events could not be verified. Refresh to retry."
            });
          }
        }
      )
      .finally(() => {
        if (sequence.current === generation) inFlight.current = null;
      });
    inFlight.current = { key, promise };
    return promise;
  }, [facilityId, key]);

  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
      inFlight.current = null;
    };
  }, [refresh]);

  return {
    liveEvents: state.key === key ? state.liveEvents : [],
    loading: Boolean(key && (state.key !== key || state.loading)),
    error: state.key === key ? state.error : "",
    refresh
  };
}
