# Public / Signed-Out Production Loop Evidence

Date: 2026-07-24

## Release

- Production frontend commit:
  `111a0701d0f1b12645ac18da1350d3289e8618e7`
- Pull request:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/209`
- Render deployment:
  `dep-d9hvnnepbkes73ba5ohg`
- Production base URL:
  `https://growpathai.com`
- Merge timestamp:
  `2026-07-24T23:57:15Z`

## Session and evidence type

- The existing authenticated Commercial session for
  `jcindc2003@yahoo.com` was intentionally signed out through the visible
  Commercial Dashboard control.
- The in-app Browser then exercised public routes without an authenticated
  application session.
- The final responsive home-page review used a 320 by 700 CSS-pixel viewport.
- Evidence consisted of live production DOM inspection, direct public
  navigation, and a genuine in-app Browser viewport screenshot tied to the
  final deployed commit.
- No standalone screenshot or video file is claimed by this record.
- The same account was signed back in, Commercial was selected from the
  workspace chooser, and the Commercial Dashboard, account email, and Log out
  control were reverified before the session ended.

## Findings fixed

The initial signed-out mobile pass found:

1. The public header had no Store link, leaving the new storefront and
   dispensary search undiscoverable from the home page.
2. At 320 CSS pixels, the horizontal public navigation clipped Sign in.
3. Desktop hero padding and 42-pixel heading typography forced words in the
   primary headline to split into unreadable fragments.

Frontend pull request `#209` added Store to the public navigation, gave compact
screens a stacked and wrapping navigation layout, reduced compact hero padding
and type size, and stacked the two calls to action.

## Final production checks

### Public home

Final route:
`https://growpathai.com/?release=111a070&verify=signed-out-mobile-final`

At 320 by 700 CSS pixels:

- GrowPathAI, Features, Pricing, Store, Courses, Forum, and Sign in were all
  visible without horizontal clipping.
- The page exposed exactly one level-one heading:
  `One connected path from grow setup to harvest`.
- The heading wrapped by phrase without splitting words.
- Create free account and Explore features were fully visible, full-width
  actions.
- The docked Report Bug action remained visible without covering home-page
  content.

### Store

The new Store navigation link was activated from the public home page and
reached:
`https://growpathai.com/store`

The signed-out Store exposed:

- public storefront slug entry;
- public storefront search;
- dispensary state and distance controls;
- the location-privacy explanation; and
- promoted and recommended campaign placements.

The signed-out route did not expose Manage Storefront or other authenticated
Commercial management controls.

### Courses

`https://growpathai.com/courses?release=d4b8d33&verify=signed-out-loop`
exposed the Published course catalog, truthful no-published-courses state,
Sign in, and Create free account. It did not expose course authoring controls.

### Forum / Q&A

`https://growpathai.com/forum?release=d4b8d33&verify=signed-out-loop`
explained the signed-in discussion boundary and exposed Sign in and Create free
account. It did not expose attributable discussions or reply controls while
signed out.

## Acceptance result

The Public / signed-out loop row is complete for the final deployed frontend
commit above. This record does not close the separate independent outside-user
feedback requirement, paid checkout verification, or authenticated user-type
rows.
