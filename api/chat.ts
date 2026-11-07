import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { model, contents, config, useSearch } = req.body;

  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_BACKUP
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    return res.status(500).json({ error: "No Gemini API keys found in environment variables." });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let currentKeyIndex = 0;
  let success = false;

  while (currentKeyIndex < keys.length && !success) {
    const apiKey = keys[currentKeyIndex];
    try {
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const finalConfig = { ...config };
      if (useSearch) {
        finalConfig.tools = [{ googleSearch: {} }];
      }

      const stream = await ai.models.generateContentStream({
        model: model || "gemini-3.5-flash",
        contents: contents,
        config: finalConfig
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        const grounding = chunk.candidates?.[0]?.groundingMetadata;
        if (grounding) {
          res.write(`data: ${JSON.stringify({ grounding })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      success = true;
    } catch (error: any) {
      console.error(`Vercel API Error:`, error.message);
      
      const isQuotaError = error.message?.includes("RESOURCE_EXHAUSTED") || 
                           error.status === 429 ||
                           error.message?.includes("quota");

      if (isQuotaError && currentKeyIndex < keys.length - 1) {
        console.log("Switching to next API key...");
        currentKeyIndex++;
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message || "Unknown error" })}\n\n`);
        res.end();
        break;
      }
    }
  }
}
