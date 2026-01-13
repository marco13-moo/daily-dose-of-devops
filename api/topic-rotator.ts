import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const TOPICS_FILE = path.join(process.cwd(), "content/topics.yaml");
const PUBLISHED_FILE = path.join(process.cwd(), "content/published.json");

type TopicsYaml = { topics: string[] };
type PublishedJson = { published: string[] };

export function getNextTopic(): string {
  const topicsYaml = yaml.load(
    fs.readFileSync(TOPICS_FILE, "utf8")
  ) as TopicsYaml;

  const published: PublishedJson = JSON.parse(
    fs.readFileSync(PUBLISHED_FILE, "utf8")
  );

  const remaining = topicsYaml.topics.filter(
    (t) => !published.published.includes(t)
  );

  if (remaining.length === 0) {
    throw new Error("All topics have been published");
  }

  return remaining[0]; // deterministic > random
}

export function markTopicPublished(topic: string) {
  const published: PublishedJson = JSON.parse(
    fs.readFileSync(PUBLISHED_FILE, "utf8")
  );

  published.published.push(topic);

  fs.writeFileSync(
    PUBLISHED_FILE,
    JSON.stringify(published, null, 2)
  );
}
