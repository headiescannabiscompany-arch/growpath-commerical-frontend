import { Platform, Share } from "react-native";

import type { BusinessDeskTransientArtifact } from "@/api/businessDeskArtifacts";
import { exportCsvContent, type CsvExportResult } from "@/utils/exportToCsv";

export type ReviewedArtifactDeviceOutcome =
  | { method: "clipboard" }
  | { method: "native-share"; action: "shared" | "dismissed" | "unknown" }
  | { method: CsvExportResult["method"] };

type ReviewedArtifactHandoffDependencies = {
  platformOS?: string;
  clipboard?: { writeText: (content: string) => Promise<void> } | null;
  share?: Pick<typeof Share, "share">;
  exportCsv?: typeof exportCsvContent;
};

function webClipboard() {
  return typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function"
    ? navigator.clipboard
    : null;
}

/**
 * Hands the server-projected transient bytes directly to the selected device surface.
 * In particular, CSV content is not parsed or rebuilt on the client; formula-safe quoting
 * from the reviewed server projection remains byte-for-byte unchanged.
 */
export async function handoffReviewedBusinessDeskArtifact(
  artifact: BusinessDeskTransientArtifact,
  dependencies: ReviewedArtifactHandoffDependencies = {}
): Promise<ReviewedArtifactDeviceOutcome> {
  if (!artifact.content) throw new Error("The prepared artifact was empty.");
  if (artifact.mode === "csv") {
    const result = await (dependencies.exportCsv || exportCsvContent)(
      artifact.filename,
      artifact.content
    );
    if (!result.ok || result.method === "empty") {
      throw new Error("The prepared CSV was empty and no local export was started.");
    }
    return { method: result.method };
  }

  const platformOS = dependencies.platformOS ?? Platform.OS;
  const clipboard = dependencies.clipboard ?? webClipboard();
  if (platformOS === "web" && clipboard) {
    await clipboard.writeText(artifact.content);
    return { method: "clipboard" };
  }

  const share = dependencies.share || Share;
  const result = await share.share({
    title: artifact.filename,
    message: artifact.content
  });
  return {
    method: "native-share",
    action:
      result.action === Share.dismissedAction
        ? "dismissed"
        : result.action === Share.sharedAction
          ? "shared"
          : "unknown"
  };
}

export function reviewedArtifactOutcomeMessage(
  revisionCount: number,
  idempotentReplay: boolean,
  outcome: ReviewedArtifactDeviceOutcome
) {
  const revisionLabel = `${revisionCount} exact saved revision${
    revisionCount === 1 ? "" : "s"
  }`;
  const prefix = `${
    idempotentReplay ? "Recovered the same audited preparation" : "An audited preparation"
  } for ${revisionLabel}.`;
  switch (outcome.method) {
    case "clipboard":
      return `${prefix} The reviewed text was written to this device's clipboard. GrowPathAI did not observe where it was pasted, whether it was shared or delivered, or whether anyone accepted it.`;
    case "native-share":
      if (outcome.action === "dismissed") {
        return `${prefix} The system share flow was dismissed. GrowPathAI did not observe a completed share, delivery, or acceptance.`;
      }
      if (outcome.action === "shared") {
        return `${prefix} The device reported a completed local share action. GrowPathAI did not observe recipient delivery or acceptance.`;
      }
      return `${prefix} The system share flow closed. GrowPathAI did not observe whether the artifact was shared, delivered, or accepted.`;
    case "web-download":
      return `${prefix} A local file download was started. GrowPathAI did not observe whether the file was saved, opened, shared, or delivered.`;
    case "native-share-file":
    case "native-share-text":
      return `${prefix} The system export/share flow closed. GrowPathAI did not observe whether the file was saved, shared, or delivered.`;
    case "empty":
      return `${prefix} No local artifact was produced. GrowPathAI did not observe delivery or acceptance.`;
  }
}
