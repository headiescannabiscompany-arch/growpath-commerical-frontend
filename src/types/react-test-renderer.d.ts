declare module "react-test-renderer" {
  export type ReactTestRenderer = any;
  export const act: (callback: () => void | Promise<void>) => Promise<void> | void;
  const renderer: {
    create: (element: unknown) => ReactTestRenderer;
  };
  export default renderer;
}
