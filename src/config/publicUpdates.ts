// Curated public release notes only. Never import the private project TODO here.
export const PUBLIC_UPDATES_REVIEWED = "October 9, 2026";

export const PUBLIC_UPDATE_SECTIONS = [
  {
    id: "live",
    title: "Recent updates",
    description: "Released changes and completed checks. Each note states its scope.",
    emptyMessage: "No published releases yet.",
    entries: [
      {
        id: "inventory-archive-export-safety",
        title: "Inventory archive confirmation and safer audit downloads",
        date: "October 9, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Inventory now offers Archive Item with a confirmation naming the saved record. Cancel preserves unfinished edits; archiving keeps the record and audit history, and the existing server rules reject items or active lots with stock remaining. Commercial and Facility audit exports ignore pending responses after you leave the screen, including tab changes; returning allows a fresh request after the earlier request settles. A file already downloaded cannot be recalled. Synthetic staging checks verified Commercial archive, reload, separate-account private-record isolation and delayed-download recovery. Actual same-browser account switching, additional Facility isolation checks and the remaining inventory acceptance checks are still open. Stock, payment and access rules are unchanged."
      },
      {
        id: "business-receipt-upload-readiness",
        title: "Receipt upload availability matches the service",
        date: "October 6, 2026",
        dateLabel: "Released",
        summary:
          "Business Desk receipt intake no longer promises uploads while protected-file checks are unavailable or still loading. Add receipt waits for supported file types, and Retry checks availability without sending a file or clearing manual entries. Existing saved-receipt access and AI extraction checks remain separate. This corrects the interface; it does not activate new scanning infrastructure or Facility course-document uploads."
      },
      {
        id: "public-guided-story-walkthroughs",
        title: "Follow five sample workflows before signing up",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "Explore Free, Pro, seller, creator and Facility stories through guided steps, reviewed screenshots and matching next actions. Audience pages link to the relevant story, with keyboard controls and narrow-screen reading layouts. Labeled synthetic examples distinguish export preparation, protected-delivery readiness, author previews and recorded task history from completed downloads, sales, learner access or physical work. Personal comparisons, saved reports and linked tasks now retain the selected Personal workspace, journal reference dates keep their saved calendar day, and a response-assembly error affecting text-only AI answers is fixed. Genuine, permissioned testimonials remain separate. Plan limits and privacy rules are unchanged."
      },
      {
        id: "public-product-screenshots",
        title: "See the diagnosis form and Facility workspace",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "The public Features, grower and Facility pages now show reviewed screenshots of the actual interface, with full-size links and readable descriptions. Both examples also appear beside the no-signup journal demo. The diagnosis notes are synthetic and unsent; Facility counts are test records, not customer results or compliance certification. No private account records or AI results were published."
      },
      {
        id: "public-journal-demo",
        title: "Explore each account type without signing up",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "The no-signup demo now has Free, Pro, Commercial and Facility exploration options, each with practical highlights, plan limits and a labeled screenshot. Free focuses on one tracked plant plus available care tools around the house, not unlimited tracking or AI. The five-entry journal, vertical reading view and fixed demo share link remain available. Screenshots use synthetic records; the plant illustration is AI-generated, not a customer result. Approved, permissioned grower feedback can appear separately and stays hidden when empty. Updates now shows days since each milestone's latest recorded release; planning dates do not count. Genuine customer stories and additional real-output evidence remain separate work."
      },
      {
        id: "private-feedback-collection",
        title: "Private feedback and optional customer stories",
        date: "October 4, 2026",
        dateLabel: "Released",
        summary:
          "Share your experience from your account with an optional photo and an exact preview. Feedback stays private unless you separately allow website publication and an Admin approves that version. You can withdraw it later. Test submissions are excluded from the public feed, and feedback is not sent for AI use. The collection and review workflow is live; genuine customer stories still need to be submitted and reviewed."
      },
      {
        id: "public-website-audit",
        title: "Clearer grow journals, plans and public-page information",
        date: "October 8, 2026",
        dateLabel: "Released",
        summary:
          "The homepage and personal-grower page explain how to keep this run's lessons for the next one, alongside Jay's supplied portrait, founder story, show link, professional LinkedIn profile and company context. Pro pricing compares separate journal tools without promising savings. The October 8 release clarifies how Facility room work differs from required compliance records, without claiming to replace a compliance system. Pricing links directly to a labeled synthetic history answer and grow comparison before signup. Registration fields are easier to read on narrow screens. Public pages now connect the website and organization information to the existing brand logo, add factual feature/storefront/course definitions, and record reviewed static-page modification dates without inventing dates for live catalogs. Public-page navigation includes About and Contact. Features links to Forum groups and deliberately shared plant observations; the signed-in campaign workspace is excluded from the public sitemap and marked not to index, without removing campaign tools. The permission-controlled customer-story feed stays hidden when empty. Prices, plan limits and private analytics boundaries are unchanged. Real-user testimonials are deferred until genuine feedback and publication permission are available; verified usage proof and outside endorsements still need real material."
      },
      {
        id: "course-media-playback-recovery",
        title: "Course media recovery and verified discussion links",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "Switching lessons, video sources, accounts or workspaces clears the previous player and requires fresh third-party playback consent. Failed protected-video reads offer Retry while keeping the written summary available. Delayed document and audio requests now stop when you leave the course or switch accounts or workspaces. Retrying media does not complete a lesson, enroll you or change payments. A separate learner account also verified Open Discussion from a free Facility-only course to its saved discussion, including a full-page reload, using synthetic staging records. The test course was unpublished and archived afterward. A Facility-only course does not make its linked public discussion private. Existing access rules and layout stay unchanged."
      },
      {
        id: "course-lesson-authoring-guards",
        title: "Safer saved-course lesson editing",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Lesson editors verify the selected saved course and ownership before showing fields. Published courses now enforce the existing unpublish-before-editing rule, including when a course changes during a save. Failed reads offer Retry; switching courses or accounts clears the previous editor, and Back returns safely. Pricing, enrollment and the existing layout stay unchanged."
      },
      {
        id: "course-analytics-readiness",
        title: "Reliable course analytics and return navigation",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Course Analytics now opens the selected saved course correctly, offers Retry when courses or metrics cannot load, and prevents older responses from replacing a newer selection. Lesson-only reports label course totals as unavailable instead of showing false zeros. Back returns to Commercial Courses when opened there. Payments, permissions, course content and the existing layout stay unchanged."
      },
      {
        id: "commercial-course-list-readiness",
        title: "Clearer Commercial course loading and retry",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Courses no longer shows zero counts or an empty list when saved courses cannot load. Retry keeps unfinished forms; previously loaded courses are labeled during refresh or failure. Unavailable Product Line choices are reported separately. Course creation, publishing, access, payments and the existing layout stay unchanged."
      },
      {
        id: "course-builder-source-return",
        title: "Creator profiles, links and tool navigation",
        date: "October 9, 2026",
        dateLabel: "Released",
        summary:
          "Personal More groups the existing course catalog, video library and Live Studio under Creator tools. No separate creator signup is required; existing permissions and storage limits still apply. Billing and seller payouts are labeled as optional setup for eligible paid sales, not creator activation. Opening a tool does not publish content or start a broadcast. The earlier Course Builder return fix remains: Back returns to the Commercial Courses, Storefront or Personal Courses page that opened it, including after a reload. Unsupported return links use normal history and a safe default. Course content, publishing, payments and permissions stay unchanged. Personal Profile now saves creator names, bios and HTTPS links as private drafts until reviewed publication. Later draft edits stay private; withdrawal removes published profile details while keeping the draft and existing videos. Copy Link omits editor parameters; long names wrap on narrow screens, and preview Back returns to the editor after reload. Synthetic staging checks verified save/reload, publication, draft isolation and withdrawal. Ordinary Free/Pro hosted checks and external social composers remain unverified."
      },
      {
        id: "commercial-brand-profile-readiness",
        title: "Reliable saved Brand Profile details",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Brand Profile now shows saved storefront visibility consistently and keeps the public address tied to the saved slug. Unavailable reads provide Retry and cannot enable a blank save. Saving locks competing edits, preserves failed drafts and distinguishes a saved profile from an unsuccessful refresh. Publication, billing, privacy rules and the existing layout stay unchanged."
      },
      {
        id: "commercial-setup-readiness",
        title: "Clearer Product Lines, Batches and Inventory loading",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Product Lines and Batches now wait for saved records before creation or batch AI fill; failed reads no longer look like empty lists. Retry keeps unfinished forms. Inventory Support distinguishes unknown totals from zero stock and labels previously loaded records after a refresh failure. Calculations, permissions, publication rules and the existing layout stay unchanged."
      },
      {
        id: "commercial-trials-readiness",
        title: "Clearer Product Trial loading and retry",
        date: "October 8, 2026",
        dateLabel: "Released",
        summary:
          "Product Trials no longer claims there are no trials or saved links when records cannot load. Retry keeps your unfinished form and restores saved choices before ordinary or concept-trial creation resumes. Readable record choices now announce their selected state on web, and trial details have one page heading instead of a duplicate technical route title. Synthetic staging checks verified an ordinary private trial's create, edit, full reload, linked Evidence Run and reversible archive. These checks are not public product-performance or sales evidence. Prices, artwork and publication rules stay unchanged."
      },
      {
        id: "commercial-evidence-readiness",
        title: "Clearer evidence-run loading and retry",
        date: "October 8, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Evidence Runs no longer shows zero runs or missing linked products when its records cannot load. Retry preserves the unfinished form and restores saved choices before creation becomes available. Status and privacy choices now announce their selected state on web, and details have one page heading. A private synthetic staging run retained its edited summary after full reload and was reversibly archived; nothing was published. Publication rules, saved evidence and AI credits are unchanged."
      },
      {
        id: "commercial-diagnosis-return",
        title: "Commercial pages return to their starting menu",
        date: "October 6, 2026",
        dateLabel: "Released",
        summary:
          "Back from a standalone Commercial Plant Diagnosis now returns to Commercial Tools instead of jumping to the dashboard. External Channels and Public Links return to Commercial More, including after a reload, instead of following unrelated tab history. Returning does not connect an external account or edit a link. Grow-, plant- and saved-run-linked navigation stays unchanged, as do Personal and Facility navigation. No AI execution, credit, permission or layout changes."
      },
      {
        id: "commercial-tasks-readiness",
        title: "Clearer task loading and retry",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Tasks no longer shows an empty queue when its list cannot load. Retry preserves your unfinished task, and failed refreshes label previously loaded records. A saved task and a failed list refresh now show separate feedback. Scheduling, completion, task links and the existing layout stay unchanged."
      },
      {
        id: "commercial-product-editor-readiness",
        title: "Safer loading before product editing",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "The seller product editor now waits for the correct saved product before offering Save, Publish or record-specific tools. Unavailable records provide Retry and safe return links; late responses from a previous product cannot replace the current record. Prices, publication rules and the normal editor layout stay unchanged."
      },
      {
        id: "commercial-products-readiness",
        title: "Reliable product catalog loading and retry",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Products no longer shows zero products or an empty store while its catalog is unavailable. Refresh and Retry preserve your unfinished form, label previously loaded products, and restore current records before creation or catalog actions resume. Prices, publication rules and the existing layout stay unchanged."
      },
      {
        id: "commercial-analytics-snapshot",
        title: "Clearer Commercial Analytics snapshots",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Commercial Analytics now labels previously loaded activity during a refresh or after failure. Empty revenue breakdowns show a clear no-revenue or unavailable message instead of a blank line, while recorded currencies stay separate. Retry updates the existing counts; orders, payments, prices and the layout stay unchanged."
      },
      {
        id: "hosted-studio-readiness",
        title: "Clearer Live Studio readiness and retry",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Live Studio now distinguishes checking, unavailable hosting reads and a confirmed disabled configuration. Retry keeps your draft and saved channel choice without starting a broadcast. Hosted saving waits for a successful current-account check; account changes discard old readiness results. Stream limits, billing, publication rules and the existing layout stay unchanged. This does not add a guest waiting room."
      },
      {
        id: "marketing-planner-readiness",
        title: "Reliable Marketing Planner loading and retry",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Marketing Planner no longer shows zero plans or an empty list when loading fails. Retry keeps your unfinished form, and a failed refresh labels previously loaded plans and totals. Existing plan creation, linked destinations, budgets and campaign publishing stay unchanged; GrowPath does not execute ad-platform spending."
      },
      {
        id: "campaign-feed-readiness",
        title: "Connected product campaigns and clearer recovery",
        date: "October 9, 2026",
        dateLabel: "Released",
        summary:
          "Create Campaign on a published product now carries that product's saved text, image and destination into an unsaved form for review, instead of opening a blank form. Only products still published in the signed-in seller's catalog are loaded. Publishing waits for the current image preview to load; a failed image offers Retry or replacement without losing the draft. Feed/Campaigns separates unavailable results from an empty feed and provides Retry campaigns. Retrying preserves unfinished edits and does not publish anything. Nothing is automatically published; prices, placements and server publication rules stay unchanged. Owners can unpublish standard Feed campaigns while retaining records and analytics; fresh Feed and share-preview requests no longer show them. Public author details exclude private account fields. Campaign times follow the displayed device timezone, with invalid or ambiguous clock-change times blocked."
      },
      {
        id: "seller-summary-readiness",
        title: "Clearer seller Analytics loading and recovery",
        date: "October 1, 2026",
        dateLabel: "Released",
        summary:
          "Storefront Offers Analytics now waits for a successful load before showing Content Performance or an empty-offers message. Failed reads remain retryable, and refresh failures keep labeled previous results. Sales and Analytics retain their existing summaries; offer revenue is not a payment-date ledger or payout statement. Prices, downloads, checkout rules and the existing layout stay unchanged."
      },
      {
        id: "seller-offers-readiness",
        title: "Clearer seller offer loading and recovery",
        date: "September 29, 2026",
        dateLabel: "Released",
        summary:
          "My Storefront Offers no longer says there are no offers before loading succeeds. Failed reads keep a retry path, refresh failures retain clearly labeled saved results, and Create Offer waits for the initial load. Existing offer publication, prices, downloads and checkout rules stay unchanged."
      },
      {
        id: "commercial-dashboard-readiness",
        title: "Clearer Commercial dashboard loading and retry",
        date: "September 29, 2026",
        dateLabel: "Released",
        summary:
          "Loading or unavailable dashboard data no longer appears as an empty, unpublished store. Saved status and counts appear after a successful read, and failed reads offer Retry dashboard while navigation stays available. Account changes discard old results. Store records, checkout rules, and the existing layout stay unchanged."
      },
      {
        id: "storefront-dashboard-publication",
        title: "Accurate storefront publication status",
        date: "September 29, 2026",
        dateLabel: "Released",
        summary:
          "The Commercial dashboard now uses the same saved publication flag as Storefront settings, so a published store is no longer incorrectly labeled draft. This is a status-display correction only: it does not publish stores, change checkout eligibility, or alter the existing layout."
      },
      {
        id: "hosted-private-preview-replay",
        title: "Private hosted Live previews and reliable replay status",
        date: "September 29, 2026",
        dateLabel: "Released",
        summary:
          "Hosts can now watch authorized video in an unpublished hosted session. Stopping OBS keeps the ended or replay state instead of reverting to connecting. A private synthetic broadcast replay played through to the end on the live website. An existing public test replay also played in a signed-out private browser; chat still required sign-in. Drafts remain private; viewer permissions and the existing layout stay unchanged. These hosted replay checks are complete; the broader app review continues."
      },
      {
        id: "purchased-library-readiness",
        title: "Clearer purchased-library errors and retry",
        date: "September 28, 2026",
        dateLabel: "Released",
        summary:
          "A failed purchase-library request no longer says your library is empty. Loading, unavailable, and confirmed-empty results stay separate, with an explicit retry for failed reads. Retrying does not buy or download anything. Existing purchases, payment rules, authorized downloads, and the normal library layout stay unchanged."
      },
      {
        id: "grow-list-readiness",
        title: "Clearer grow and task loading",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "A failed grow-list request or expired sign-in no longer appears as a full or empty account. Loading and retries show their own status; grow counts, empty-state guidance, and limit warnings use successfully loaded records. Grow-specific task queues now also distinguish failed reads from empty lists, offer Retry without clearing unfinished input, and label previously loaded tasks if a refresh fails. A failed read no longer says a linked task was removed. Existing grow limits, permissions, saved records, and the normal page layout stay unchanged."
      },
      {
        id: "timeline-export-return",
        title: "Personal timeline PDFs, saved photos and a clear return",
        date: "October 9, 2026",
        dateLabel: "Released",
        summary:
          "Eligible Personal growers can now download a real PDF with dated entries and saved photos on web. Journal photos appear once with their entry, rather than again as a separate photo-added event. The PDF is a bounded selected-grow snapshot, not a complete backup or compliance certificate; each photo must fit within 8 MiB. Failed source or photo checks save no partial PDF and offer a retry. Visual HTML still includes prepared photos inside the HTML file; CSV and original photos are unchanged. Opening export from a Personal grow's timeline keeps Back pointed to that timeline, including when export is locked by your plan. Export permissions, published shares, and the existing layout stay unchanged. Native PDF and separate Commercial export checks remain open; native visual-timeline sharing remains text-only."
      },
      {
        id: "general-crop-calendar-access",
        title: "Open the grow planner for general crops",
        date: "September 28, 2026",
        dateLabel: "Released",
        summary:
          "Grow Planner / Auto Grow Calendar no longer asks herb and other general-crop growers to enable cannabis content before opening their plan. The selected grow stays attached. Cannabis-only tools, account permissions, AI-credit rules, and the existing layout stay unchanged; opening the planner does not generate tasks."
      },
      {
        id: "live-gift-follow-up",
        title: "Live subscription gift announcements verified",
        date: "September 28, 2026",
        dateLabel: "Sandbox check completed",
        summary:
          "A Live-linked subscription gift passed Sandbox checks for one announcement visible to host and viewer, retained after reload without exposing recipient details. No real money moved, and existing payment and claim behavior is unchanged. Broadcast-provider and outside-picker checks remain separate; course gifting remains planned."
      },
      {
        id: "product-checkout-request-safety",
        title: "Safer product checkout requests and retries",
        date: "October 6, 2026",
        dateLabel: "Released",
        summary:
          "Buy on storefront cards and product details now prevents overlapping checkout requests on the same page. Responses arriving after you leave or change accounts or products cannot open checkout or replace current feedback. Stock and service errors remain readable, with a deliberate retry after the request finishes. This does not cancel an existing checkout or claim stock is available; prices, payment and purchase-interest rules stay unchanged. Explicit checkout restrictions also take precedence over older checkout settings: interest-only and route-review listings cannot gain a Buy button from a saved price ID or link. Inventory sales have not been activated."
      },
      {
        id: "course-loading-readiness",
        title: "Clearer course loading and access messages",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Course catalogs and details now wait for sign-in and access checks before showing an access-denied message. Failed access checks show a separate recovery message instead of an endless loading state. Public previews, owner and Facility permissions, enrollment and payment rules stay unchanged."
      },
      {
        id: "free-course-signup-return",
        title: "Keep your course link through Free signup",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Free-account signup from a public course now keeps that course destination through email verification and matching sign-in in the same browser for up to one hour, including another tab. Immediate sign-in still completes normal onboarding first. Returning never enrolls, purchases or unlocks paid lessons automatically. Other browsers, paid-plan signup and course gifting remain separate work."
      },
      {
        id: "product-description-display",
        title: "Product descriptions without repeated text",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Product details now show identical description and short-description text only once. Different text remains visible in its original order. Saved product information, sharing, purchase-interest controls and checkout stay unchanged."
      },
      {
        id: "discover-product-destinations",
        title: "Consistent product links in Discover",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Opening a product in Discover and signing in to record interest now use the same saved product address. Incomplete product details return safely to the catalog or plain sign-in instead of guessing a destination. Trial links and the existing browsing layout stay unchanged. Navigation never submits interest or starts a purchase."
      },
      {
        id: "product-interest-signin-return",
        title: "More reliable product-interest sign-in links",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Product-interest links on storefront cards and product details now use the saved product address when sending you to sign in, even when you arrived through an alternate address. Invalid product details fall back safely to sign-in. Signing in never records an answer or makes a purchase automatically; you still choose your response. Discover's product links are listed in their own release note."
      },
      {
        id: "free-product-signup-return",
        title: "Keep your product link through Free signup",
        date: "October 9, 2026",
        dateLabel: "Released",
        summary:
          "Free-account signup from a saved product can now retain that destination through email verification and matching sign-in in the same browser for up to one hour, including another tab. Immediate sign-in still completes normal onboarding first. Opening a different email-verification link now clears the previous link's result and account hint while the new link is checked. Returning never purchases or records interest automatically. Other browsers and paid-plan signup remain separate follow-ups. Course signup is covered in its own release note."
      },
      {
        id: "course-discovery-signin",
        title: "Clearer course previews and sign-in",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Signed-out course visitors now see public previews and a clear sign-in action instead of personal payment and progress controls. Existing-account sign-in returns to the saved course without automatically enrolling or opening checkout. Account and course changes clear earlier learner state. Paid content, seller permissions and payment rules stay protected; course gifting remains separate work. Free-account course signup is covered in its own release note."
      },
      {
        id: "product-buy-signin-return",
        title: "Safer sign-in from product purchases",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Signed-out shoppers choosing Buy on storefront cards or ordinary product details now go to sign in and return to the same product when its saved identity is verified. Signing in does not place an order or open checkout automatically. Existing purchase-interest, eligibility and payment rules stay unchanged. Free-product signup continuation is listed in its own release note."
      },
      {
        id: "product-line-safety",
        title: "Reliable product collections and safer editing",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "Public store collections consistently include products assigned to the selected collection. Seller editing waits for the correct saved product line, with clear recovery when a record is unavailable. Collection details now show their own heading without a duplicate technical route title. Synthetic staging checks verified product and storefront description save/reload/restoration, collection create/edit/archive, and product-link copying and reopening. These checks do not establish payment or sales results. Existing storefront design, publication permissions, prices and checkout rules stay unchanged."
      },
      {
        id: "store-directory-recovery",
        title: "Store discovery and safer seller setup",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "The store directory shows public stores without requiring a search first, remembers your search when you return, and offers clear and retry controls. Seller setup prevents saving after a failed load, and public previews use the saved store address. Seller payout checks now distinguish unavailable verification from a disconnected account: refresh does not prompt you to create another payout account when the status cannot be read. Existing page layout, permissions, location choices and checkout rules are unchanged."
      },
      {
        id: "shopping-browse-paths",
        title: "Clearer product browsing and store links",
        date: "October 6, 2026",
        dateLabel: "Released",
        summary:
          "Discover rows now have visible previous/next controls. View all Products, Offers & Trials opens a searchable catalog, and product details link directly to the full owning store. Storefronts also offer Copy Store Link beside Share Store, with a selectable link if automatic copying is unavailable. Failed store and product reads offer Retry and a return to browsing, without calling an unavailable shop empty or a product removed. Switching stores, products or accounts discards earlier results. Existing customers signing in to record product interest return to that product. Interest-only items remain separate from purchases; checkout and privacy rules are unchanged."
      },
      {
        id: "journal-large-photo-upload",
        title: "Larger journal photos and safer retries",
        date: "September 27, 2026",
        dateLabel: "Released",
        summary:
          "Journal uploads now prepare oversized supported images to fit the upload limit without changing the original file on your device. Add photos to new or existing entries, and retry a failed save without uploading completed photos again. The New Grow screen distinguishes a failed count check from a reached limit; the separate grow-list display correction is listed in its own update. A 14 MB JPEG passed staging save, append, and recovery checks; format support still depends on your browser or device."
      },
      {
        id: "account-admin-controls",
        title: "Account management and complimentary access",
        date: "October 8, 2026",
        dateLabel: "Released",
        summary:
          "Admin account quarantine and restoration, plus complimentary invitation resend, claim and revoke, retain their completed synthetic checks. The October 8 release checks the verified invitation recipient before Facility workspace ownership and provides clearer account-switching recovery when access cannot be claimed. Workspace ownership requirements remain unchanged; this release does not claim every individual invitation has been activated. These controls do not automatically remove accounts or cancel paid subscriptions."
      },
      {
        id: "admin-case-management",
        title: "Private Admin case-management tools",
        date: "September 22, 2026",
        dateLabel: "Status confirmed",
        summary:
          "The existing private Admin interface includes case notes, restricted reporting, and reviewed evidence controls. Synthetic reporting and notification checks are complete. Remaining recovery and independent-access acceptance are listed below; this does not announce public evidence access or automatic reporting."
      },
      {
        id: "timeline-mobile-heading",
        title: "Timeline headings that fit on phones",
        date: "September 21, 2026",
        dateLabel: "Released",
        summary:
          "Grow titles and milestone counts remain visible on narrow screens. The phone-width fix was verified in production without changing timeline photos, dates, or sharing destinations."
      },
      {
        id: "grow-journal-completion",
        title: "Cleaner grow and journal creation",
        date: "September 20, 2026",
        dateLabel: "Released",
        summary:
          "The new-grow success popup closes when you choose your next step. After a journal entry saves successfully, its completed draft and photo selections clear so they are not reused in the next entry. Failed saves keep the draft available to retry."
      },
      {
        id: "timeline-photos-sharing",
        title: "Visual grow stories and journal photos",
        date: "September 19, 2026",
        dateLabel: "Released",
        summary:
          "Add photos to older journal entries and share a reviewed horizontal grow story with clickable milestones and photos. Share Timeline opens the existing sharing review. Visual Flow and Detailed List keep each journal entry with its photos instead of repeating separate photo-added rows. The Facebook preview was verified live with multiple dated points and selected photos. Sharing uses your published snapshot; later private edits need a new reviewed publication."
      },
      {
        id: "profile-age-confirmation",
        title: "Complete missing age information in Profile",
        date: "September 19, 2026",
        dateLabel: "Released",
        summary:
          "Older accounts missing age information can now complete the age-confirmation step in Profile. Content visibility remains a separate choice; this does not change existing age records or publish anything."
      },
      {
        id: "subscription-checkout",
        title: "Subscription checkout and recovery",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Monthly and yearly checkout for Pro, Commercial, and Facility plans has been updated, including recovery of an interrupted checkout."
      },
      {
        id: "facility-billing",
        title: "Billing for your facility workspace",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Facility checkout is tied to the selected workspace, with its owner, staff, and viewers covered by that workspace subscription."
      },
      {
        id: "commerce-checkout",
        title: "Course, storefront, and marketplace checkout",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Purchase checkout includes interrupted-checkout recovery and duplicate-payment protection. Digital purchases use verified access and download delivery."
      },
      {
        id: "commerce-refunds-sellers",
        title: "Purchase refunds and seller payments",
        date: "September 15, 2026",
        dateLabel: "Released",
        summary:
          "Refund handling and Stripe seller allocation have been updated. Purchase, partial/full refund, and seller-allocation flows passed Sandbox checks; those checks did not move real money or verify a bank payout."
      },
      {
        id: "facility-dashboard-readiness",
        title: "Clearer Facility records and safer task actions",
        date: "October 4, 2026",
        dateLabel: "Released",
        summary:
          "Saved AI Runs now distinguishes a failed read from an empty history, offers Refresh/Retry, and labels previously loaded results after refresh failure. Changing the filter or workspace discards older responses. Reviewing or retrying history does not rerun AI or spend credits. " +
          "Integration connections, providers and grow spaces now distinguish unavailable reads from empty lists, offer Refresh/Retry, and label retained information until recovery. Setup and history actions wait for current records; switching grow or workspace discards older review results and stops follow-on requests. Confirmed saves and refresh errors have separate feedback. Integration grow choices preserve the selected destination after failed reads. Provider contracts, credentials, imported data and controller permissions are unchanged. " +
          "Audit lists, details and record history now offer Refresh/Retry, label previously loaded evidence after failed refreshes, and discard old results when the account or workspace changes. Saved history and access rules are unchanged. Facility Analytics keeps unavailable metrics unknown, labels previously loaded results after a failed refresh, and offers Retry without changing recorded calculations. " +
          "Facility pages now restore the selected workspace correctly after a reload. If restoration is unavailable, Retry and Select Facility provide a safe way back. Team reads no longer turn connection failures into zero members; Retry retains unfinished invitation input and access-changing controls wait for current records. Existing memberships and permissions are unchanged. " +
          "Unavailable dashboard, room, grow, task, plant and journal records stay unknown instead of appearing as zero, empty, missing or Clear. Retry restores readable counts and preserves unfinished room forms, task edits and crop choices; failed refreshes label previously loaded data. Dashboard plant counts now recognize the returned plant records. Plants and Journal have visible Refresh/Retry, preserve unfinished input after read or save failures, and keep previous counts labeled until recovery. Readable tasks remain visible if team choices fail, while assignment waits for recovery. Record changes wait for readable data, and refresh cannot overlap a save. Changing account, Facility, role or selected record clears earlier results. Task removal now asks for a separate confirmation naming the saved task; Cancel keeps unfinished edits. Back from a grow's task queue returns to that grow, and grow-detail Back opens the grow list. Grow-launched Plants, Journal, Inventory and SOP Library also return to the source grow; SOP journal evidence returns to its run. Inventory and SOP Library remain Facility-wide. Inventory and SOP-run lists now distinguish unavailable reads from empty records, provide Retry, label retained snapshots after refresh failures and preserve inventory search. SOP detail no longer invents an Active run after a failed read. Retry preserves unfinished step input; stale records block edits, and confirmed saves report separately when their follow-up read fails. Inventory detail now offers Retry without falsely reporting missing or zero stock, preserves unfinished input, and coordinates saves, movements, lot creation and removal. Removal names the saved item and asks for confirmation; archived history stays readable. SOP comparison now offers Retry, preserves same-context choices, blocks stale comparisons and shows results only after both distinct saved runs are readable. Grow summaries show saved room names and readable dates, distinguish creation from start dates, and keep missing information explicit. Existing layout and permissions remain unchanged; these checks do not complete the broader Facility-role review. SOP Library and Start Run now offer Refresh/Retry, preserve unfinished input after a failed read, and pause record actions until current templates are readable. Confirmed saves have separate refresh-failure feedback; account or Facility changes discard old drafts and late results. Compliance overview now keeps unread counts unknown, offers Retry without clearing unfinished input, labels previously loaded records, and coordinates refresh with record changes. Existing role permissions and export rules are unchanged. Reports now retain labeled summaries after failed refreshes and offer Retry. Report and export results are checked against the selected Facility; changing account or Facility discards older results and pending downloads. Existing export permissions and packet contents remain unchanged."
      },
      {
        id: "video-library-readiness",
        title: "Clearer video library and detail recovery",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "Video libraries, individual videos and discussions now offer Retry when reads fail, without claiming zero storage or empty results. Account/workspace or video changes clear earlier content and unfinished forms; late responses cannot replace current results. Same-context retries preserve unfinished drafts. Signed-out viewers can choose Sign in to join the discussion and return to that video after successful login. Signing in does not post a comment or change who can access the video. Upload, publication, sharing and access rules remain unchanged."
      },
      {
        id: "forum-share-readiness",
        title: "Clearer discussions and accessible grow-interest controls",
        date: "October 5, 2026",
        dateLabel: "Released",
        summary:
          "Forum pages wait for account access to finish loading instead of briefly showing access denied. Discussion and comment reads now recover separately with Retry; a failed comments request no longer hides a readable post or claims there are no comments. Same-discussion recovery preserves unfinished replies, while changing discussions clears prior content. Copy Link, Copy Post and recipient paths remain checked; privacy rules and layout stay unchanged. X share text now fits the standard post limit, keeping the complete preview link and prioritizing the title and price before a shorter description. Full Copy Post text and saved content are unchanged. A synthetic staging discussion also opened Facebook's actual composer with its correct preview link and title; the composer was closed without posting. Reddit's desktop handoff opened the exact synthetic title and preview link without posting. Bluesky and LinkedIn reached their sign-in screens; their signed-in composers are not yet verified. This is not a claim about every social platform or phone share sheet. Shared Forum posting controls now follow your individual access, independently of the selected Facility subscription. Switching accounts or workspaces rechecks that access. Facility operational permissions and server posting rules are unchanged. Grow-interest choices now expose checked and expanded states to browser accessibility tools. Space toggles a focused choice once without scrolling; mouse and Enter controls still work. Other selected interests and existing Save actions are unchanged."
      },
      {
        id: "live-directory-readiness",
        title: "Clearer Lives directory loading and recovery",
        date: "October 2, 2026",
        dateLabel: "Released",
        summary:
          "Session counts stay unknown until the directory loads successfully. Failed or unexpected responses offer Retry without losing your search or filter, and changing accounts clears earlier results. This read-only correction does not start broadcasts, publish sessions, follow hosts or change playback, capacity, payments or the layout."
      }
    ]
  },
  {
    id: "testing",
    title: "Updates in progress · Development and testing",
    description:
      "Work already underway. Existing features may be live; the improvements and checks below are not yet complete.",
    emptyMessage: "No additional updates are currently listed as in testing.",
    entries: [
      {
        id: "recovery-release",
        title: "Recovery improvements: tested, not yet released",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "The recovery improvements have passed automated checks and staging verification. Production integration, a fresh backup and isolated restore check, and release verification remain unfinished. Staging success is not a live release; completed tests are not being listed as unfinished features."
      },
      {
        id: "admin-passkey-protection",
        title: "Passkeys for sensitive Admin actions",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "Admin passkey setup and clearer security fields are available, and automated checks are complete. Remaining independent administrator setup and two-person access acceptance are not yet complete. Ordinary sign-in and the existing page layout stay the same."
      },
      {
        id: "final-web-acceptance",
        title: "Final web and operational checks",
        date: "September 22, 2026",
        dateLabel: "Progress reviewed",
        summary:
          "Saved-video automated regression checks are complete. The full-app journey review covers visitors, personal customers, sellers, facility roles, and administrators: discovery, actions, return paths, mobile layouts, accessibility, permissions, sharing and exports. Focused shopping navigation fixes are listed as released separately; this broader review and final operational checks remain in progress."
      }
    ]
  },
  {
    id: "planned",
    title: "Future updates · Planned",
    description: "Planned work, not a promise of a release date. Priorities may change.",
    emptyMessage: "No planned updates are currently listed.",
    entries: [
      {
        id: "timeline-improvements",
        title: "Timeline and journal follow-up checks",
        date: "September 22, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Investigate reported calendar-date mismatches and finish checks for longer timelines and additional sharing destinations. These follow-up checks are separate from the released visual-story, photo, and creation-screen updates."
      },
      {
        id: "store-discovery-review",
        title: "Further storefront experience improvements",
        date: "September 22, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "After the focused browsing and catalog fixes, review the broader shopping and seller journeys, collection organization, and campaign clarity. Any larger layout changes require separate approval and will be ordered against course gifting by estimated effort."
      },
      {
        id: "course-gifting",
        title: "Gift a course",
        date: "September 15, 2026",
        dateLabel: "Plan reviewed",
        summary:
          "Purchase a course for someone else. This remains planned after current completion work and the store-discovery review. Larger storefront changes may follow it if their estimated work is longer. Course gifting is not available as part of the completed subscription-gifting work."
      }
    ]
  },
  {
    id: "lives-planned",
    title: "Lives · Later roadmap",
    description:
      "Planned after current completion work and course gifting. These additions are not started or available yet; existing Live hosting and replay remain separate released features.",
    emptyMessage: "No later Live enhancements are currently listed.",
    entries: [
      {
        id: "live-native-backstage",
        title: "Join a Live and wait backstage inside GrowPath",
        date: "October 1, 2026",
        dateLabel: "Planned for later",
        summary:
          "Request to join from the Live page, check camera and microphone, and wait privately for host review. Hosts would preview guests before bringing them on air, with up to six people on screen. The guest experience would stay inside GrowPath; this does not replace OBS or promise an entirely self-hosted video system."
      },
      {
        id: "live-host-safety",
        title: "Guest safety and easier show production",
        date: "October 1, 2026",
        dateLabel: "Planned for later",
        summary:
          "Private preview and clear Backstage / On air states, guest recording notices, delegated producer and moderator controls, mute/remove/block actions, an emergency host-only view, and reconnecting guests returned to backstage. Planned preparation checks and connection, duration and usage warnings would help hosts avoid interruptions."
      },
      {
        id: "live-creator-growth",
        title: "Creator showcases, audience return and sharing",
        date: "October 1, 2026",
        dateLabel: "Planned for later",
        summary:
          "Review and extend existing tools for phone rear-camera grow tours, guest names and approved grow/profile links, spotlight and group views, scheduled shows, opt-in reminders and replay sharing. Later options include creator referral links, highlight markers and clips, captions, reusable branding and sponsor cards, and audience/watch-time reporting. Reuse working features first; detailed scope and accessibility checks come before implementation."
      },
      {
        id: "live-creator-tips",
        title: "Support a Live host",
        date: "October 1, 2026",
        dateLabel: "Planned for later",
        summary:
          "Explore optional creator tips with suggested or custom amounts, optional messages and public thank-yous, confirmed-payment announcements, and clear earnings, fees, refunds and payout status. Payment-provider eligibility and approval, supported content, recipient verification and fee decisions are prerequisites. Tips are not enabled, are not charitable donations, and would not buy giveaway eligibility. No prepaid coins or wallet are planned."
      }
    ]
  }
];
