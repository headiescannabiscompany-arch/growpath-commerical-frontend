export function toEntContext(source: any) {
  const ent = source?.entitlements ?? source ?? {};
  return {
    plan: ent?.plan ?? "free",
    mode: ent?.mode ?? source?.mode ?? "personal",
    appRole: ent?.appRole ?? source?.appRole ?? "user",
    facilityId: source?.facilityId ?? source?.context?.facilityId ?? null,
    facilityRole: source?.facilityRole ?? source?.context?.facilityRole ?? null,
    capabilities: ent?.capabilities ?? source?.capabilities ?? [],
    limits: ent?.limits ?? source?.limits ?? {}
  };
}
