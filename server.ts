import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post("/api/chat", async (req, res) => {
    const { model, contents, config, useSearch } = req.body;

    // Key rotation logic
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
          // Grounding metadata if available
          const grounding = chunk.candidates?.[0]?.groundingMetadata;
          if (grounding) {
            res.write(`data: ${JSON.stringify({ grounding })}\n\n`);
          }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        success = true;
      } catch (error: any) {
        console.error(`Error with key ${currentKeyIndex + 1}:`, error.message || error);
        
        const isTransientError = error.status === 429 || 
                                 error.status === 503 || 
                                 error.status === 500 ||
                                 error.message?.includes("RESOURCE_EXHAUSTED") || 
                                 error.message?.includes("quota") ||
                                 error.message?.includes("503") ||
                                 error.message?.includes("UNAVAILABLE") ||
                                 error.message?.includes("high demand") ||
                                 error.message?.includes("temporary") ||
                                 error.message?.includes("overloaded");

        if (currentKeyIndex < keys.length - 1) {
          console.log(`Key ${currentKeyIndex + 1} failed. Switching to next API key...`);
          currentKeyIndex++;
        } else {
          // If we are out of keys, send the final error representation
          res.write(`data: ${JSON.stringify({ error: error.message || "Unknown error" })}\n\n`);
          res.end();
          break;
        }
      }
    }
  });

  app.post("/api/analyze", (req, res) => {
    const { code, context } = req.body;
    
    console.log("Analyzing code for Zenith...");
    
    // Placeholder for Lua script execution
    // In a real scenario, you might run:
    // exec(`lua analyze.lua "${code}"`, (error, stdout, stderr) => { ... })
    
    // For now, returning a mock response simulating Lua analysis
    setTimeout(() => {
      res.json({
        success: true,
        analysis: "Lua Script analysis complete. No vulnerabilities found in Zenith core.",
        timestamp: new Date().toISOString(),
        received: { code, context }
      });
    }, 500);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", gateway: "Zenith API" });
  });

  // Endpoints phục vụ kiểm tra và đồng bộ liên tục với zenith-anti-hack.vercel.app
  app.get("/api/sync/status", (req, res) => {
    res.json({
      success: true,
      target: "https://zenith-anti-hack.vercel.app",
      databaseId: "ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38",
      projectId: "gen-lang-client-0697052905",
      syncMode: "continuous_realtime",
      serverTime: new Date().toISOString()
    });
  });

  app.get("/api/sync/ping-vercel", async (req, res) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch("https://zenith-anti-hack.vercel.app/", {
        method: "HEAD",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;
      return res.json({
        success: true,
        connected: resp.status < 500,
        status: resp.status,
        latencyMs,
        target: "https://zenith-anti-hack.vercel.app/",
        timestamp: Date.now()
      });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return res.json({
        success: false,
        connected: false,
        error: err.message || "Failed to reach Vercel app",
        latencyMs,
        target: "https://zenith-anti-hack.vercel.app/",
        timestamp: Date.now()
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zenith Server running on http://localhost:${PORT}`);
  });
}

startServer();
