// A fixed source marker, never a caller-supplied redirect URL. Other entry paths
// retain ordinary history and their existing safe fallback.
export function personalMoreReturnHref(from?: string | string[]): string | undefined {
  return (Array.isArray(from) ? from[0] : from) === "personal-more"
    ? "/home/personal/more"
    : undefined;
}
