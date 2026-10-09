/**
 * One definition, one manifest: what `definePlugin` declares becomes the
 * contract's manifest with its handlers left out and its keys made ids, and
 * the definition's types refuse what the manifest could not say.
 */

import { describe, expect, it } from "vitest";

import { manifestOf } from "../src/define.js";
import { definePlugin, defineEndpoint, validateManifest } from "../src/manifest.js";
import { issuesPlugin, trackerPlugin } from "./support/plugin.js";

const { plugin } = trackerPlugin();
const manifest = manifestOf(plugin, {
  widgets: { "open-count": '<metric :value="values.total" :label="strings.open" />' },
  blocks: { tickets: '<button action="close-ticket">{{ strings.close }}</button>' },
});

describe("manifestOf", () => {
  it("writes the contract's manifest, in its order, with every key made an id", () => {
    expect(JSON.stringify(manifest, null, 2)).toBe(
      JSON.stringify(
        {
          plugin_kind: "service",
          service: { public_id: "acme.tracker", protocol: 1, scopes: ["projects:read", "plugins:acme.github"] },
          features: ["blocks", "dashboards", "endpoints", "pages", "widgets"],
          default_name: "Tracker",
          vendor: { fields: [{ key: "client_id", type: "string", required: true, label: { en: "Client id" } }] },
          connections: [
            {
              id: "account",
              scope: "interactive",
              label: { en: "Your account" },
              fields: [],
              flow: {
                type: "oauth2",
                authorize_url: "https://tracker.example/authorize",
                token_url: "https://tracker.example/token",
                client_id: "{vendor.client_id}",
                after_connect: true,
                revoke: "hook",
              },
            },
          ],
          schedules: [{ id: "sweep", every: "15m" }],
          endpoints: [
            {
              id: "plugin.acme.tracker.projects",
              direction: "read",
              label: { en: "Projects" },
              returns: [{ key: "ids", type: "string", list: true }],
            },
            {
              id: "plugin.acme.tracker.open-tickets",
              direction: "read",
              label: { en: "Open tickets" },
              public: true,
              actors: ["installation", "member"],
              cache_ttl_seconds: 60,
              params: [
                {
                  key: "project",
                  type: "string",
                  label: { en: "Project" },
                  options_from: { endpoint: "plugin.acme.tracker.projects", key: "ids" },
                },
                { key: "labels", type: "string", label: { en: "Labels" }, list: true },
              ],
              returns: [
                { key: "titles", type: "string", list: true, label: { en: "Titles" } },
                { key: "total", type: "int" },
              ],
            },
            {
              id: "plugin.acme.tracker.task-tickets",
              direction: "read",
              label: { en: "A task's tickets" },
              subject: "task",
              per_viewer: true,
              returns: [
                { key: "task_id", type: "int", list: true },
                { key: "title", type: "string", list: true },
              ],
            },
            {
              id: "plugin.acme.tracker.close-ticket",
              direction: "write",
              label: { en: "Close a ticket" },
              subject: "task",
              public: true,
              actors: ["member"],
              returns: [{ key: "closed", type: "bool" }],
            },
            {
              id: "plugin.acme.tracker.ticket-opened",
              direction: "emit",
              label: { en: "A ticket was opened" },
              returns: [
                { key: "title", type: "string" },
                { key: "number", type: "int" },
              ],
              identity: { kind: "ticket", key: ["number"] },
            },
          ],
          community_summary: "plugin.acme.tracker.projects",
          widgets: [
            {
              id: "open-count",
              meta: { name: { en: "Open tickets" } },
              endpoint: "plugin.acme.tracker.open-tickets",
              template: '<metric :value="values.total" :label="strings.open" />',
              strings: { open: { en: "Open tickets" } },
              sample_data: { total: 3 },
            },
          ],
          blocks: [
            {
              id: "tickets",
              name: { en: "Tickets" },
              areas: ["task.card.inline", "task.page.aside"],
              template: '<button action="close-ticket">{{ strings.close }}</button>',
              endpoint: "plugin.acme.tracker.task-tickets",
              actions: ["plugin.acme.tracker.close-ticket"],
              project_listing: "WY4WAN93PFP3X4",
              strings: { close: { en: "Close" } },
            },
          ],
          pages: [{ id: "board", path: "/board", name: { en: "Board" }, scopes: ["initiative"] }],
          dashboards: [
            {
              uid: "M3N4P5Q6R7S8T9",
              public_id: "acme.tracker-overview",
              name: "Overview",
              widgets: [
                {
                  type: "open-count",
                  binding: { params: { project: "p1" } },
                },
              ],
            },
          ],
        },
        null,
        2
      )
    );
  });

  it("is a manifest the SDK's own validation passes", () => {
    expect(validateManifest(manifest)).toEqual([]);
  });

  it("declares a feature only for a block that carries something", () => {
    const bare = manifestOf(definePlugin({ publicId: "acme.bare", uid: "K7M2QX8N4TVB9D", name: "Bare", endpoints: {} }));
    expect(bare).toEqual({
      plugin_kind: "service",
      service: { public_id: "acme.bare", protocol: 1 },
      features: [],
      default_name: "Bare",
    });
  });
});

describe("a minimum age", () => {
  it("is written beside the name, by country", () => {
    const aged = manifestOf(
      { ...plugin, minimumAge: { default: 16, US: 13 } },
      {
        widgets: { "open-count": '<metric :value="values.total" />' },
        blocks: { tickets: '<button action="close-ticket">{{ strings.close }}</button>' },
      }
    );
    expect(aged.minimum_age).toEqual({ default: 16, US: 13 });
    expect(Object.keys(aged).indexOf("minimum_age")).toBe(Object.keys(aged).indexOf("default_name") + 1);
    expect(validateManifest(aged)).toEqual([]);
  });

  it("is left out when the definition says nothing", () => {
    expect("minimum_age" in manifest).toBe(false);
  });
});

describe("the oldest plug-in API it needs", () => {
  it("is written as min_plugin_api, after the minimum age", () => {
    const needing = manifestOf(
      { ...plugin, minimumAge: { default: 16 }, minPluginApi: "4.1" },
      {
        widgets: { "open-count": '<metric :value="values.total" />' },
        blocks: { tickets: '<button action="close-ticket">{{ strings.close }}</button>' },
      }
    );
    expect(needing.min_plugin_api).toBe("4.1");
    expect(Object.keys(needing).indexOf("min_plugin_api")).toBe(Object.keys(needing).indexOf("minimum_age") + 1);
    expect(validateManifest(needing)).toEqual([]);
  });

  it("is left out when the definition says nothing", () => {
    expect("min_plugin_api" in manifest).toBe(false);
  });

  it("fails validation when it is not MAJOR.MINOR", () => {
    const wrong = manifestOf(
      { ...plugin, minPluginApi: "4.1.1" },
      {
        widgets: { "open-count": '<metric :value="values.total" />' },
        blocks: { tickets: '<button action="close-ticket">{{ strings.close }}</button>' },
      }
    );
    expect(validateManifest(wrong).map((problem) => problem.where)).toContain("/min_plugin_api");
  });
});

describe("a declarative definition", () => {
  const declarative = manifestOf(issuesPlugin());

  it("writes its hosts and no service block, and names an event's emission by id", () => {
    expect(declarative).not.toHaveProperty("service");
    expect(Object.keys(declarative).slice(0, 5)).toEqual(["plugin_kind", "features", "default_name", "hosts", "vendor"]);
    expect(declarative.hosts).toEqual(["api.tracker.example", "*.tracker.example"]);
    expect(declarative.webhooks?.events?.[0].emit).toBe("plugin.acme.issues.issue-opened");
    expect(declarative.endpoints?.[1]).toMatchObject({ id: "plugin.acme.issues.label", steps: [{ name: "current" }, { name: "set" }] });
  });

  it("is a manifest the SDK's own validation passes", () => {
    expect(validateManifest(declarative, { publicId: "acme.issues" })).toEqual([]);
  });
});

describe("the definition's types", () => {
  it("type a handler from its endpoint's params and returns", () => {
    defineEndpoint({
      direction: "read",
      params: { repo: { type: "string", label: { en: "Repository" } }, tags: { type: "string", label: { en: "Tags" }, list: true } },
      returns: { names: { type: "string", list: true }, total: "int", open: "bool" },
      handler: async (call) => {
        const repo: string | number | boolean | undefined = call.params.repo;
        const tags: Array<string | number | boolean> | undefined = call.params.tags;
        // @ts-expect-error an undeclared parameter
        void call.params.branch;
        void repo;
        void tags;
        return { result: { names: ["a"], total: 2, open: null } };
      },
    });
    defineEndpoint({
      direction: "read",
      returns: { total: "int" },
      // @ts-expect-error a return of the wrong type
      handler: async () => ({ result: { total: "two" } }),
    });
    defineEndpoint({
      direction: "read",
      returns: { names: { type: "string", list: true } },
      // @ts-expect-error a single value where a list is declared
      handler: async () => ({ result: { names: "a" } }),
    });
    defineEndpoint({
      direction: "read",
      returns: { total: "int" },
      // @ts-expect-error a return the endpoint does not declare
      handler: async () => ({ result: { count: 1 } }),
    });
  });

  it("keep an endpoint to a handler or a request and a map", () => {
    defineEndpoint({ direction: "read", request: { method: "GET", url: '"https://x.example"', connection: "c" }, map: "{}" });
    // @ts-expect-error a map with nothing to map
    defineEndpoint({ direction: "read", map: "{}" });
    // @ts-expect-error a request beside steps
    defineEndpoint({ direction: "read", request: { method: "GET", url: "u" }, steps: [], map: "{}" });
    defineEndpoint({
      direction: "read",
      request: { method: "GET", url: "u" },
      map: "{}",
      // @ts-expect-error an endpoint with a request has no handler
      handler: async () => ({ result: {} }),
    });
  });

  it("name an event's emission by its key", () => {
    const emitted = defineEndpoint({ direction: "emit", returns: { n: "int" } });
    const read = defineEndpoint({ direction: "read", request: { method: "GET", url: "u", connection: "c" }, map: "{}" });
    const name = { publicId: "acme.x", uid: "K7M2QX8N4TVB9E", name: "X", hosts: ["x.example"] };
    const webhooks = { verify: issuesPlugin().webhooks!.verify, dedup: "X-Delivery", route: { path: "a", connection: "c", field: "f" } };
    definePlugin({ ...name, endpoints: { emitted, read }, webhooks: { ...webhooks, events: [{ when: "true", emit: "emitted", map: "{}" }] } });
    // @ts-expect-error a read is not emitted
    definePlugin({ ...name, endpoints: { emitted, read }, webhooks: { ...webhooks, events: [{ when: "true", emit: "read", map: "{}" }] } });
  });

  it("refuse a widget or a summary naming an endpoint that is not a declared read", () => {
    const read = defineEndpoint({ direction: "read", returns: { total: "int" }, handler: async () => ({ result: {} }) });
    const write = defineEndpoint({ direction: "write", handler: async () => ({ result: {} }) });
    const name = { publicId: "acme.x", uid: "K7M2QX8N4TVB9E", name: "X" };
    definePlugin({ ...name, endpoints: { read, write }, widgets: { w: { meta: {}, template: "w.html", endpoint: "read" } } });
    // @ts-expect-error not declared
    definePlugin({ ...name, endpoints: { read, write }, widgets: { w: { meta: {}, template: "w.html", endpoint: "missing" } } });
    // @ts-expect-error a write draws nothing
    definePlugin({ ...name, endpoints: { read, write }, widgets: { w: { meta: {}, template: "w.html", endpoint: "write" } } });
    // @ts-expect-error a summary is a read
    definePlugin({ ...name, endpoints: { read, write }, communitySummary: "write" });
  });
});
