import fs from "node:fs";
import path from "node:path";
import { getCurrentCategory, getNextTopic, getTopicCatalog } from "../api/topic-rotator.js";

const MINIMUM_CATALOG_SIZE = 1_000;
const FALLBACK_ROOT = path.join("content", ".fallback-posts");
const REQUIRED_SECTIONS = ["## Trade-offs", "## What teams get wrong", "## Key Takeaways"];
const catalog = getTopicCatalog();
const canonicalTitles = catalog.map(({ topic }) => topic.trim().toLocaleLowerCase("en-US"));
const uniqueTitles = new Set(canonicalTitles);
const categories = new Map<string, number>();

for (const { category } of catalog) {
  categories.set(category, (categories.get(category) ?? 0) + 1);
}

if (catalog.length < MINIMUM_CATALOG_SIZE) {
  throw new Error(`Topic catalogue contains ${catalog.length} entries; at least ${MINIMUM_CATALOG_SIZE} are required.`);
}

if (uniqueTitles.size !== catalog.length) {
  const duplicates = canonicalTitles.filter((title, index) => canonicalTitles.indexOf(title) !== index);
  throw new Error(`Topic catalogue contains duplicate titles: ${[...new Set(duplicates)].join(", ")}`);
}

if (categories.size < 4) {
  throw new Error(`Topic catalogue spans only ${categories.size} categories; at least four are required.`);
}

function slugifyTopic(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const fallbackPaths = catalog.map(({ category, topic }) =>
  path.join(FALLBACK_ROOT, category, `${slugifyTopic(topic)}.md`));
const uniqueFallbackPaths = new Set(fallbackPaths);
if (uniqueFallbackPaths.size !== catalog.length) {
  throw new Error("Two or more topics resolve to the same fallback Markdown path.");
}

const fallbackBodies = new Set<string>();
for (let index = 0; index < catalog.length; index += 1) {
  const { topic } = catalog[index];
  const fallbackPath = fallbackPaths[index];
  if (!fs.existsSync(fallbackPath)) {
    throw new Error(`Missing fallback Markdown for "${topic}": ${fallbackPath}`);
  }

  const body = fs.readFileSync(fallbackPath, "utf8").trim();
  if (!body.startsWith(`# ${topic}\n`)) {
    throw new Error(`Fallback title does not match catalogue topic: ${fallbackPath}`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(section)) throw new Error(`Fallback is missing ${section}: ${fallbackPath}`);
  }
  if (body.split(/\s+/).length < 300) {
    throw new Error(`Fallback is too short to publish (${body.split(/\s+/).length} words): ${fallbackPath}`);
  }
  if (fallbackBodies.has(body)) {
    throw new Error(`Fallback duplicates another article body: ${fallbackPath}`);
  }
  fallbackBodies.add(body);
}

// Prove the scheduler traverses the complete four-category catalogue without
// repeating a title across its initial 1,200-day epoch.
const scheduledTitles = new Set<string>();
const epochStart = Date.UTC(2026, 0, 1);
for (let day = 0; day < catalog.length; day += 1) {
  const date = new Date(epochStart + day * 86_400_000);
  const topic = getNextTopic(getCurrentCategory(date), date).trim().toLocaleLowerCase("en-US");
  if (scheduledTitles.has(topic)) {
    throw new Error(`Daily rotation repeats a topic before catalogue exhaustion: ${topic}`);
  }
  scheduledTitles.add(topic);
}

console.log(
  `Validated ${catalog.length} unique DevOps topics and matching Markdown fallbacks across ${categories.size} categories: `
    + [...categories.entries()].map(([category, count]) => `${category}=${count}`).join(", "),
);
