// Minimal installed-client surface used by this fixture; no dependency download.
declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: import("react").ReactNode): void;
    unmount(): void;
  };
}
