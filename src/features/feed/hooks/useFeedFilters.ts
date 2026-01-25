// src/features/feed/hooks/useFeedFilters.ts
import { useState } from "react";

export function useFeedFilters() {
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");

  return {
    type,
    setType,
    status,
    setStatus
  };
}
