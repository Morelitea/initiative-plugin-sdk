/**
 * A part's tree written as JSX: the same plain data as written by hand, with
 * fragments and left-out children taken into the node that holds them.
 */

import { describe, expect, it } from "vitest";

import { Button, Field, Section, Stack, Text, Value } from "../src/parts.js";

describe("parts as JSX", () => {
  it("builds exactly the tree written by hand", () => {
    const opened = 0;
    const tree = (
      <Section title={{ en: "Demo" }} collapsed>
        <Stack direction="row" gap="small" key="ignored">
          <Field field="demo.link" />
          <>
            <Value field="demo.opened" />
            <Text text={{ en: "opened" }} tone="muted" />
          </>
          {opened > 0 && <Text text={{ en: "never" }} />}
        </Stack>
        {[<Button action="new-link" variant="primary" />]}
      </Section>
    );
    expect(JSON.stringify(tree)).toBe(
      JSON.stringify({
        type: "section",
        props: { title: { en: "Demo" }, collapsed: true },
        children: [
          {
            type: "stack",
            props: { direction: "row", gap: "small" },
            children: [
              { type: "field", props: { field: "demo.link" } },
              { type: "value", props: { field: "demo.opened" } },
              { type: "text", props: { text: { en: "opened" }, tone: "muted" } },
            ],
          },
          { type: "button", props: { action: "new-link", variant: "primary" } },
        ],
      })
    );
  });

  it("leaves out props and children a node has none of", () => {
    expect(<Section />).toEqual({ type: "section" });
    expect(Stack({ children: [null, false] })).toEqual({ type: "stack" });
  });

  it("types each component's props from the contract", () => {
    // @ts-expect-error a field node holds nothing
    void (<Field field="demo.link"><Value field="x" /></Field>);
    // @ts-expect-error a button names an action
    void (<Button />);
    // @ts-expect-error a stack runs in two directions
    void (<Stack direction="diagonal" />);
    // @ts-expect-error a part is built from the parts, not HTML
    void (() => <div />);
  });
});
