import { getNextTopic } from "./topic-rotator.js";
const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const HASHNODE_GQL = "https://gql.hashnode.com";

/* ---------------------------
   Generate Blog
---------------------------- */
async function generateBlog(topic: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) throw new Error("HUGGINGFACE_API_TOKEN not set");

  const response = await fetch(HF_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "HuggingFaceTB/SmolLM3-3B",
      messages: [
        { role: "system", content: "You are a senior DevOps engineer and technical writer." },
        {
          role: "user",
          content: `
Write a short DevOps blog post for "Daily Dose of DevOps".
Topic: ${topic}
Use markdown, include a short code snippet if relevant,
and end with Key Takeaways.
`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const output = data?.choices?.[0]?.message?.content;
  if (!output) throw new Error("Hugging Face returned no content");

  return output;
}

/* ---------------------------
   Publish to Hashnode
---------------------------- */
async function publishToHashnode(markdown: string): Promise<string> {
  const token = process.env.HASHNODE_API_TOKEN;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;
  if (!token || !publicationId) throw new Error("Hashnode secrets not set");

  const response = await fetch(HASHNODE_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        mutation PublishPost($input: PublishPostInput!) {
          publishPost(input: $input) {
            post { url }
          }
        }
      `,
      variables: {
        input: {
          title: "Daily Dose of DevOps — CI/CD Fundamentals",
          contentMarkdown: markdown,
          publicationId,
          tags: [
            { name: "DevOps", slug: "devops" },
            { name: "CI/CD", slug: "cicd" },
            { name: "Automation", slug: "automation" },
          ],
        },
      },
    }),
  });

  const result = await response.json();
  const url = result?.data?.publishPost?.post?.url;
  if (!url) throw new Error("Failed to publish to Hashnode");

  return url;
}

/* ---------------------------
   Main
---------------------------- */
async function main() {
  const topic = getNextTopic();
  console.log("🧠 Selected topic:", topic);

  const markdown = await generateBlog(topic);

  const url = await publishToHashnode(markdown);

  markTopicPublished(topic);

  console.log("✅ Published:", url);
}


main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
