# Multimodal Evidence Contract

`MediaEvidencePicker` is the shared capture surface for workflow evidence. New
diagnostic workflows must use it instead of maintaining screen-specific URI and
upload state.

## Lifecycle

1. The picker creates a local `EvidenceAsset` with `uploadStatus: local`.
2. The file is uploaded through the authenticated, quota-aware upload API.
3. A durable `/uploads/...` URL is persisted through `/api/evidence-assets`.
4. Only `uploaded` assets with durable URLs enter provider payloads.
5. The consuming workflow stores `evidenceAssetIds` and durable media URLs.
6. After the workflow saves, evidence records are linked to its diagnosis,
   ToolRun, log, or other owning record.

Failed and local-only media must remain visible to the user but must never be
described as analyzed evidence.

## Current canonical consumer

Plant Diagnosis accepts up to ten durable photos plus one optional short video.
Photo evidence is sent to the image-capable provider. Video is persisted and
linked to the diagnosis for review, but is not yet described as provider-analyzed
until a supported video/frame-analysis adapter is implemented.

## Migration rules

- Ask AI, IPM, Clone Rooting, Harvest Readiness, Species/Crop ID, Pheno, Stress,
  Tissue Culture, Courses, Forum, and Products should reuse this contract.
- Do not send `file:`, `blob:`, or other transient URIs to backend AI providers.
- Do not accept evidence record IDs without checking ownership.
- Keep provider labels explicit when media was stored but not analyzed.
- Use `providerEvidencePayload` to group uploaded images, videos, and evidence IDs.
