import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";

import type { AiInspectionView } from "@/types/evidence";

declare const require: ((id: string) => any) | undefined;

function safeName(value: string) {
  return value
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeHtml(value: unknown) {
  return String(value || "").replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character
  );
}

function base64FromDataUrl(dataUrl: string) {
  return String(dataUrl || "").split(",", 2)[1] || "";
}

export async function saveAiInspectionImage(view: AiInspectionView) {
  if (!view.dataUrl) throw new Error("Open this inspection view before saving it.");
  const filename = `ai-inspection-${view.sha256.slice(0, 12)}.jpg`;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const anchor = document.createElement("a");
    anchor.href = view.dataUrl;
    anchor.download = filename;
    document.body?.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return "web-download" as const;
  }
  const fileSystem = typeof require === "function" ? require("expo-file-system") : null;
  if (
    fileSystem?.cacheDirectory &&
    fileSystem?.writeAsStringAsync &&
    (await Sharing.isAvailableAsync())
  ) {
    const uri = `${fileSystem.cacheDirectory}${filename}`;
    await fileSystem.writeAsStringAsync(uri, base64FromDataUrl(view.dataUrl), {
      encoding: fileSystem.EncodingType?.Base64
    });
    await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: filename });
    return "native-share-file" as const;
  }
  await Share.share({ title: filename, message: view.dataUrl });
  return "native-share-data" as const;
}

export async function exportAiInspectionEvidence(
  title: string,
  views: AiInspectionView[],
  provenance: {
    analysisId?: string;
    reviewPolicyVersion?: string;
    providerModel?: string;
    imageDetail?: string;
  } = {}
) {
  if (!views.length || views.some((view) => !view.dataUrl)) {
    throw new Error("Load every inspection view before exporting the evidence package.");
  }
  const rows = views
    .map((view, index) => {
      const bounds = view.sourceBounds
        ? `x=${view.sourceBounds.left}-${view.sourceBounds.left + view.sourceBounds.width} of ${view.sourceBounds.sourceWidth}; y=${view.sourceBounds.top}-${view.sourceBounds.top + view.sourceBounds.height} of ${view.sourceBounds.sourceHeight}`
        : "attention-selected view; source rectangle is not available";
      return `<article><h2>View ${index + 1}: ${escapeHtml(view.kind)}</h2><img src="${view.dataUrl}" alt="AI inspection view ${index + 1} from source photo ${view.sourceImageIndex}"><dl><dt>Source photo</dt><dd>${view.sourceImageIndex}</dd><dt>Source evidence ID</dt><dd>${escapeHtml(view.sourceEvidenceAssetId)}</dd><dt>Crop strategy</dt><dd>${escapeHtml(view.cropStrategy)}</dd><dt>Source bounds</dt><dd>${escapeHtml(bounds)}</dd><dt>Output</dt><dd>${view.width} x ${view.height} JPEG</dd><dt>SHA-256</dt><dd>${escapeHtml(view.sha256)}</dd></dl></article>`;
    })
    .join("");
  const provenanceRows = [
    ["Analysis ID", provenance.analysisId],
    ["Review policy", provenance.reviewPolicyVersion],
    ["Provider model", provenance.providerModel],
    ["Image detail", provenance.imageDetail]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:980px;margin:auto;padding:28px;color:#17231b}header,article{border:1px solid #ccd8cf;border-radius:14px;padding:18px;margin-bottom:18px}img{display:block;max-width:100%;max-height:720px;object-fit:contain;border-radius:10px;background:#111}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px}dt{font-weight:700}dd{margin:0;overflow-wrap:anywhere}.notice{background:#eef7f0}</style></head><body><header><h1>${escapeHtml(title)}</h1><p class="notice">These are the exact source-bound enlarged views used as supplemental AI inspection evidence. They expose existing pixels from retained originals and are not additional photos, sites, samples, or independent observations.</p>${provenanceRows ? `<dl>${provenanceRows}</dl>` : ""}</header>${rows}</body></html>`;
  const filename = `${safeName(title) || "ai-inspection-evidence"}.html`;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body?.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return "web-download" as const;
  }
  const fileSystem = typeof require === "function" ? require("expo-file-system") : null;
  if (
    fileSystem?.cacheDirectory &&
    fileSystem?.writeAsStringAsync &&
    (await Sharing.isAvailableAsync())
  ) {
    const uri = `${fileSystem.cacheDirectory}${filename}`;
    await fileSystem.writeAsStringAsync(uri, html, {
      encoding: fileSystem.EncodingType?.UTF8
    });
    await Sharing.shareAsync(uri, { mimeType: "text/html", dialogTitle: title });
    return "native-share-file" as const;
  }
  await Share.share({ title, message: html });
  return "native-share-text" as const;
}
