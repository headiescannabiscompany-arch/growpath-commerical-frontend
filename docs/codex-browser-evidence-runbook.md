# Codex Browser and production evidence runbook

Use this runbook only when the user explicitly requests browser automation or visual evidence and the current chat has no available in-app Browser tool. Do not use it for ordinary code diagnosis, terminal issues, or non-visual verification. Report the limitation once; do not repeat recovery instructions in the same troubleshooting loop.

## Recovery after a verified Codex or Browser plugin update

1. Fully quit the Codex desktop app; closing or reopening ordinary Chrome is not enough.
2. Reopen Codex and confirm **Plugins > Browser** is installed and enabled.
3. Start a new Codex chat so the chat receives the current Browser tool registry.
4. Open the in-app Browser with `Ctrl+Shift+B` on Windows.
5. Navigate the in-app Browser to the production URL and confirm the tab is visible to the current chat before promising screenshots or video.
6. If the Browser is still unavailable, reinstall the Browser plugin, fully restart Codex, and start another new chat.

These are user-operated recovery steps, not prerequisites for repository work. Starting Expo is separate and is only appropriate when a local app runtime is actually required by the requested check.

The Codex in-app Browser and ordinary Chrome are separate surfaces. An open Chrome window does not establish a Browser bridge for the current Codex chat.

## Evidence contract

For every production verification, record:

- the exact commit SHA;
- the production URL;
- the date and time with timezone;
- the account and role used, without recording secrets;
- each behavior checked and its observed result;
- the evidence kind: automated test, live URL response, deployment check, screenshot, or video.

Screenshots and video must show the live production URL and the changed behavior. Do not describe tests, bundle-string checks, or deployment status as visual evidence. Do not reuse an artifact from another commit or account.

If visual capture is unavailable, say so plainly, preserve the non-visual evidence that was actually collected, and leave visual verification pending. Never fabricate an artifact or claim that ordinary Chrome was controlled when only the in-app Browser is supported.

## Security claims

Do not infer hacking from a plugin update, a disconnected Browser, or an unexplained UI change. Preserve relevant logs and timestamps, distinguish observed facts from hypotheses, and report access limitations. Never claim that Git hooks, MongoDB, or another service captured photos unless both the implementation and resulting artifact were directly verified. External reports require credible evidence and user review before they are sent.
