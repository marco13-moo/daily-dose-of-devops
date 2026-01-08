// Force Node.js runtime
export const config = {
  runtime: "nodejs",
};

// Hugging Face Router endpoint
const HF_MODEL = "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export default async function handler(req, res) {
  try {
    // 1️⃣ Ensure API token exists
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "HUGGINGFACE_API_TOKEN not set" });
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

    // 3️⃣ Call Hugging Face Router
    const response = await fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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

    // 4️⃣ Parse the JSON safely
    let data;
    try {
      data = await response.json();
    } catch (err) {
      const text = await response.text(); // log raw response
      console.error("Router response not JSON:", text);
      return res.status(500).json({ success: false, rawText: text });
    }

    // 5️⃣ Check for generated_text
    if (Array.isArray(data) && data[0]?.generated_text) {
      return res.status(200).json({
        success: true,
        generatedPreview: data[0].generated_text.substring(0, 500),
        fullLength: data[0].generated_text.length,
      });
    }

    // 6️⃣ If model is loading or error
    return res.status(500).json({
      success: false,
      message: "Hugging Face Router did not return generated text",
      rawResponse: data,
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
