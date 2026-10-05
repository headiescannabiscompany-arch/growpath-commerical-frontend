import { analytics } from "@heycatch/sdk";
import { filterMarketingEvent } from "./marketingPolicy";

// Called at module scope by index.js, before rendering; init is SDK-idempotent
// and SSR-safe. Never identify accounts or add manual page/click events here.
export function initializeMarketingAnalytics() {
  analytics.init({
    projectKey: "hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE",
    install: { framework: "react", frameworkVersion: "19", agent: "codex" },
    // beforeSend retains only explicitly reviewed public navigation labels.
    maskAllText: false,
    maskAllElementAttributes: true,
    persistence: "sessionStorage",
    respectDnt: true,
    requestBatching: false,
    beforeSend: (event) => filterMarketingEvent(event, window.location.href)
  });
}
