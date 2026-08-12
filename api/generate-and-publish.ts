import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getFallbackPost } from "./private-fallback-posts.js";
import { getNextTopic, markTopicPublished } from "./topic-rotator.js";

const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const HASHNODE_GQL = "https://gql.hashnode.com";
const DEFAULT_HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";

type ApiRequest = { method?: string };
type ApiResponse = {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

type PublishResult = {
  fallback: boolean;
  fallbackReason?: string;
  topic: string;
  url: string;
};

type HashnodeGraphqlResponse = {
  data?: { publishPost?: { post?: { url?: string } } };
  errors?: unknown;
};

export async function generateBlog(topic: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) throw new Error("HUGGINGFACE_API_TOKEN not set");

  let response: Response;
  try {
    response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.HUGGINGFACE_MODEL || DEFAULT_HF_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a principal DevOps researcher and technical writer. Be rigorous, precise, and operationally useful.",
          },
          {
            role: "user",
            content: `Write an advanced DevOps article for \"Daily Dose of DevOps\".\nTopic: ${topic}\nUse Markdown, explain failure modes and trade-offs, include a technically correct example, and finish with a \"## Key Takeaways\" section. Complete the article without truncation.`,
          },
        ],
        max_tokens: 2200,
        temperature: 0.55,
      }),
    });
  } catch (error) {
    throw new Error(`Failed to reach Hugging Face endpoint: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`Hugging Face API returned HTTP ${response.status}: ${detail}`);
  }

  const data = (await response.json().catch(() => {
    throw new Error("Failed to parse Hugging Face response as JSON");
  })) as { choices?: Array<{ message?: { content?: string } }> };
  const output = data.choices?.[0]?.message?.content?.trim();

  if (!output) throw new Error("Hugging Face returned empty content");
  if (!output.includes("## Key Takeaways")) {
    throw new Error("Generated blog appears truncated (missing 'Key Takeaways')");
  }

  return output;
}

export async function publishToHashnode(markdown: string, topic: string): Promise<string> {
  const token = process.env.HASHNODE_API_TOKEN;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;
  if (!token || !publicationId) throw new Error("Hashnode secrets not set");

  const response = await fetch(HASHNODE_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) { post { url } }
      }`,
      variables: {
        input: {
          title: `Daily Dose of DevOps — ${topic}`,
          contentMarkdown: markdown,
          publicationId,
        },
      },
    }),
  });

  const responseBody = await response.text();
  let result: HashnodeGraphqlResponse;
  try {
    result = JSON.parse(responseBody) as HashnodeGraphqlResponse;
  } catch {
    throw new Error(
      `Hashnode returned non-JSON (HTTP ${response.status}): ${responseBody.slice(0, 500)}`,
    );
  }

  const url = result.data?.publishPost?.post?.url;

  if (!response.ok || !url) {
    const detail = result.errors
      ? JSON.stringify(result.errors).slice(0, 1000)
      : JSON.stringify(result).slice(0, 1000);
    throw new Error(`Hashnode publish failed (HTTP ${response.status}): ${detail}`);
  }

  return url;
}

async function saveLocalPost(topic: string, markdown: string): Promise<string> {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  const outputDirectory = path.join("content", "generated");
  const outputPath = path.join(outputDirectory, `${date}-${slug}.md`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `# Daily Dose of DevOps — ${topic}\n\n${markdown}\n`);

  return outputPath;
}

export async function generateAndPublish(topic = getNextTopic()): Promise<PublishResult> {
  let markdown: string;
  let fallback = false;
  let fallbackReason: string | undefined;

  try {
    markdown = await generateBlog(topic);
  } catch (error) {
    fallback = true;
    fallbackReason = (error as Error).message;
    markdown = getFallbackPost(topic);
    console.warn(`Generation unavailable; using private fallback post: ${fallbackReason}`);
  }

  const url = await publishToHashnode(markdown, topic);
  return { fallback, fallbackReason, topic, url };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await generateAndPublish();
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("Publish failed:", error);
    res.status(502).json({ ok: false, error: "Unable to publish the blog post" });
  }
}

async function main(): Promise<void> {
  const topic = getNextTopic();
  console.log("Selected topic:", topic);
  let markdown: string;
  let fallback = false;
  try {
    markdown = await generateBlog(topic);
  } catch (error) {
    fallback = true;
    markdown = getFallbackPost(topic);
    console.warn("Generation unavailable; storing private fallback:", (error as Error).message);
  }

  const localPost = await saveLocalPost(topic, markdown);
  console.log("Saved post:", localPost);

  const url = await publishToHashnode(markdown, topic);
  console.log(fallback ? "Published private fallback:" : "Published generated post:", url);
  markTopicPublished(topic);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
  });
}
