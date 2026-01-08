export const config = { runtime: "nodejs" };

const HF_MODEL = "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export default async function handler(req, res) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) return res.status(500).json({ error: "HUGGINGFACE_API_TOKEN not set" });

    const prompt = `
Write a short DevOps blog post for "Daily Dose of DevOps".
Topic: CI/CD fundamentals
Use markdown
Include a short code snippet
End with Key Takeaways
`;

    const response = await fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        input: prompt,
        parameters: { max_new_tokens: 400, temperature: 0.7 }
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).json({ success: false, rawText: text }); }

    if (data?.generated_text) {
      return res.status(200).json({
        success: true,
        generatedPreview: data.generated_text.substring(0, 500),
        fullLength: data.generated_text.length
      });
    }

    return res.status(500).json({
      success: false,
      message: "Hugging Face Router did not return generated text",
      rawResponse: data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
