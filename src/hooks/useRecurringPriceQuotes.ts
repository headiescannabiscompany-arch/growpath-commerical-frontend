import { useEffect, useState } from "react";

import {
  getSubscriptionSetupStatus,
  hasCompleteRecurringPriceCatalog,
  parseRecurringPriceQuotes,
  type RecurringPriceQuotes
} from "@/api/subscription";

export function useRecurringPriceQuotes() {
  const [quotes, setQuotes] = useState<RecurringPriceQuotes>({});
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSubscriptionSetupStatus()
      .then((status) => {
        if (!mounted) return;
        const nextQuotes = parseRecurringPriceQuotes(status.quotes);
        setQuotes(nextQuotes);
        setReady(
          status.catalogReady === true && hasCompleteRecurringPriceCatalog(nextQuotes)
        );
      })
      .catch(() => {
        if (!mounted) return;
        setQuotes({});
        setReady(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, quotes, ready };
}
