export const config = { runtime: "nodejs" };

const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const HASHNODE_GQL = "https://gql.hashnode.com";

/* -------------------------------------------------
   Core: Generate Blog (SAFE for Vercel & CI)
-------------------------------------------------- */

async function generateBlog(): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN not set");
  }

  const response = await fetch(HF_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "HuggingFaceTB/SmolLM3-3B",
      messages: [
        {
          role: "system",
          content: "You are a senior DevOps engineer and technical writer.",
        },
        {
          role: "user",
          content: `
Write a short DevOps blog post for "Daily Dose of DevOps".
Topic: CI/CD fundamentals.
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

  if (!output) {
    console.error(JSON.stringify(data, null, 2));
    throw new Error("Hugging Face returned no content");
  }

  return output;
}

/* -------------------------------------------------
   Core: Publish to Hashnode (CI ONLY)
-------------------------------------------------- */

async function publishToHashnode(markdown: string): Promise<string> {
  const token = process.env.HASHNODE_API_TOKEN;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;

  if (!token || !publicationId) {
    throw new Error("Hashnode secrets not set");
  }

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
            post {
              id
              title
              url
            }
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
            { name: "Automation", slug: "automation" }
          ]
        }
      }
    }),
  });

  const result = await response.json();
  const url = result?.data?.publishPost?.post?.url;

  if (!url) {
    console.error(JSON.stringify(result, null, 2));
    throw new Error("Failed to publish to Hashnode");
  }

  return url;
}

/* -------------------------------------------------
   Orchestrator
-------------------------------------------------- */

async function generateAndPublish() {
  console.log("📝 Generating blog...");
  const markdown = await generateBlog();

  // IMPORTANT:
  // Only publish when running inside GitHub Actions
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log("🚀 Publishing to Hashnode...");
    const url = await publishToHashnode(markdown);
    return { markdown, url };
  }

  // Vercel: generation only
  return { markdown };
}

/* -------------------------------------------------
   Vercel API Handler (SAFE)
-------------------------------------------------- */

export default async function handler(req, res) {
  try {
    const result = await generateAndPublish();

    return res.status(200).json({
      success: true,
      preview: result.markdown.substring(0, 500),
      published: Boolean(result.url),
      url: result.url ?? null,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/* -------------------------------------------------
   GitHub Actions Entrypoint
-------------------------------------------------- */

if (process.env.GITHUB_ACTIONS === "true") {
  generateAndPublish()
    .then((result) => {
      console.log("✅ Blog published:", result.url);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Pipeline failed:", err);
      process.exit(1);
    });
}
