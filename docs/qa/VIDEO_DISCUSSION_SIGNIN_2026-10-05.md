# A05-07 — closed/live video Discussion sign-in

Runtime release `261d452d60426da837881fb35891f37b608ae528`.
Staging `dep-db1jr860tbcc73b69cjg` live 2026-10-05T06:05:01.997195Z.
Production `dep-db1jtps9v7es73fu4bu0` live 2026-10-05T06:10:41.67149Z.

Previously, signed-out Discussion offered inert sign-in text and login rejected
video destinations. A named link now retains only exact `/videos/<24 lowercase
hex>` through deliberate successful login. Failed login stays on Login. No
signup continuation expansion, posting, following, reporting or access unlock.
Existing server access, cannabis visibility and publication rules still apply.

Verification: 250 focused tests (video, return parser, login, Updates), TypeScript,
focused lint/format/diff, contamination guard and delta-interface guard against
65f01127 pass. Production-format export completes. Local signed-out browser using
explicit synthetic metadata clicks through to the exact encoded login destination;
interception cleared. Existing production owner and nonowner discovery/creator
return/report cancellation were checked without report, comment or social posting.
Canonical live video and all share/Owner controls load after deployment. Grouped
App review release note visible on production Updates. Active sessions preserved.

18 static marketing tests pass. Separate test-only commit387c562f fixes isolated
export fixtures missing the two already-shipped demo JSON files; all19 export
tests pass afterward. Windows sandbox initially blocked git/Node subprocesses;
successful reruns used the permitted host. No runtime redeploy for fixture fix.

Boundaries: successful login is component-tested, not a repeated hosted password
exercise. Local screenshot is synthetic, not hosted acceptance. An unused
onrender.com alias failed anonymous API reads; no CORS/security changes made.
No claim of new player playback, phone acceptance or whole-A05/R08 completion.
Keep A05-01–07 closed; device/composer and A09 final walkthrough are separate.

Workspace proof: outputs/Video_Signin_Local_2026-10-05.png and
outputs/Video_Signin_Production_2026-10-05.png. Master TODO, acceptance matrix,
execution pointer and grouped public Updates reconciled.
