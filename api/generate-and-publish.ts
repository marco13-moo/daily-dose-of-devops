export const config = { runtime: "nodejs" };

const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

export default async function handler(req, res) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "HUGGINGFACE_API_TOKEN not set" });
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
            content:
              "You are a senior DevOps engineer and technical writer.",
          },
          {
            role: "user",
            content: `
Write a short DevOps blog post for "Daily Dose of DevOps".
Topic: CI/CD fundamentals.
Use markdown, include a short code snippet if relevant, and end with Key Takeaways.
`,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    const output =
      data?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(500).json({
        success: false,
        message: "No text returned",
        rawResponse: data,
      });
    }

    return res.status(200).json({
      success: true,
      generatedPreview: output.substring(0, 500),
      fullText: output,
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
