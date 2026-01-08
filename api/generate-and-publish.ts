import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const HF_MODEL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export default async function handler(req, res) {
  try {
    const topic = getNextTopic();
    const prompt = buildPrompt(topic);
    const blog = await generateBlog(prompt);

    const filename = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .concat(".md");

    fs.writeFileSync(`docs/${filename}`, blog);
    markPublished(topic);

    res.status(200).json({ success: true, topic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildPrompt(topic: string) {
  const template = fs.readFileSync(
    path.join(process.cwd(), "prompts/devops-blog.prompt.md"),
    "utf8"
  );
  return template.replace("{{TOPIC}}", topic);
}

function getNextTopic() {
  const topics = fs
    .readFileSync("content/topics.yaml", "utf8")
    .split("\n")
    .filter((t) => t.trim().startsWith("-"))
    .map((t) => t.replace("-", "").trim());

  const published = JSON.parse(
    fs.readFileSync("content/published.json", "utf8")
  ).published;

  const next = topics.find((t) => !published.includes(t));
  if (!next) throw new Error("No topics left");

  return next;
}

function markPublished(topic: string) {
  const file = "content/published.json";
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.published.push(topic);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function generateBlog(prompt: string) {
  const response = await fetch(HF_MODEL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 1200 },
    }),
  });

  const data = await response.json();
  return data[0].generated_text;
}
