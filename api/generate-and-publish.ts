// Force Node.js runtime
export const config = { runtime: "nodejs" };

// Router predictions endpoint
const HF_PREDICTIONS = "https://router.huggingface.co/api/predictions";

export default async function handler(req, res) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "HUGGINGFACE_API_TOKEN not set" });
    }

    const prompt = `
You are a senior DevOps engineer and technical writer.
Write a short DevOps blog post for "Daily Dose of DevOps".
Topic: CI/CD fundamentals.
Use markdown, include a short code snippet if relevant, and end with Key Takeaways.
`;

    const response = await fetch(HF_PREDICTIONS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "HuggingFaceTB/SmolLM3-3B",
        input: prompt,
        parameters: { max_new_tokens: 400, temperature: 0.7 },
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ success: false, rawText: text });
    }

    // Check for successful prediction
    if (data?.status === "succeeded" && typeof data.output === "string") {
      return res.status(200).json({
        success: true,
        generatedPreview: data.output.substring(0, 500),
        fullText: data.output,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Model did not return text",
      rawResponse: data,
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
