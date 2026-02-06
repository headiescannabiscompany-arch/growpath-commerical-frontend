import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { Grow } from "./types";

export function useGrows() {
  const { token } = useAuth();
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;

  return useQuery<Grow[]>({
    queryKey: ["grows", facilityId],
    queryFn: () => api.get(endpoints.grows(facilityId!), token),
    enabled: !!facilityId && !!token
  });
}

export function useGrow(id: string) {
  const { token } = useAuth();
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;

  return useQuery<Grow>({
    queryKey: ["grow", facilityId, id],
    queryFn: () => api.get(`${endpoints.grows(facilityId!)}/${id}`, token),
    enabled: !!facilityId && !!token && !!id
  });
}
