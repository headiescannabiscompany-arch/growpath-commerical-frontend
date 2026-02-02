# Phase 1 QA: First Setup (Rooms)

## QA R1 — Happy path

- Create facility
- Add 3 rooms
- Create rooms
- ✅ RoomsList shows all 3
- ✅ Onboarding advances to Start Grow

## QA R2 — Validation

- Delete all room names / leave blank
- ✅ “Room name required” inline error
- ✅ CTA disabled until fixed

## QA R3 — Failure handling

- Simulate a 500/timeout for one room
- ✅ Shows “Room X failed”
- ✅ Retry works
- ✅ Successful rooms aren’t duplicated

## QA R4 — Facility switching

- Switch facility mid-setup
- ✅ Setup resets cleanly
- ✅ No rooms created in wrong facility
