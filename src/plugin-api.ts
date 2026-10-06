/**
 * The plug-in API contract's one compatibility rule.
 *
 * The contract is `schemas/plugin-api.json`, published at this package's
 * version: a minor release adds to it, a major one removes or changes
 * something. A deployment serves one contract version, `MAJOR.MINOR.PATCH`; a
 * plug-in's manifest may name the oldest it needs, `min_plugin_api`, as
 * `MAJOR.MINOR`. Initiative, the registry and the SDK all decide with this
 * rule, so it is stated once here.
 */

const SERVED = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;
const REQUIRED = /^([0-9]+)\.([0-9]+)$/;

/**
 * Whether a deployment serving contract `served` (`"4.1.1"`) can run a plug-in
 * whose manifest needs `required` (`"4.1"`): the same major version, and a
 * minor version at least the one needed. A plug-in that names no
 * `min_plugin_api` (`undefined` or `null`) runs on any contract.
 *
 * Throws a `RangeError` on a version that is not in its form, rather than
 * guessing: a manifest that passed validation cannot carry one.
 */
export function pluginApiCompatible(served: string, required: string | null | undefined): boolean {
  const serving = SERVED.exec(served);
  if (!serving) throw new RangeError(`the served plug-in API version '${served}' is not MAJOR.MINOR.PATCH`);
  if (required === undefined || required === null) return true;
  const needing = REQUIRED.exec(required);
  if (!needing) throw new RangeError(`min_plugin_api '${required}' is not MAJOR.MINOR`);
  const [servedMajor, servedMinor] = [Number(serving[1]), Number(serving[2])];
  const [neededMajor, neededMinor] = [Number(needing[1]), Number(needing[2])];
  return servedMajor === neededMajor && servedMinor >= neededMinor;
}
