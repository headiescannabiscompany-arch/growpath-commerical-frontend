import { Platform, Share } from "react-native";

import { timelineEventPhotos } from "@/features/grows/timeline";

type VisualTimelineEvent = {
  timestamp: string;
  title: string;
  summary?: string;
  [key: string]: unknown;
};

function escapeHtml(value: unknown) {
  return String(value || "").replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character
  );
}

export async function exportVisualTimeline(title: string, events: VisualTimelineEvent[]) {
  const plainText = [
    title,
    "",
    ...events.map(
      (event) =>
        `${new Date(event.timestamp).toLocaleDateString()} — ${event.title}${event.summary ? `\n${event.summary}` : ""}`
    )
  ].join("\n\n");
  if (Platform.OS !== "web" || typeof document === "undefined") {
    await Share.share({ title, message: plainText });
    return "native-share" as const;
  }
  const eventHtml = events
    .map((event) => {
      const photos = timelineEventPhotos(event as any)
        .map(
          (photo) =>
            `<img src="${escapeHtml(photo)}" alt="Timeline evidence for ${escapeHtml(event.title)}" />`
        )
        .join("");
      return `<article><time>${escapeHtml(new Date(event.timestamp).toLocaleString())}</time><h2>${escapeHtml(event.title)}</h2>${event.summary ? `<p>${escapeHtml(event.summary)}</p>` : ""}<div class="photos">${photos}</div></article>`;
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
  anchor.click();
  URL.revokeObjectURL(url);
  return "web-download" as const;
}
