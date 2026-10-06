/**
 * `pluginApiCompatible`: which plug-in API contract runs a plug-in's `min_plugin_api`.
 */

import { describe, expect, it } from "vitest";

import { pluginApiCompatible } from "../src/manifest.js";

describe("pluginApiCompatible", () => {
  it("runs a plug-in on the contract it needs, or a later minor of the same major", () => {
    expect(pluginApiCompatible("4.1.0", "4.1")).toBe(true);
    expect(pluginApiCompatible("4.1.7", "4.1")).toBe(true);
    expect(pluginApiCompatible("4.3.0", "4.1")).toBe(true);
    expect(pluginApiCompatible("4.10.0", "4.9")).toBe(true);
    expect(pluginApiCompatible("4.1.0", "4.0")).toBe(true);
  });

  it("refuses an older minor", () => {
    expect(pluginApiCompatible("4.0.9", "4.1")).toBe(false);
    expect(pluginApiCompatible("4.9.0", "4.10")).toBe(false);
  });

  it("refuses another major, older or newer", () => {
    expect(pluginApiCompatible("5.0.0", "4.1")).toBe(false);
    expect(pluginApiCompatible("5.3.0", "4.1")).toBe(false);
    expect(pluginApiCompatible("3.9.0", "4.1")).toBe(false);
  });

  it("runs a plug-in that names no contract on any", () => {
    expect(pluginApiCompatible("4.1.1", undefined)).toBe(true);
    expect(pluginApiCompatible("1.0.0", null)).toBe(true);
  });

  it("throws on a version out of its form", () => {
    expect(() => pluginApiCompatible("4.1", "4.1")).toThrow(RangeError);
    expect(() => pluginApiCompatible("v4.1.1", "4.1")).toThrow(RangeError);
    expect(() => pluginApiCompatible("4.1.1", "4.1.1")).toThrow(RangeError);
    expect(() => pluginApiCompatible("4.1.1", "4")).toThrow(RangeError);
    expect(() => pluginApiCompatible("4.1.1", "")).toThrow(RangeError);
  });
});
