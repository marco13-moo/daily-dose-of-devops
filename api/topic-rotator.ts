import fs from "fs";
import yaml from "js-yaml";

const TOPICS_FILE = "./content/topics.yaml";
const PUBLISHED_FILE = "./content/published.json";

export function getNextTopic(): string {
  // Load all topics
  const topicsYaml = yaml.load(fs.readFileSync(TOPICS_FILE, "utf8")) as { topics: string[] };

  // Load published topics
  let published = { published: [] as string[] };
  if (fs.existsSync(PUBLISHED_FILE)) {
    published = JSON.parse(fs.readFileSync(PUBLISHED_FILE, "utf8"));
  }

  // Get remaining topics
  let remaining = topicsYaml.topics.filter(t => !published.published.includes(t));

  // 🔄 If none left, reset published.json
  if (remaining.length === 0) {
    console.log("⚠️ All topics have been published. Resetting published list.");
    published = { published: [] };
    fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(published, null, 2));
    remaining = topicsYaml.topics;
  }

  // Return the first available topic
  return remaining[0];
}

export function markTopicPublished(topic: string): void {
  const published = fs.existsSync(PUBLISHED_FILE)
    ? JSON.parse(fs.readFileSync(PUBLISHED_FILE, "utf8"))
    : { published: [] as string[] };

  published.published.push(topic);
  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(published, null, 2));
}
