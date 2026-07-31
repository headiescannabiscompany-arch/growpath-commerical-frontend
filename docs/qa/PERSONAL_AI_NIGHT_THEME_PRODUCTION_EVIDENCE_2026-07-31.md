# Personal AI Night-Theme Production Evidence

Date: 2026-07-31

## Releases

- Shared media evidence picker commit: `fb7536e0`
- Personal diagnosis workspace commit: `b5866a1e`
- Production URL: `https://growpathai.com`
- Automatic deployment source: `main`
- Picker Frontend CI: `30668989205` (passed)
- Picker Production Build Preflight: `30668989447` (passed)
- Diagnosis Frontend CI: `30669474762` (passed)
- Diagnosis Production Build Preflight: `30669474799` (passed)

## Verified production routes

- `https://growpathai.com/home/personal/ai`
- `https://growpathai.com/home/personal/diagnose`

The existing signed-in Personal Pro account remained in Auto appearance resolved
to Night. Before the fixes, Personal AI rendered the shared media picker heading,
photo/video count, and privacy guidance as dark text on a dark panel. Personal
Diagnosis rendered its main workspace as a white canvas above a Night tab bar.

## Fixes

- `MediaEvidencePicker` now derives its container, border, headings, counts,
  guidance, preview, status, warning, error, remove action, and buttons from the
  active GrowPath palette.
- Because it is shared, the picker fix applies to Personal AI, diagnosis, harvest
  readiness, IPM, species/crop identification, tissue culture, stress testing,
  dry/cure guard, crop steering, clone rooting, ingredient evidence, and genetics
  evidence workflows.
- Personal Diagnosis now derives the page canvas, text, pills, inputs, status
  panels, provider panels, follow-up cards, warnings, and actions from the active
  palette.

## Live acceptance

- Personal AI showed a dark evidence card with bright `Photos and video evidence`
  text, readable `0/10 photos · 0/1 video` count, readable AI-use guidance, and
  blue Add Photos/Add Video actions.
- Personal Diagnosis showed a continuous dark page canvas instead of the former
  white workspace.
- The diagnosis route retained one level-one heading, all named form controls,
  the 12-photo/one-video limits, the complete photo checklist, provider status,
  and a disabled Run Diagnosis action until required evidence is supplied.
- No photo picker, upload, AI request, credit charge, diagnosis, log, task,
  feedback action, or account setting was created or changed.

## Automated verification

- `tests/unit/MediaEvidencePicker.test.tsx`
- `tests/unit/personal_ai_screen.test.tsx`
- `tests/unit/DiagnoseRouteScreen.test.tsx`

The picker/AI pass completed 14 focused tests. The diagnosis/picker pass
completed 18 focused tests. Targeted ESLint, full `tsc --noEmit`, and
`git diff --check` passed for both releases. The only focused-test console output
was the known Expo Go Android remote-notification warning; it did not fail or
alter the tested workflows.

## Remaining scope

This evidence covers desktop in-app Browser Night-mode rendering for the named
Personal AI routes. Day mode, physical devices, video capture, independent
accessibility review, real provider requests, failed-request refunds, and
independent diagnosis accuracy remain tracked separately.
