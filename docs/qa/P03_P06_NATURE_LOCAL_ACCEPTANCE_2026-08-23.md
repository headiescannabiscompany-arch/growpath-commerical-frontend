# P-03 through P-06 and Nature Local Acceptance — 2026-08-23

## Outcome

The existing Plant ID, optional Create Grow and optional Nature publication architecture is implemented and locally accepted. It was verified against the current candidate rather than reconstructed. Identify-only remains a complete private outcome: it saves the evidence-bound result without creating a Grow, Field Study or public pin. Create Grow and Nature are two separate reviewed branches with explicit save/publish actions.

## Focused current-candidate verification

Frontend:

- 9 suites and 160 assertions pass across Plant ID evidence/results, Saved Run recovery, correction, optional Grow draft/cancel/save, private publication draft, location/date/description/consent requirements, public APIs/cards, globe loading/zero state and web/native map behavior.

Backend:

- 4 suites and 40 assertions pass across result-integrity rules, private/public observation lifecycle, required evidence/date/location/description, projection precision, sensitive/cannabis rules, public media/card identity, search/bounds/pagination, ownership and withdrawal.

The accepted boundary does not infer location from another record or nearby date, never publishes a Grow save, keeps house/potted and legacy records private by default, and exposes only the reviewed public projection. The newest defensible confirmed identity is retained with common, scientific and alternate names only when supportable; uncertainty and rejected drafts remain visible.

## Remaining live actions — do not reconstruct

Use one fresh, non-sensitive public-park observation on the frozen candidate:

1. In a signed-in Personal workspace, capture or select an ordinary photo or short video with its real capture date and source location, or explicitly use device GPS/drop a pin if metadata is absent.
2. Analyze, inspect evidence/uncertainty/follow-up guidance, save the standalone result and reload it from Saved Runs without creating a Grow or public record.
3. Exercise Back plus one safe error/retry path.
4. Cancel a reviewed Create Grow draft and verify no record; optionally save one disposable draft only if cleanup is available.
5. Open the separate Nature draft, enter a useful description, select privacy precision, review the projected point and explicitly publish.
6. Reload the globe/list/card/photo; verify date, description and identity, search/filter it, and confirm the source coordinates and unrelated private house/potted/legacy records are absent.
7. Withdraw the observation, reload to prove absence, and retain the private Saved Run.

Maydale Conservation Park is an appropriate intended location if the owner captures a new observation there. Legacy Cary/Maydale recovery is optional and nonblocking; it must not be substituted for the clean future workflow.
