import { useMutation } from "@tanstack/react-query";
import {
  signupAsVendor,
  VendorSignupData,
  VendorSignupResponse
} from "@/api/vendorSignup";

export function useVendorSignup() {
  const mutation = useMutation({
    mutationFn: (data: VendorSignupData) => signupAsVendor(data)
  });

  return {
    signupAsVendor: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data as VendorSignupResponse | undefined
  };
}
