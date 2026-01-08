// ✅ Force Node.js runtime (not Edge)
export const config = {
  runtime: "nodejs",
};

const HF_MODEL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export default async function handler(req, res) {
  try {
    // 1️⃣ Validate environment variable
    if (!process.env.HUGGINGFACE_API_TOKEN) {
      return res.status(500).json({
        error: "HUGGINGFACE_API_TOKEN is not set in environment variables",
      });
    }

    // 2️⃣ Build prompt
    const prompt = `
You are a senior DevOps engineer and technical writer.

Write a short DevOps blog post for the series "Daily Dose of DevOps".

Topic: CI/CD fundamentals

Rules:
- Use markdown
- Explain clearly
- Include a short code snippet if relevant
- End with a "Key Takeaways" section
`;

    // 3️⃣ Call Hugging Face Inference API
    const hfResponse = await fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
        },
      }),
    });

    // 4️⃣ Parse response
    const data = await hfResponse.json();

    /**
     * Hugging Face can return:
     * - Array with generated_text
     * - Object with { error: "model loading" }
     * - Object with auth/rate-limit errors
     */

    // ✅ SUCCESS CASE
    if (Array.isArray(data) && data[0]?.generated_text) {
      return res.status(200).json({
        success: true,
        generatedPreview: data[0].generated_text.substring(0, 500),
        fullLength: data[0].generated_text.length,
      });
    }

    // ⏳ MODEL LOADING OR API ERROR
    return res.status(500).json({
      success: false,
      message: "Hugging Face did not return generated text",
      rawResponse: data,
    });
  } catch (error) {
    // 🔥 CATCH-ALL SAFETY NET
    console.error("Unhandled error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error",
    });
  }
}
