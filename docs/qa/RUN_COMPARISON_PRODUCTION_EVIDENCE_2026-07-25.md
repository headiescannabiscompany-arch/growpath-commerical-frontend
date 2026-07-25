# Run-To-Run Comparison Production Evidence - 2026-07-25

## Scope and status

This record covers a non-destructive production retest of the authenticated
Run-To-Run Comparison workspace, its workspace boundary, zero-history behavior,
responsive layout, control naming, and console state. It does not claim a completed
saved-history comparison because the authenticated Personal account had no saved
grows.

- Production site: `https://growpathai.com`
- Retest URL:
  `https://growpathai.com/home/personal/tools/run-comparison?release=6daafbc&verify=production`
- Source revision used for the retest:
  `6daafbc01527d582941a5d0f985ea3f63d663bca`
- Timestamp: `2026-07-25T00:31:32-04:00`
- Session: authenticated multi-workspace account, switched from Commercial to
  Personal mode
- Production writes: none
- Screenshot/video artifact: none claimed

The Render dashboard was intentionally not accessed in this pass, so this record
does not claim a new deployment ID or independently map the live page to a Render
deployment record.

## Production results

The direct Personal route first returned the correct `Access denied` boundary while
the session was acting in Commercial mode. The canonical workspace chooser then
offered Personal, Commercial, and Facility choices, and `Continue as Personal`
returned the session to `/home/personal`.

After switching modes, the production comparison workspace loaded successfully and
showed:

- one level-one `Run-To-Run Comparison` heading;
- the evidence-only explanation and explicit no-AI-credit disclosure;
- five named comparison-scope radio choices;
- six named decision-objective radio choices;
- named optional title and owner-context fields;
- the truthful `No saved grows are available yet` empty state; and
- a disabled `Compare 0 saved grows` action.

The empty state did not invent demo rows, enable a meaningless comparison, or create
production data.

## Responsive and accessibility checks

At `1280 x 720`:

- the document width matched the viewport width (`1280 / 1280`);
- the page exposed zero unnamed buttons, links, inputs, selects, or text areas;
- the compare action remained disabled; and
- the browser console contained zero errors or warnings.

At the narrow `391 x 844` viewport:

- document width again matched viewport width (`391 / 391`);
- no element crossed the horizontal viewport boundary;
- zero actionable controls were unnamed;
- all scope and objective choices remained present; and
- the browser console again contained zero errors or warnings.

## Remaining acceptance

A production account with at least two genuine owned saved grows is still required
to complete the main workflow. The final pass must:

1. select two to five real saved grows and mark an explicit reference;
2. exercise at least one equivalent scope and decision objective;
3. verify that only matching recorded units or scales are compared;
4. verify that missing evidence remains unknown and no causal winner is invented;
5. save and reopen the exact comparison ToolRun and grow-log result;
6. create and reopen a source-linked next-run task with Schedule metadata;
7. hard reload the saved result and downstream records; and
8. record the deployed commit, production URL, timestamp, account, evidence type,
   and genuine final-SHA screenshot/video.
