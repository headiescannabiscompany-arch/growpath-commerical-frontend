import React, {
  StrictMode,
  Suspense,
  startTransition,
  useLayoutEffect,
  useState
} from "react";
import { act, render, renderHook } from "@testing-library/react-native";

import { useCheckoutAttempt, type CheckoutAttempt } from "@/hooks/useCheckoutAttempt";

describe("useCheckoutAttempt", () => {
  function setup(scope: readonly unknown[] = ["viewer-a", "store-a", "product-a"]) {
    return renderHook(
      ({ currentScope }: { currentScope: readonly unknown[] }) =>
        useCheckoutAttempt(currentScope),
      { initialProps: { currentScope: scope } }
    );
  }

  function begin(api: ReturnType<typeof useCheckoutAttempt>) {
    const attempt = api.begin();
    expect(attempt).not.toBeNull();
    return attempt as CheckoutAttempt;
  }

  it("synchronously locks repeated starts and releases only on its matching finish", () => {
    const { result } = setup();
    const attempt = begin(result.current);
    expect(result.current.begin()).toBeNull();
    expect(result.current.isCurrent(attempt)).toBe(true);
    expect(result.current.finish({} as CheckoutAttempt)).toBe(false);
    expect(result.current.begin()).toBeNull();
    expect(result.current.finish(attempt)).toBe(true);
    expect(result.current.isCurrent(attempt)).toBe(false);
    const next = begin(result.current);
    expect(next).not.toBe(attempt);
    expect(result.current.finish(attempt)).toBe(false);
    expect(result.current.begin()).toBeNull();
    expect(result.current.isCurrent(next)).toBe(true);
    expect(result.current.finish(next)).toBe(true);
  });

  it("retains an attempt and stable callbacks across equivalent scope arrays", () => {
    const products = [{ id: "product-a" }];
    const { result, rerender } = setup(["viewer-a", products, NaN]);
    const api = result.current;
    const attempt = begin(api);
    rerender({ currentScope: ["viewer-a", products, NaN] });
    expect(result.current).toBe(api);
    expect(api.isCurrent(attempt)).toBe(true);
    expect(api.begin()).toBeNull();
    expect(api.finish(attempt)).toBe(true);
  });

  it.each([
    ["account", ["viewer-b", "token-a", true, false, "store-a", "product-a"]],
    ["token", ["viewer-a", "token-b", true, false, "store-a", "product-a"]],
    ["sign-out", ["viewer-a", "token-a", false, false, "store-a", "product-a"]],
    ["hydration", ["viewer-a", "token-a", true, true, "store-a", "product-a"]],
    ["store", ["viewer-a", "token-a", true, false, "store-b", "product-a"]],
    ["product", ["viewer-a", "token-a", true, false, "store-a", "product-b"]],
    ["scope length", ["viewer-a", "token-a", true, false, "store-a"]]
  ])("invalidates %s changes without unlocking until settlement", (_name, changed) => {
    const original = ["viewer-a", "token-a", true, false, "store-a", "product-a"];
    const { result, rerender } = setup(original);
    const attempt = begin(result.current);
    rerender({ currentScope: changed as readonly unknown[] });
    expect(result.current.isCurrent(attempt)).toBe(false);
    expect(result.current.begin()).toBeNull();
    expect(result.current.finish(attempt)).toBe(true);
    const next = begin(result.current);
    expect(result.current.isCurrent(next)).toBe(true);
  });

  it("never revives the old attempt after committed A to B to A transitions", () => {
    const { result, rerender } = setup(["a"]);
    const attempt = begin(result.current);
    rerender({ currentScope: ["b"] });
    rerender({ currentScope: ["a"] });
    expect(result.current.isCurrent(attempt)).toBe(false);
    expect(result.current.begin()).toBeNull();
    expect(result.current.finish(attempt)).toBe(true);
    expect(result.current.isCurrent(begin(result.current))).toBe(true);
  });

  it("uses Object.is for elements, including signed zero and object replacement", () => {
    const products = [{ id: "product-a" }];
    const { result, rerender } = setup([0, products]);
    const first = begin(result.current);
    rerender({ currentScope: [-0, products] });
    expect(result.current.isCurrent(first)).toBe(false);
    result.current.finish(first);
    const second = begin(result.current);
    rerender({ currentScope: [-0, [{ id: "product-a" }]] });
    expect(result.current.isCurrent(second)).toBe(false);
  });

  it("copies committed elements rather than retaining a mutable outer scope array", () => {
    const scope = ["a"];
    const { result, rerender } = setup(scope);
    const attempt = begin(result.current);
    scope[0] = "b";
    rerender({ currentScope: scope });
    expect(result.current.isCurrent(attempt)).toBe(false);
  });

  it("invalidates on unmount, forbids new starts and finishes without UI permission", () => {
    const { result, unmount } = setup();
    const api = result.current;
    const attempt = begin(api);
    unmount();
    expect(api.isCurrent(attempt)).toBe(false);
    expect(api.begin()).toBeNull();
    expect(api.finish(attempt)).toBe(false);
    expect(api.begin()).toBeNull();
    expect(api.finish(attempt)).toBe(false);
  });

  it("keeps independent hooks and attempts isolated without scope metadata", () => {
    const first = setup(["synthetic-token-a", "viewer-a"]);
    const second = setup(["synthetic-token-b", "viewer-b"]);
    const one = begin(first.result.current);
    const two = begin(second.result.current);
    expect(one).not.toBe(two);
    expect(Reflect.ownKeys(one)).toEqual([]);
    expect(Object.isFrozen(one)).toBe(true);
    expect(JSON.stringify(one)).toBe("{}");
    expect(first.result.current.isCurrent(two)).toBe(false);
    expect(first.result.current.finish(two)).toBe(false);
    expect(first.result.current.isCurrent(one)).toBe(true);
    expect(second.result.current.isCurrent(two)).toBe(true);
  });

  it("invalidates Strict Mode cleanup but retains its lock through effect replay", () => {
    let api!: ReturnType<typeof useCheckoutAttempt>;
    const starts: (CheckoutAttempt | null)[] = [];
    function Probe() {
      const attemptApi = useCheckoutAttempt(["a"]);
      useLayoutEffect(() => {
        api = attemptApi;
        starts.push(attemptApi.begin());
      }, [attemptApi]);
      return null;
    }
    render(
      <StrictMode>
        <Probe />
      </StrictMode>
    );
    expect(starts).toHaveLength(2);
    expect(starts[0]).not.toBeNull();
    expect(starts[1]).toBeNull();
    expect(api.isCurrent(starts[0] as CheckoutAttempt)).toBe(false);
    expect(api.begin()).toBeNull();
    expect(api.finish(starts[0] as CheckoutAttempt)).toBe(true);
    expect(api.isCurrent(begin(api))).toBe(true);
  });

  it("does not invalidate the committed page for a suspended transition render", async () => {
    let api!: ReturnType<typeof useCheckoutAttempt>;
    let update!: React.Dispatch<
      React.SetStateAction<{ scope: string; suspend: boolean }>
    >;
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    function Probe({ scope, suspend }: { scope: string; suspend: boolean }) {
      const attemptApi = useCheckoutAttempt([scope]);
      useLayoutEffect(() => {
        api = attemptApi;
      });
      if (suspend) throw pending;
      return null;
    }
    function Harness() {
      const [state, setState] = useState({ scope: "a", suspend: false });
      useLayoutEffect(() => {
        update = setState;
      }, []);
      return (
        <Suspense fallback={null}>
          <Probe {...state} />
        </Suspense>
      );
    }
    render(<Harness />);
    const attempt = begin(api);
    act(() => {
      startTransition(() => update({ scope: "b", suspend: true }));
    });
    expect(api.isCurrent(attempt)).toBe(true);
    expect(api.begin()).toBeNull();
    await act(async () => {
      update({ scope: "a", suspend: false });
      resolve();
    });
    expect(api.isCurrent(attempt)).toBe(true);
    act(() => update({ scope: "b", suspend: false }));
    expect(api.isCurrent(attempt)).toBe(false);
    expect(api.finish(attempt)).toBe(true);
  });
});
