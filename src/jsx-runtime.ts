/**
 * `initiative-plugin-sdk/jsx-runtime`: JSX for a part's tree, with no React.
 *
 * Point TypeScript and esbuild at it with `"jsx": "react-jsx"` and
 * `"jsxImportSource": "initiative-plugin-sdk"`, or with a file's own
 * `@jsxImportSource initiative-plugin-sdk` pragma. Each element calls its
 * component from `initiative-plugin-sdk/parts`, which builds the node; the
 * build evaluates the definition, so the manifest holds only the data. `key`
 * is JSX's own and is not passed on.
 */

import type { PartNode } from "./contract.js";
import { Fragment } from "./parts.js";

export { Fragment };

type Component = (props: any) => PartNode | PartNode[];

export function jsx(type: Component, props: Record<string, unknown>): PartNode | PartNode[] {
  if (typeof type !== "function") {
    throw new TypeError(`<${String(type)}> is not a part: build one from initiative-plugin-sdk/parts`);
  }
  return type(props);
}

export { jsx as jsxs };

export namespace JSX {
  export type Element = PartNode;
  export type ElementType = Component;
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  export interface IntrinsicElements {}
}
