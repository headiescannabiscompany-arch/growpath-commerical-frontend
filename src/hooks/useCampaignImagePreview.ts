import { useState } from "react";

type Preview = { uri: string; attempt: number; status: "loading" | "loaded" | "failed" };

// Scope callbacks to one rendered image attempt, including A -> B -> A changes.
export function useCampaignImagePreview(uri: string) {
  const [preview, setPreview] = useState<Preview>({ uri, attempt: 0, status: "loading" });
  if (preview.uri !== uri) {
    setPreview({ uri, attempt: preview.attempt + 1, status: "loading" });
  }
  const attempt = preview.attempt;
  const settle = (status: Preview["status"]) => {
    setPreview((current) =>
      current.uri === uri && current.attempt === attempt
        ? { ...current, status }
        : current
    );
  };
  const status = preview.uri === uri ? preview.status : "loading";
  return {
    key: `${uri}:${attempt}`,
    status,
    onLoad: () => settle("loaded"),
    onError: () => settle("failed"),
    retry: () =>
      setPreview((current) => ({
        ...current,
        attempt: current.attempt + 1,
        status: "loading"
      }))
  };
}
