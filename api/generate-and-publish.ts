import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getFallbackPost } from "./private-fallback-posts.js";
import { getCurrentCategory, getNextTopicForNow, markTopicPublished } from "./topic-rotator.js";

const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const DEV_ARTICLES_ENDPOINT = "https://dev.to/api/articles";
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
              "You are a senior platform engineer, SRE, and technical writer. Produce hard-edged, enterprise-level DevOps writing that is precise, actionable, and grounded in operational reality.",
          },
          {
            role: "user",
            content: `Write an opinionated, hard-edged enterprise DevOps and platform engineering article for experienced engineers and engineering leaders.\n\nTopic: ${topic}\n\nRequirements:\n- Lead with a concrete operational problem, trade-off, or failure mode.\n- Focus on enterprise realities: large teams, governance, reliability, security, and platform trade-offs.\n- Discuss anti-patterns, failure modes, and operational risk.\n- Use confident, technically precise prose.\n- Include a realistic configuration snippet or workflow example when useful.\n- Add sections for \"## Trade-offs\", \"## What teams get wrong\", and \"## Key Takeaways\".\n- Do not use fluff, generic summary language, or shallow advice.\n- Finish the article completely without truncation.`,
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

export async function publishToDev(markdown: string, topic: string): Promise<string> {
  const token = process.env.DEV_API_KEY;
  if (!token) throw new Error("DEV_API_KEY not set");

  const response = await fetch(DEV_ARTICLES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": token,
    },
    body: JSON.stringify({
      article: {
          title: `Daily Dose of DevOps — ${topic}`,
          body_markdown: markdown,
          published: true,
          tags: "devops, cicd, automation, cloud",
      },
    }),
  });

  const responseBody = await response.text();
  let result: { url?: string; error?: string; status?: number };
  try {
    result = JSON.parse(responseBody) as typeof result;
  } catch {
    throw new Error(
      `DEV returned non-JSON (HTTP ${response.status}): ${responseBody.slice(0, 500)}`,
    );
  }

  if (!response.ok || !result.url) {
    throw new Error(`DEV publish failed (HTTP ${response.status}): ${JSON.stringify(result).slice(0, 1000)}`);
  }

  return result.url;
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

export async function generateAndPublish(
  topic = getNextTopicForNow(),
  category = process.env.TOPIC_CATEGORY ?? getCurrentCategory(),
): Promise<PublishResult> {
  let markdown: string;
  let fallback = false;
  let fallbackReason: string | undefined;

  try {
    markdown = await generateBlog(topic);
  } catch (error) {
    fallback = true;
    fallbackReason = (error as Error).message;
    try {
      markdown = getFallbackPost(topic);
    } catch {
      throw new Error(`Generation unavailable and no unique fallback exists for "${topic}": ${fallbackReason}`);
    }
    console.warn(`Generation unavailable; using private fallback post: ${fallbackReason}`);
  }

  const url = await publishToDev(markdown, topic);
  markTopicPublished(topic, category);
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
  const category = process.env.TOPIC_CATEGORY ?? getCurrentCategory();
  const topic = getNextTopicForNow();
  console.log("Selected category:", category);
  console.log("Selected topic:", topic);
  let markdown: string;
  let fallback = false;
  try {
    markdown = await generateBlog(topic);
  } catch (error) {
    fallback = true;
    const fallbackReason = (error as Error).message;
    try {
      markdown = getFallbackPost(topic);
    } catch {
      throw new Error(`Generation unavailable and no unique fallback exists for "${topic}": ${fallbackReason}`);
    }
    console.warn("Generation unavailable; storing private fallback:", fallbackReason);
  }

  const localPost = await saveLocalPost(topic, markdown);
  console.log("Saved post:", localPost);

  const url = await publishToDev(markdown, topic);
  console.log(fallback ? "Published private fallback:" : "Published generated post:", url);
  markTopicPublished(topic, category);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
  });
}
