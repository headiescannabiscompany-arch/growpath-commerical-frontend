import { Platform, Share } from "react-native";

import { timelineEventPhotos } from "@/features/grows/timeline";
import { API_URL, apiRequest } from "@/api/apiRequest";
import { readAnonymousImageBlob } from "@/api/uriToBlob";
import { resolveImageUri } from "@/utils/photoUploads";
import { prepareEvidenceImageForUpload } from "@/utils/evidenceImageUpload";

type VisualTimelineEvent = {
  timestamp: string;
  title: string;
  summary?: string;
};

const PHOTO_INPUT_LIMIT = 20 * 1024 * 1024;
const PHOTO_EXPORT_LIMIT = 64 * 1024 * 1024;
const PHOTO_ERROR =
  "A timeline photo could not be prepared. No file was saved. Reopen the timeline to check its photos, then try again.";

function isApiMediaPath(path: string) {
  return /^\/(?:uploads\/|api\/(?:videos|evidence-assets)\/uploads\/)/i.test(path);
}

function photoSource(value: string) {
  const source = new URL(resolveImageUri(value));
  if (source.username || source.password) throw new Error(PHOTO_ERROR);
  const apiOrigin = new URL(API_URL).origin;
  const authenticated = source.origin === apiOrigin;
  if (authenticated) {
    if (!isApiMediaPath(source.pathname)) throw new Error(PHOTO_ERROR);
  } else if (
    source.protocol !== "https:" &&
    !/^data:image\/(?:jpeg|png|webp);base64,/i.test(source.href) &&
    !(source.protocol === "blob:" && source.origin === window.location.origin)
  ) {
    throw new Error(PHOTO_ERROR);
  }
  source.hash = "";
  return { url: source.href, authenticated };
}

async function embeddedPhoto(source: ReturnType<typeof photoSource>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    let blob: Blob;
    if (source.authenticated) {
      // Never send the app token to an arbitrary photo host or follow redirects.
      blob = await apiRequest<Blob>(source.url, {
        auth: true,
        responseType: "blob",
        redirect: "error",
        cache: "no-store",
        signal: controller.signal,
        timeoutMs: 20000
      });
    } else {
      blob = await readAnonymousImageBlob(source.url, controller.signal);
    }
    if (
      !(blob instanceof Blob) ||
      blob.size <= 0 ||
      blob.size > PHOTO_INPUT_LIMIT ||
      !/^image\/(?:jpeg|png|webp)$/i.test(blob.type)
    )
      throw new Error(PHOTO_ERROR);

    // Reuse the existing local pixel-only preparation; no upload or source edit.
    const prepared = await prepareEvidenceImageForUpload(blob, "timeline-photo.jpg", {
      forceStripMetadata: true,
      signal: controller.signal
    });
    if (
      controller.signal.aborted ||
      !prepared.blob.size ||
      prepared.blob.size > PHOTO_INPUT_LIMIT ||
      prepared.blob.type !== "image/jpeg"
    )
      throw new Error(PHOTO_ERROR);
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const fail = () => reject(new Error(PHOTO_ERROR));
      const abort = () => {
        reader.abort();
        fail();
      };
      reader.onloadend = () => controller.signal.removeEventListener("abort", abort);
      reader.onerror = fail;
      reader.onabort = fail;
      reader.onload = () => {
        const result = String(reader.result || "");
        if (
          controller.signal.aborted ||
          !/^data:image\/jpeg;base64,[a-z0-9+/]+={0,2}$/i.test(result)
        )
          fail();
        else resolve(result);
      };
      controller.signal.addEventListener("abort", abort, { once: true });
      reader.readAsDataURL(prepared.blob);
    });
  } catch {
    // Do not reflect storage paths, signed queries or provider responses to the UI.
    throw new Error(PHOTO_ERROR);
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value: unknown) {
  return String(value || "").replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character
  );
}

export function timelineSummaryForExport(value: unknown) {
  const summary = String(value || "").trim();
  if (!summary) return "";
  let absolutePhotoSummary = false;
  if (/^https?:\/\/\S+$/i.test(summary)) {
    try {
      const path = new URL(summary).pathname;
      absolutePhotoSummary = isApiMediaPath(path) || /\.(?:jpe?g|png|webp)$/i.test(path);
    } catch {
      // Not a URL; preserve ordinary prose through the existing bounded formatter.
    }
  }
  if (
    /^(?:\/?uploads\/|\/api\/(?:videos|evidence-assets)\/uploads\/|data:image\/|blob:)\S+$/i.test(
      summary
    ) ||
    absolutePhotoSummary
  )
    return "Photo saved with this timeline entry.";

  const jsonStarts = [summary.indexOf("{"), summary.indexOf("[")].filter(
    (index) => index >= 0
  );
  const jsonStart = jsonStarts.length ? Math.min(...jsonStarts) : -1;
  if (jsonStart >= 0) {
    try {
      JSON.parse(summary.slice(jsonStart));
      const label = summary
        .slice(0, jsonStart)
        .trim()
        .replace(/[\s:.-]+$/, "");
      return label
        ? `${label}. Detailed evidence remains in the private GrowPath record.`
        : "Detailed evidence remains in the private GrowPath record.";
    } catch {
      // Ordinary prose can contain brackets. Preserve it unless it is also oversized.
    }
  }

  if (summary.length <= 700) return summary;
  return `${summary.slice(0, 697).trimEnd()}… Full details remain in the private GrowPath record.`;
}

export async function exportVisualTimeline(title: string, events: VisualTimelineEvent[]) {
  const plainText = [
    title,
    "",
    ...events.map(
      (event) =>
        `${new Date(event.timestamp).toLocaleDateString()} — ${event.title}${timelineSummaryForExport(event.summary) ? `\n${timelineSummaryForExport(event.summary)}` : ""}`
    )
  ].join("\n\n");
  if (Platform.OS !== "web" || typeof document === "undefined") {
    await Share.share({ title, message: plainText });
    return "native-share" as const;
  }
  const preparedPhotos = new Map<string, string>();
  const eventPhotos: string[][] = [];
  let photoBytes = 0;
  for (const event of events) {
    const photos: string[] = [];
    for (const photo of timelineEventPhotos(event as any)) {
      let source: ReturnType<typeof photoSource>;
      try {
        source = photoSource(photo);
      } catch {
        throw new Error(PHOTO_ERROR);
      }
      let embedded = preparedPhotos.get(source.url);
      if (!embedded) {
        embedded = await embeddedPhoto(source);
        preparedPhotos.set(source.url, embedded);
      }
      photoBytes += embedded.length;
      if (photoBytes > PHOTO_EXPORT_LIMIT)
        throw new Error(
          "This timeline's photos exceed the file-size limit. No file was saved."
        );
      photos.push(embedded);
    }
    eventPhotos.push(photos);
  }
  const eventHtml = events
    .map((event, index) => {
      const photos = eventPhotos[index]
        .map(
          (photo) =>
            `<img src="${escapeHtml(photo)}" alt="Timeline evidence for ${escapeHtml(event.title)}" />`
        )
        .join("");
      const summary = timelineSummaryForExport(event.summary);
      return `<article><time>${escapeHtml(new Date(event.timestamp).toLocaleString())}</time><h2>${escapeHtml(event.title)}</h2>${summary ? `<p>${escapeHtml(summary)}</p>` : ""}<div class="photos">${photos}</div></article>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:auto;padding:32px;color:#17231b}header,article{border:1px solid #ccd8cf;border-radius:14px;padding:18px;margin:0 0 18px}time{color:#607064;font-size:14px}h1,h2{margin:6px 0}.photos{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.photos img{width:220px;max-height:180px;object-fit:cover;border-radius:10px}@media print{body{padding:0}article{break-inside:avoid}}</style></head><body><header><h1>${escapeHtml(title)}</h1><p>Viewer-friendly saved grow history. This is not a compliance report.</p></header>${eventHtml}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${
    title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "grow"
  }.html`;
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return "web-download" as const;
}
