import fs from "fs";
import path from "node:path";
import yaml from "js-yaml";

const TOPICS_DIR = "./content/topics";
const LEGACY_TOPICS_FILE = "./content/topics.yaml";
const PUBLISHED_FILE = "./content/published.json";

type TopicEntry = { category: string; topic: string };
type PublishedEntry = string | { topic: string; category?: string };

const DEFAULT_CATEGORY_ROTATION = ["platform-engineering", "kubernetes", "security", "observability"];
const TOPIC_STRIDE = 31;
const DAY_IN_MILLISECONDS = 86_400_000;

function normalizeCategoryName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "legacy";
}

function getSortedCategoryNames(): string[] {
  const categories = getTopicCatalog().map((entry) => entry.category);
  const unique = [...new Set(categories)];

  if (unique.length === 0) {
    return [...DEFAULT_CATEGORY_ROTATION];
  }

  return [...DEFAULT_CATEGORY_ROTATION.filter((category) => unique.includes(category))]
    .concat(unique.filter((category) => !DEFAULT_CATEGORY_ROTATION.includes(category)));
}

function getUtcDayOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_IN_MILLISECONDS);
}

function readPublishedEntries(): PublishedEntry[] {
  if (!fs.existsSync(PUBLISHED_FILE)) {
    return [];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(PUBLISHED_FILE, "utf8")) as { published?: unknown };
    const entries = Array.isArray(raw.published) ? raw.published : [];
    return entries.filter((value): value is PublishedEntry => typeof value === "string" || (
      typeof value === "object" && value !== null && typeof (value as { topic?: unknown }).topic === "string"
    ));
  } catch (error) {
    console.warn("Failed to read published topics; resetting local state.", error);
    return [];
  }
}

function topicKey(topic: string, category?: string): string {
  // Titles are globally unique. Category-independent keys also protect against a
  // future catalogue reorganisation accidentally republishing an old article.
  void category;
  return topic.trim().toLocaleLowerCase("en-US");
}

function normalizeTopicEntry(entry: unknown): string | null {
  if (typeof entry === "string") {
    return entry.trim();
  }

  if (entry && typeof entry === "object") {
    const pairs = Object.entries(entry as Record<string, unknown>);
    if (pairs.length === 1) {
      const [key, value] = pairs[0];
      if (typeof value === "string") {
        return `${key}: ${value}`.trim();
      }
      if (typeof value === "object" && value !== null && Object.keys(value as Record<string, unknown>).length > 0) {
        const nestedValue = Object.values(value as Record<string, unknown>)[0];
        if (typeof nestedValue === "string") {
          return `${key}: ${nestedValue}`.trim();
        }
      }
    }
  }

  return null;
}

export function getTopicCatalog(): TopicEntry[] {
  if (fs.existsSync(TOPICS_DIR)) {
    const files = fs.readdirSync(TOPICS_DIR)
      .filter((file) => (file.endsWith(".yaml") || file.endsWith(".yml")))
      .sort();

    const topics = files.flatMap((file) => {
      const absolutePath = path.join(TOPICS_DIR, file);
      const doc = yaml.load(fs.readFileSync(absolutePath, "utf8")) as { topics?: unknown[] };
      const entries = Array.isArray(doc.topics) ? doc.topics : [];
      const category = normalizeCategoryName(path.basename(file, path.extname(file)));

      return entries
        .map((entry) => normalizeTopicEntry(entry))
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        .map((entry) => ({ category, topic: entry.trim() }))
        .filter((entry) => entry.topic.length > 0);
    });

    if (topics.length > 0) {
      return topics;
    }
  }

  if (fs.existsSync(LEGACY_TOPICS_FILE)) {
    const doc = yaml.load(fs.readFileSync(LEGACY_TOPICS_FILE, "utf8")) as { topics?: unknown[] };
    const topics = Array.isArray(doc.topics) ? doc.topics : [];
    return topics
      .map((entry) => normalizeTopicEntry(entry))
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .map((entry) => ({ category: "legacy", topic: entry.trim() }))
      .filter((entry) => entry.topic.length > 0);
  }

  return [];
}

function getPublishedSet(): Set<string> {
  return new Set(
    readPublishedEntries().map((entry) => {
      if (typeof entry === "string") {
        return topicKey(entry, "legacy");
      }

      return topicKey(entry.topic, entry.category);
    }),
  );
}

export function getCurrentCategory(date = new Date()): string {
  const categories = getSortedCategoryNames();
  if (categories.length === 0) {
    return "legacy";
  }

  return categories[getUtcDayOrdinal(date) % categories.length];
}

function getCategoryTraversal(category: string, date: Date): TopicEntry[] {
  const filteredCatalog = getTopicCatalog().filter((entry) => entry.category === category);
  if (filteredCatalog.length === 0) {
    throw new Error(`No topics remain in category: ${category}`);
  }

  const categoryRun = Math.floor(getUtcDayOrdinal(date) / Math.max(getSortedCategoryNames().length, 1));
  const start = (categoryRun * TOPIC_STRIDE) % filteredCatalog.length;
  return filteredCatalog.map((_, offset) =>
    filteredCatalog[(start + offset * TOPIC_STRIDE) % filteredCatalog.length]);
}

// The pure schedule is intentionally independent of publication state. CI uses
// this function to prove the 1,200-day permutation without allowing an already
// published title to perturb the invariant being tested.
export function getScheduledTopic(category?: string, date = new Date()): string {
  const normalizedCategory = category ? normalizeCategoryName(category) : getCurrentCategory(date);
  return getCategoryTraversal(normalizedCategory, date)[0].topic;
}

export function getNextTopic(category?: string, date = new Date()): string {
  const catalog = getTopicCatalog();
  if (catalog.length === 0) {
    throw new Error("No topics available. Add content to content/topics/*.yaml or content/topics.yaml.");
  }

  const normalizedCategory = category ? normalizeCategoryName(category) : getCurrentCategory(date);
  const traversal = getCategoryTraversal(normalizedCategory, date);

  const publishedSet = getPublishedSet();
  const remaining = new Set(
    traversal
      .filter((entry) => !publishedSet.has(topicKey(entry.topic, entry.category)))
      .map((entry) => topicKey(entry.topic, entry.category)),
  );

  if (remaining.size === 0) {
    throw new Error(`No unpublished topics remain in ${normalizedCategory}. Add more topics or intentionally reset content/published.json.`);
  }

  // A stride coprime to each 300-entry category traverses every topic exactly
  // once while jumping between subject families instead of draining thirty
  // near-neighbour variants consecutively. The publication ledger remains the
  // final authority, so retries and manual runs cannot duplicate a title.
  for (const candidate of traversal) {
    if (remaining.has(topicKey(candidate.topic, candidate.category))) {
      return candidate.topic;
    }
  }

  throw new Error(`Unable to select an unpublished topic in ${normalizedCategory}.`);
}

export function getNextTopicForNow(date = new Date()): string {
  return getNextTopic(process.env.TOPIC_CATEGORY ?? getCurrentCategory(date), date);
}

export function markTopicPublished(topic: string, category?: string): void {
  const catalog = getTopicCatalog();
  const inferredCategory = category
    ? normalizeCategoryName(category)
    : catalog.find((entry) => entry.topic === topic)?.category ?? "legacy";

  const published = readPublishedEntries();
  const nextEntries = published.filter((entry) => {
    if (typeof entry === "string") {
      return topicKey(entry) !== topicKey(topic);
    }

    return topicKey(entry.topic, entry.category) !== topicKey(topic, inferredCategory);
  });

  nextEntries.push({ topic, category: inferredCategory });

  const directory = "./content";
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify({ published: nextEntries }, null, 2));
}
