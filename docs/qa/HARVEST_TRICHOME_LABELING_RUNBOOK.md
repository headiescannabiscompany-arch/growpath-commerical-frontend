# Harvest trichome labeling runbook

This is a local/staging QA workflow. It does not add a public production route and it does not make a model-training or accuracy claim.

1. Admit only GrowPath-owned, owner-permitted, CC BY 4.0, CC0, or US public-domain media after image-level rights review. Keep exact attribution and never export expiring signed production URLs.
2. Create a Label Studio image bounding-box project with `tests/fixtures/label-studio-harvest-trichome-config.xml`.
3. Assign every image to two independent reviewers. Reviewers box only resolved intact gland heads in identified calyx areas and must not see a model's answer, a target percentage, or expected harvest timing.
4. Adjudicate disagreements and mark exactly one annotation as ground truth, or record its annotation ID in the separate metadata manifest.
5. Export raw Label Studio JSON. Copy `tests/fixtures/harvest-trichome-label-metadata-template.json` to a private working location and add rights, capture session, phone model, lighting, private asset locator, and adjudication metadata for each task. Do not put private production media or user data into the repository.
6. Import with:

   `node scripts/import-label-studio-trichome-annotations.cjs --export <label-studio.json> --metadata <rights-and-capture.json> --out <reviewed-labels.json>`

7. The import remains `evaluationReady: false`. Complete the catalog eligibility floor and final independent review. The finalizer independently enforces the canonical floors and requires the exact staging confirmation:

   `node scripts/finalize-harvest-trichome-annotations.cjs --input <reviewed-labels.json> --out <staging-labels.json> --reviewed-by <reviewer-id> --reviewed-at <YYYY-MM-DD> --confirmation RUN_GROWPATH_HARVEST_TRICHOME_STAGING`

   Do not lower the eligibility policy in a working manifest. The finalizer rejects policy values below the canonical floors.
8. Score the deployed baseline and candidate on the same blinded set with `scripts/evaluate-harvest-trichome-counter.cjs`. Reject a candidate if amber improves by hiding detector, false-amber, resolved-class, or possible-amber regressions.

Label Studio stores image bounding boxes as percentages of the image dimensions. GrowPath converts those values to normalized 0-1 coordinates and rejects rotated boxes so the evaluator's IoU calculation remains unambiguous. See the official [Label Studio object-detection template](https://labelstud.io/templates/image_bbox.html) and [export documentation](https://labelstud.io/guide/export.html).
