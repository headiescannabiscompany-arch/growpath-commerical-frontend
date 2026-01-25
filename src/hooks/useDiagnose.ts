import { useMutation } from "@tanstack/react-query";
import { analyzeDiagnosis, diagnoseImage } from "../api/diagnose";

export function useDiagnose() {
  const analyze = useMutation({
    mutationFn: (payload: any) => analyzeDiagnosis(payload)
  });

  const diagnosePhoto = useMutation({
    mutationFn: (uri: string) => diagnoseImage(uri)
  });

  return {
    analyze: analyze.mutateAsync,
    analyzing: analyze.isPending,
    analyzeError: analyze.error,
    diagnosePhoto: diagnosePhoto.mutateAsync,
    diagnosing: diagnosePhoto.isPending,
    diagnoseError: diagnosePhoto.error
  };
}
