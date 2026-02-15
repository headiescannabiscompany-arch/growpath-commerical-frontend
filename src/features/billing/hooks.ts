import { api } from "../../api/client";
import { useFacility } from "../../facility/FacilityProvider";
import { useAuth } from "../../auth/AuthContext";

export function useBilling() {
  const { facilityId } = useFacility();
  const { token } = useAuth();

  return {
    getPlan: () => api.get(`/api/facility/${facilityId}/billing`, token),

    createCheckout: (priceId: string) =>
      api.post(`/api/facility/${facilityId}/billing/checkout`, { priceId }, token),

    openPortal: () => api.post(`/api/facility/${facilityId}/billing/portal`, {}, token)
  };
}
