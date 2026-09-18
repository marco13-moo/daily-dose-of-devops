import { getCurrentCategory, getNextTopic, getTopicCatalog } from "../api/topic-rotator.js";

const MINIMUM_CATALOG_SIZE = 1_000;
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
  `Validated ${catalog.length} unique DevOps topics across ${categories.size} categories: `
    + [...categories.entries()].map(([category, count]) => `${category}=${count}`).join(", "),
);
