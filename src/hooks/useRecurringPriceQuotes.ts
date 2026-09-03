import { useEffect, useState } from "react";

import {
  getSubscriptionSetupStatus,
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
        setQuotes(status?.quotes || {});
        setReady(status?.catalogReady === true);
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
