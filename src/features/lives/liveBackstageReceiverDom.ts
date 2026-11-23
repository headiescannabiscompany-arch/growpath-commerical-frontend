import type { ReceiverPurpose, ReceiverSink, ReceiverTrack } from "./liveBackstageReceiver";

// Owns only this dedicated host preview OR program surface. No URL sources,
// iframe, global query, captureStream, AudioContext or host camera/mic access.
export function createBackstageReceiverDom({ container, purpose, createMediaStream, audioOnly = false }: {
  container: HTMLElement; purpose: ReceiverPurpose; createMediaStream: (tracks: MediaStreamTrack[]) => MediaStream; audioOnly?: boolean;
}): ReceiverSink {
  if (!["preview", "program"].includes(purpose) || container.childNodes.length || audioOnly && purpose !== "preview") throw new Error("An empty private receiver surface is required");
  const document = container.ownerDocument;
  let generation = 0;
  const videos = new Set<HTMLMediaElement>(), tracks = new Set<MediaStreamTrack>();
  container.setAttribute("data-backstage-destination", purpose);
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(auto-fit, minmax(min(100%, 240px), 1fr))";
  container.style.gap = "8px";
  function clear() {
    generation += 1;
    for (const video of videos) { video.muted = true; video.pause(); video.srcObject = null; }
    for (const track of tracks) track.enabled = false;
    videos.clear(); tracks.clear(); container.replaceChildren();
  }
  return {
    clear,
    async render(items) {
      clear(); const epoch = generation;
      if (audioOnly && (items.length > 1 || items.some(item => item.kind !== "audio"))) throw new Error("Only one private host audio track is allowed");
      const groups = new Map<string, ReceiverTrack[]>();
      for (const item of items) groups.set(item.participantId, [...(groups.get(item.participantId) || []), item]);
      try {
        for (const group of groups.values()) {
          const cell = document.createElement("section"), video = document.createElement(audioOnly ? "audio" : "video"), label = document.createElement("p");
          video.muted = true; video.controls = false;
          if (!audioOnly) {
            (video as HTMLVideoElement).playsInline = true;
            video.style.width = "100%"; video.style.aspectRatio = "16/9"; video.style.background = "#101713";
          }
          video.setAttribute("aria-label", `${purpose === "preview" ? "Private preview" : "Program"}: ${group[0].displayName}`);
          label.textContent = group[0].displayName; // Never interpret host-visible labels as HTML.
          video.srcObject = createMediaStream(group.map(item => item.track));
          videos.add(video); group.forEach(item => { tracks.add(item.track); item.track.enabled = true; });
          cell.append(video, label); container.append(cell);
        }
        await Promise.all([...videos].map(video => video.play()));
        // A late play reply cannot restore a cleared surface or unmute it.
        if (epoch !== generation) return;
      } catch {
        if (epoch === generation) clear();
        throw new Error("Playback could not start. Reconnect the private view.");
      }
    },
    setAudible(enabled) { for (const video of videos) video.muted = enabled !== true; }
  };
}
