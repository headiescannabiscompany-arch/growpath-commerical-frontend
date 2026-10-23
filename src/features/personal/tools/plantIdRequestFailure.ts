/** Transport failures do not prove whether a server-side write or AI charge completed. */
export function plantIdRequestFailureMessage(
  error: { code?: string; message?: string } | null | undefined,
  phase: "analysis" | "photo-save" | "manual-save"
): string {
  if (!["NETWORK_ERROR", "OFFLINE", "TIMEOUT"].includes(String(error?.code || ""))) {
    return (
      error?.message ||
      "Plant ID could not finish. Your photos and entered details are still here."
    );
  }
  const reason =
    error?.code === "OFFLINE"
      ? "Your device appears to be offline."
      : error?.code === "TIMEOUT"
        ? "Plant ID did not receive a reply in time."
        : "Plant ID could not receive a reply from the server.";
  const retained =
    "Your selected photos and entered details are still here on this page. Check your connection and Saved Runs before trying again; the request may have completed.";
  if (phase === "photo-save") {
    return `${reason} The photo review returned, but saving it was not confirmed. ${retained} Do not repeat the AI analysis just to save it: open optional details and use Review entered details (no AI).`;
  }
  if (phase === "analysis") {
    return `${reason} ${retained} We cannot confirm whether the AI analysis completed or credits were used. Nothing will retry automatically.`;
  }
  return `${reason} ${retained} Reviewing entered details does not run AI. Nothing will retry automatically.`;
}
