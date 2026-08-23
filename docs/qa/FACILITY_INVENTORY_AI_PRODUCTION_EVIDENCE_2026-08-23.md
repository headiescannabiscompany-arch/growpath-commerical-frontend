# Facility Inventory AI production evidence — 2026-08-23

## Accepted assembly

- Frontend inventory-context merge: `ea1f914c68ea959a1a0ac4fc6c3d477ebc73e619`.
- Frontend record-label correction: `88699a8257f2b009e73e8d67f6c82aeec9d2d33a`.
- Backend authorized-inventory merge: `74630ebf1eb5b8d7fbddb095637cab928da83baa`.
- Backend canonical-alert assertion merge: `be00d33ff66fea5322fa6e7cac68fe21298d4753`.
- Final production URL:
  `https://growpathai.com/home/facility/ai-ask?preset=inventory&release=88699a82&backend=be00d33f&verify=facility-inventory-ai-final`.

The final frontend production bundle contained `Referenced records` and no longer contained
the obsolete `Referenced grow data` heading. The public API `/ready` endpoint returned 200
with its database connected before the final authenticated pass.

## CI and security evidence

- Backend PR 227 fast contract gate passed in Actions run `32650068045`.
- Backend PR 227 full lint, test and ZAP API security gate passed in Actions run
  `32650067997`; the full test step passed before the ZAP scan.
- Backend post-merge CI passed for both `74630ebf` and `be00d33f`.
- Frontend PR 763 passed lint, TypeScript, sensitive-copy, Browser-contract, delivery and
  batched-test gates in Actions run `32649672263`.
- Frontend PR 764 passed the same complete gate in Actions run `32650458713`.
- Frontend production preflight passed for `ea1f914c`; the final `88699a82` preflight also
  completed successfully before the production bundle switched.

The first backend PR gate exposed one assertion mismatch: canonical `lowStock` correctly
includes an item whose zero balance is at or below its recorded reorder point. The diagnostic
reported 899 passing tests and only that expectation failure. PR 227 aligned the assertion;
the unchanged runtime behavior then passed the full test and ZAP gate. This is retained as
failure-to-fix evidence rather than hidden as a passing first attempt.

## Authenticated live acceptance

The signed-in Triple Bag Genetics Facility-owner session loaded the Inventory Risk preset
with one authorized active B-02 item. Before Send, production visibly reported:

- `Inventory items: 1`;
- `Out of stock: 0`;
- `At or below reorder point: 0`;
- `Evidence alerts: 1`; and
- the explicit rule that counts with different stock units are never combined.

The inventory preset displayed no grow selector. One final accepted Send returned an
inventory-specific deterministic boundary:

- one authorized active inventory record was used;
- zero out-of-stock and zero recorded reorder-point risks were reported;
- one deterministic evidence-alert record was reported;
- supplier lead time, use rate, par level and unrecorded counts remained unknown;
- unlike stock-counting units were not combined;
- the only suggested action was to open Inventory for human review;
- `QA B02 OWNER 0823-863080` was referenced as an `inventory_item`; and
- no grow-summary fallback or stock mutation was proposed.

The final response card visibly used `Referenced records`; `Referenced grow data` was absent.
The provider presentation reported `Limited context answer`, so this acceptance closes the
authorized inventory-context and deterministic-safe-response slice. It does **not** claim the
separate real-provider enhancement gate for all B-03/B-04/B-05 AI tools.

## Privacy and authority boundary

The browser sends only a bounded display projection, while the backend discards any
client-supplied inventory projection and reloads records after Commercial/Facility workspace
authorization. Vendor, authorized unit cost and currency are excluded from provider context.
The response remains advisory and cannot receive, consume, move, hold, release, order or
otherwise mutate inventory.
