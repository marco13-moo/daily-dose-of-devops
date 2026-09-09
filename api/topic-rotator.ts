import fs from "fs";
import path from "node:path";
import yaml from "js-yaml";

const TOPICS_DIR = "./content/topics";
const LEGACY_TOPICS_FILE = "./content/topics.yaml";
const PUBLISHED_FILE = "./content/published.json";

type TopicEntry = { category: string; topic: string };
type PublishedEntry = string | { topic: string; category?: string };

const DEFAULT_CATEGORY_ROTATION = ["platform-engineering", "kubernetes", "security", "observability"];

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

function getIsoWeek(date: Date): number {
  const januaryFirst = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = (current.getUTCDay() + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - dayOfWeek);

  const diff = Math.round((weekStart.getTime() - januaryFirst.getTime()) / 86400000 / 7);
  return 1 + diff;
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
  return `${normalizeCategoryName(category ?? "legacy")}::${topic}`;
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

function getTopicCatalog(): TopicEntry[] {
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

  const isoWeek = getIsoWeek(date);
  return categories[(Math.max(isoWeek, 1) - 1) % categories.length];
}

export function getNextTopic(category?: string): string {
  const catalog = getTopicCatalog();
  if (catalog.length === 0) {
    throw new Error("No topics available. Add content to content/topics/*.yaml or content/topics.yaml.");
  }

  const normalizedCategory = category ? normalizeCategoryName(category) : getCurrentCategory();
  const filteredCatalog = catalog.filter((entry) => entry.category === normalizedCategory);

  if (filteredCatalog.length === 0) {
    throw new Error(`No topics remain in category: ${normalizedCategory}`);
  }

  const publishedSet = getPublishedSet();
  const remaining = filteredCatalog.filter((entry) => !publishedSet.has(topicKey(entry.topic, entry.category)));

  if (remaining.length === 0) {
    throw new Error(`No unpublished topics remain in ${normalizedCategory}. Add more topics or intentionally reset content/published.json.`);
  }

  return remaining[0].topic;
}

export function getNextTopicForNow(): string {
  return getNextTopic(process.env.TOPIC_CATEGORY ?? getCurrentCategory());
}

export function markTopicPublished(topic: string, category?: string): void {
  const catalog = getTopicCatalog();
  const inferredCategory = category
    ? normalizeCategoryName(category)
    : catalog.find((entry) => entry.topic === topic)?.category ?? "legacy";

  const published = readPublishedEntries();
  const nextEntries = published.filter((entry) => {
    if (typeof entry === "string") {
      return entry !== topic;
    }

    return !(entry.topic === topic && normalizeCategoryName(entry.category ?? "legacy") === inferredCategory);
  });

  nextEntries.push({ topic, category: inferredCategory });

  const directory = "./content";
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify({ published: nextEntries }, null, 2));
}
