export function withFreshnessParam(
  params: Record<string, string> = {}
): Record<string, string> {
  return {
    ...params,
    _fresh: String(Date.now())
  };
}
