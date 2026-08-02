# GrowPathAI shared visual system

This is the canonical implementation and acceptance method for Personal,
Commercial, and Facility UI work. A workspace may have different content and
permissions, but it must not invent a separate shell, navigation treatment, or
theme palette.

## Shared shell

- Use `AppPage` for ordinary workspace pages and `ScreenBoundary` for guarded or
  specialized screens.
- Use the shared theme palette and radius tokens. Do not add fixed light or dark
  colors to a workspace page when a palette token exists.
- Keep the title, short purpose copy, primary action, status/error state, and
  page content in that order. Empty states must explain what the user can do
  next; they must not be blank dashboards.
- Every non-landing screen has a visible shared Back control with an explicit
  workspace-safe fallback route. Do not add a second page-local Back control.

## Day, Night, and Auto

- Day uses the shared light green-neutral palette.
- Night uses the shared blue-gray palette with light text, distinct page/card
  surfaces, and blue interactive controls. It must not become pure-black text
  on dark surfaces or a collection of unrelated fixed green cards.
- Auto is the default. It follows a saved sunrise/sunset location when the user
  has enabled location-based appearance; otherwise it follows device appearance.
  Location permission is requested once, the choice is persisted, and a manual
  retry remains available in Profile.
- The appearance selector belongs in Profile. Do not repeat it on Dashboard or
  inside individual tools.

## Bottom navigation

- Render exactly six text-labeled primary items at narrow widths. Labels must be
  readable words, evenly distributed, and contained within the safe-area bar.
- Personal: Home, Grows, Forum, Discover, More, Profile.
- Commercial: Dashboard, Storefront, Feed, Forum, More, Profile.
- Facility: Dashboard, Grows, Tasks, Compliance, More, Profile.
- Secondary and detail routes stay reachable from their owning page or More and
  use Expo Router `href: null`. Never hide a route with an invisible
  `tabBarButton`; invisible buttons still reserve blank or symbol-only slots on
  web builds.
- Product management belongs under Storefront. Notifications belong in Profile
  and the shared Notification Center, not in Forum. Facility Logs/Journal belongs
  in its owning workflow, not as an extra primary tab.

## Workspace hierarchy

- Personal is the daily grow workspace.
- Commercial contains the shared user capabilities plus brand, storefront,
  campaign, product, order, analytics, and production workflows. A compact tab
  bar may route the rest through More; this does not remove the capabilities.
- Facility contains the shared user capabilities plus facility-owned rooms,
  grows, plants, tasks, SOPs, inventory, compliance, team, integrations, reports,
  and audit workflows. Credits and records must identify the Facility as owner
  when the Facility workspace is active.
- Cannabis-only tools and copy follow the cannabis visibility policy. Do not add
  them to a general hub merely to make two workspaces look symmetrical.

## Acceptance method

For each changed surface:

1. Run TypeScript, focused route/render tests, the visual-polish contract, and
   the broad regression gates.
2. Verify at 375/390px and desktop width that there is no clipped text,
   horizontal overflow, blank navigation slot, duplicate theme selector, or
   unreadable contrast.
3. Exercise every changed action through its actual route, including reload and
   empty/error states where applicable.
4. Deploy the exact tested commit and repeat the checks in the in-app Browser.
5. Record the commit SHA, production URL, timestamp, workspace/account role,
   viewport, checks, and screenshot/video or DOM evidence. Local render, CI,
   deployment status, and production behavior are separate evidence claims.

A source or unit-test pass is not sufficient to call a UI correction live.
