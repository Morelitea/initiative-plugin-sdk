/**
 * `initiative-plugin-sdk/parts`: the components a part's tree is built from.
 *
 * Each builds one node of the contract's {@link PartNode} tree: plain data,
 * which the manifest carries and Initiative draws with its own component of
 * the same name. Called directly or written as JSX through
 * `initiative-plugin-sdk/jsx-runtime`, they build the same data:
 *
 * ```tsx
 * <Section title={{ en: "Demo" }}>
 *   <Field field="demo.link" />
 *   <Button action="new-link" />
 * </Section>
 * ```
 *
 * is `{ type: "section", props: { title: { en: "Demo" } }, children: [
 * { type: "field", props: { field: "demo.link" } }, { type: "button", props:
 * { action: "new-link" } }] }`. A field or an action is named by its key or id.
 */

import type { ButtonNode, FieldNode, PartNode, SectionNode, StackNode, TextNode, ValueNode } from "./contract.js";

/** What a section or a stack holds: nodes, lists of them, and nothing (`null`, `false`) where a condition left one out. */
export type PartChild = PartNode | readonly PartChild[] | null | undefined | boolean;

type Props<N extends PartNode> = NonNullable<N extends { props?: infer P } ? P : never>;
type Holding = { children?: PartChild };

/** The children as one list: nested lists flattened, and nothing left out. */
function flatten(children: PartChild): PartNode[] {
  if (Array.isArray(children)) return children.flatMap((child: PartChild) => flatten(child));
  return children === null || children === undefined || typeof children === "boolean" ? [] : [children as PartNode];
}

/** One node, with no props or children where it has none. */
function node(type: PartNode["type"], { children, ...props }: Record<string, unknown> & Holding): PartNode {
  const held = flatten(children);
  return {
    type,
    ...(Object.keys(props).length ? { props } : {}),
    ...(held.length ? { children: held } : {}),
  } as PartNode;
}

/** A titled group, which the reader may fold. */
export function Section(props: Props<SectionNode> & Holding): PartNode {
  return node("section", props);
}

/** Nodes side by side (`direction="row"`) or one above another. */
export function Stack(props: Props<StackNode> & Holding): PartNode {
  return node("stack", props);
}

/** A field's label and its value. */
export function Field(props: Props<FieldNode>): PartNode {
  return node("field", props);
}

/** A field's value alone. */
export function Value(props: Props<ValueNode>): PartNode {
  return node("value", props);
}

/** Words the plug-in wrote. */
export function Text(props: Props<TextNode>): PartNode {
  return node("text", props);
}

/** A button running one of the plug-in's actions. */
export function Button(props: Props<ButtonNode>): PartNode {
  return node("button", props);
}

/** `<>…</>`: its children, taken into the node that holds them. */
export function Fragment({ children }: Holding): PartNode[] {
  return flatten(children);
}
