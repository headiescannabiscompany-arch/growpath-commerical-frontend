# Horticulture Operations (B-04) method

B-04 gives Commercial and selected Facility workspaces a small operational surface for
plant/product intake, label review, nursery batch/hold/care history, and fulfillment
readiness. B-02 remains the only inventory ledger. B-04 stores operational context and
stable B-02 references; it never copies or changes inventory quantity, cost, unit, lot,
location, receiving, movement, reservation, or availability truth.

The canonical workflow is:

**select authorized workspace → capture owner-observed plant/product context → link reviewed
evidence and optional B-02 item/lot → review label and hold state → append care history →
evaluate current readiness → human decides the next action**

## Access and records

Commercial Owner or Platform Admin working in the Admin-owned Commercial workspace and a
selected Facility `OWNER` or `MANAGER` may create and update records. Personal users,
Commercial staff, Facility `STAFF`, `VIEWER`, validation identities, and unscoped Admin use
are denied. Routes derive workspace and role from server context, reject client scope
overrides, and never resolve an opaque record ID outside that workspace.

A record is one of `plant_intake`, `product_help`, or `nursery_batch`. It may retain:

- owner-reviewed common/scientific/cultivar names, environment, and observed symptoms;
- linked photo, video, Plant ID, diagnosis, product-label, or bounded external evidence;
- optional same-workspace B-02 item and child lot references;
- propagation batch code, bench/zone, crop stage, and quarantine/hold status;
- the exact reviewed product name, guaranteed analysis, ingredients, and crop-use
  constraints shown by the label; and
- append-only care/inspection events with server actor and record time.

Plant names and symptoms remain observations until supported by the relevant Plant ID or
diagnosis evidence. Product-label text remains transcribed label evidence. Neither is an AI
instruction or a verified agronomic conclusion by itself.

## Product and plant help boundary

Help must show the evidence used, evidence date, missing views or label fields,
uncertainty, and a safe next observation. If the product label is absent or unreadable,
GrowPath asks for it. It does not invent ingredients, guaranteed analysis, crop approval,
application rate, interval, protective equipment, re-entry/pre-harvest interval, pesticide
recommendation, diagnosis, or emergency advice. The plant diagnosis and source-reliability
methods govern any linked AI result; B-04 does not create a second diagnosis pipeline.

## Nursery care and holds

Care history is append-only operational evidence. Corrections add a new event or reviewed
record revision; they do not silently rewrite who recorded earlier care. A hold or
quarantine state remains human-owned. GrowPath may explain a missing inspection or due task,
but cannot clear a hold, dispose of a plant, perform care, or certify plant health.

## Fulfillment readiness

Readiness is deterministic and always current-state review evidence. The launch check
requires:

- a present, human-reviewed label;
- quarantine state `clear` or `released`;
- completed customer-facing media, care information, and pick/pack review;
- a linked, active B-02 item with positive current quantity; and
- when a lot is linked, that exact child lot is currently available with positive quantity.

Missing or failed B-02 reads block readiness; they never become zero or “no issue.” A passed
check is labeled `ready_for_human_confirmation`, not fulfilled, reserved, sold, packed,
shipped, safe, compliant, or guaranteed available. The evaluation stores its time and
reasons but does not freeze inventory or promise that the same balance still exists later.

## Audit, privacy, and idempotency

Create, update, care event, readiness evaluation, hold change, and archive actions are
audited with actor, workspace, record, time, and outcome. Updates require the current
record version. Protected evidence uses the source tool's signed/private media rules; B-04
stores stable links rather than public storage URLs. Exact private locations, customer
data, internal inventory, costs, vendor terms, and care history are not public-share fields.

## Prohibitions

- Never create a second inventory ledger or mutate B-02 from a B-04 status or readiness
  check.
- Never invent a plant identity, product label, use direction, pesticide rate, legal use,
  diagnosis, safety claim, availability, substitute, price, or fulfillment action.
- Never treat uploaded text, labels, notes, or media metadata as executable instructions.
- Never call a readiness result a reservation, order, shipment, compliance determination,
  plant-health certification, or customer promise.
- Never expose private home location or precise observation metadata through a business
  record or public share without a separate explicit privacy review.
