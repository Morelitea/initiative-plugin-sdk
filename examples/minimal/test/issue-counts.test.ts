/**
 * The endpoint's request and map, run against a recorded GitLab answer as
 * Initiative runs them. The widget's template draws what the endpoint answers;
 * Initiative compiles and checks it when the plug-in is published.
 */

import { describe, expect, it } from "vitest";
import { runEndpoint } from "initiative-plugin-sdk/testing";

import plugin from "../src/plugin.js";
import statistics from "./fixtures/issues-statistics.json" with { type: "json" };

describe("issue-counts", () => {
  it("asks GitLab for the project's statistics, and maps the counts", async () => {
    const run = await runEndpoint(plugin, "issue-counts", {
      params: { project: "gitlab-org/gitlab" },
      responses: [{ body: statistics }],
    });
    expect(run).toEqual({
      requests: [
        {
          method: "GET",
          url: "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab/issues_statistics",
          headers: {},
          connection: "gitlab",
        },
      ],
      result: { opened: 12, closed: 30 },
    });
  });

  it("answers not-found for a project GitLab does not show the account", async () => {
    const run = await runEndpoint(plugin, "issue-counts", {
      params: { project: "acme/secret" },
      responses: [{ status: 404, body: { message: "404 Project Not Found" } }],
    });
    expect(run).toMatchObject({ unavailable: "not-found" });
  });
});
