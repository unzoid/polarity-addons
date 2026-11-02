// Checks addons.json: shape, no duplicates, and that every manifest is live and
// matches what the entry claims. No dependencies; Node 20+.
//
//   node scripts/validate.mjs            full check (fetches every manifest)
//   node scripts/validate.mjs --offline  shape only
import { readFile } from "node:fs/promises";

const offline = process.argv.includes("--offline");
const CATEGORIES = ["Subtitles", "Streams", "Metadata", "Catalogs"];
const KEYS = ["id", "name", "author", "about", "category", "tags", "manifest", "configure", "setupRequired", "homepage", "minAppVersion"];
// What each category needs the add-on to actually provide.
const NEEDS = { Subtitles: "subtitles", Streams: "stream", Metadata: "meta", Catalogs: "catalog" };
// The Marketplace is for lawful content only. These are refused outright; a
// reviewer still reads every new entry.
const BANNED = /\b(torrent|torrentio|debrid|real-?debrid|alldebrid|premiumize|jackett|prowlarr|magnet|yts|1337x|rarbg|piratebay|tpb|nyaa|comet|mediafusion|knightcrawler|peerflix)\b/i;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const file = JSON.parse(await readFile(new URL("../addons.json", import.meta.url), "utf8"));
if (file.version !== 1) fail("addons.json", "version must be 1");
if (!Array.isArray(file.addons)) fail("addons.json", "addons must be an array");
for (const k of Object.keys(file)) if (!["$schema", "version", "addons"].includes(k)) fail("addons.json", `unknown key "${k}"`);

const seenIds = new Set();
const seenUrls = new Set();

for (const [i, a] of (file.addons ?? []).entries()) {
  const where = `addons[${i}] ${a?.name ?? "?"}`;
  for (const k of ["id", "name", "author", "about", "category", "manifest"]) {
    if (typeof a[k] !== "string" || !a[k].trim()) fail(where, `"${k}" is required`);
  }
  for (const k of Object.keys(a)) if (!KEYS.includes(k)) fail(where, `unknown key "${k}"`);
  if (a.name?.length > 40) fail(where, "name is longer than 40 characters");
  if (a.about?.length > 200) fail(where, "about is longer than 200 characters");
  if (!CATEGORIES.includes(a.category)) fail(where, `category must be one of ${CATEGORIES.join(", ")}`);
  if (a.tags && (!Array.isArray(a.tags) || a.tags.some((t) => typeof t !== "string") || a.tags.length > 8)) fail(where, "tags must be up to 8 strings");
  if (!/^https:\/\/.+\/manifest\.json$/.test(a.manifest ?? "")) fail(where, "manifest must be an https URL ending in /manifest.json");
  for (const k of ["configure", "homepage"]) if (a[k] !== undefined && !/^https:\/\//.test(a[k])) fail(where, `${k} must be an https URL`);
  if (a.setupRequired !== undefined && typeof a.setupRequired !== "boolean") fail(where, "setupRequired must be true or false");
  if (a.setupRequired && !a.configure) fail(where, "setupRequired needs a configure page");
  if (a.minAppVersion !== undefined && !/^\d+\.\d+\.\d+$/.test(a.minAppVersion)) fail(where, "minAppVersion must look like 1.2.3");
  if (seenIds.has(a.id)) fail(where, `duplicate id ${a.id}`);
  if (seenUrls.has(a.manifest)) fail(where, `duplicate manifest ${a.manifest}`);
  seenIds.add(a.id);
  seenUrls.add(a.manifest);
  if (BANNED.test(`${a.id} ${a.name} ${a.about} ${a.manifest} ${(a.tags ?? []).join(" ")}`)) {
    fail(where, "looks like a torrent, debrid or piracy add-on, which the Marketplace doesn't list");
  }
}

if (!offline) {
  await Promise.all(
    (file.addons ?? []).map(async (a, i) => {
      const where = `addons[${i}] ${a.name}`;
      try {
        const res = await fetch(a.manifest, { signal: AbortSignal.timeout(15_000), headers: { accept: "application/json" } });
        if (!res.ok) return fail(where, `manifest answered HTTP ${res.status}`);
        const m = await res.json();
        if (m.id !== a.id) fail(where, `id is "${a.id}" but the manifest says "${m.id}"`);
        const resources = (m.resources ?? []).map((r) => (typeof r === "string" ? r : r.name));
        const need = NEEDS[a.category];
        if (need && !resources.includes(need)) fail(where, `category ${a.category} but the add-on has no "${need}" resource (has: ${resources.join(", ")})`);
        const required = !!m.behaviorHints?.configurationRequired;
        if (required !== !!a.setupRequired) fail(where, `setupRequired should be ${required} (from the manifest's behaviorHints)`);
        if (BANNED.test(`${m.name} ${m.description ?? ""}`)) fail(where, "the manifest describes a torrent, debrid or piracy add-on");
      } catch (e) {
        fail(where, `couldn't load manifest: ${e.message}`);
      }
    }),
  );
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem${errors.length === 1 ? "" : "s"}:\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${file.addons.length} add-ons look good${offline ? " (offline check)" : ""}.`);
