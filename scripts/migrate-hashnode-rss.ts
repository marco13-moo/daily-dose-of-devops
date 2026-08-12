import { readFile } from "node:fs/promises";

const HASHNODE_RSS = "https://daily-dose-of-devops.hashnode.dev/rss.xml";
const HASHNODE_ARCHIVE = "content/import/hashnode-rss.xml";
const DEV_ARTICLES = "https://dev.to/api/articles";

export type HashnodePost = {
  title: string;
  canonicalUrl: string;
  bodyHtml: string;
  tags: string[];
};

function unwrapCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function field(item: string, name: string): string {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`));
  return match ? unwrapCdata(match[1]) : "";
}

export function parseHashnodeRss(xml: string): HashnodePost[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    const tags = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)]
      .map((category) => unwrapCdata(category[1]).toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
      .slice(0, 4);

    return {
      title: field(item, "title"),
      canonicalUrl: field(item, "link"),
      bodyHtml: field(item, "content:encoded").replace(/^(?:\s*<p><\/p>)+/, "").trim(),
      tags: [...new Set(["devops", ...tags])].slice(0, 4),
    };
  });
}

async function getExistingCanonicalUrls(apiKey: string): Promise<Set<string>> {
  const response = await fetch(`${DEV_ARTICLES}/me/all?per_page=1000`, {
    headers: { Accept: "application/json", "api-key": apiKey },
  });
  if (!response.ok) throw new Error(`Unable to list DEV articles (HTTP ${response.status})`);
  const articles = (await response.json()) as Array<{ canonical_url?: string }>;
  return new Set(articles.map((article) => article.canonical_url).filter((url): url is string => Boolean(url)));
}

async function publishPost(apiKey: string, post: HashnodePost, published: boolean): Promise<string> {
  const response = await fetch(DEV_ARTICLES, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": apiKey },
    body: JSON.stringify({
      article: {
        title: post.title,
        body_markdown: post.bodyHtml,
        published,
        canonical_url: post.canonicalUrl,
        tags: post.tags.join(", "),
      },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(`DEV import failed for ${post.canonicalUrl} (HTTP ${response.status}): ${JSON.stringify(body)}`);
  }
  return body.url;
}

async function main(): Promise<void> {
  const apiKey = process.env.DEV_API_KEY;
  if (!apiKey) throw new Error("DEV_API_KEY not set");
  const publish = process.env.DEV_MIGRATION_PUBLISH === "true";

  const xml = await readFile(HASHNODE_ARCHIVE, "utf8").catch(async () => {
    const feedResponse = await fetch(HASHNODE_RSS);
    if (!feedResponse.ok) throw new Error(`Unable to fetch Hashnode RSS (HTTP ${feedResponse.status})`);
    return feedResponse.text();
  });
  const posts = parseHashnodeRss(xml);
  const existing = await getExistingCanonicalUrls(apiKey);

  console.log(`Found ${posts.length} RSS posts; importing as ${publish ? "published articles" : "drafts"}.`);
  for (const post of posts.reverse()) {
    if (existing.has(post.canonicalUrl)) {
      console.log("Skipping existing:", post.canonicalUrl);
      continue;
    }
    const url = await publishPost(apiKey, post, publish);
    console.log("Imported:", url);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

const isCli = process.argv[1]?.endsWith("migrate-hashnode-rss.js");
if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
