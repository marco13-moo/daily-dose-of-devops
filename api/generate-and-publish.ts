import fetch from "node-fetch";

const HF_MODEL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export default async function handler(req, res) {
  try {
    const prompt = `
Write a short DevOps blog post about CI/CD.
Use markdown.
End with key takeaways.
`;

    const response = await fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 400 },
      }),
    });

    const data = await response.json();

    res.status(200).json({
      success: true,
      preview: data[0].generated_text.substring(0, 500),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
