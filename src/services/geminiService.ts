import { GoogleGenAI } from "@google/genai";
import { Capacitor } from "@capacitor/core";

const API_BASE = Capacitor.isNativePlatform() ? "https://zenith-ai-mu.vercel.app" : "";
const apiKey = process.env.GEMINI_API_KEY || "";

export type GeminiModel = "gemini-3.5-flash" | "gemini-3.1-pro-preview";

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: MessagePart[];
}

export async function* sendMessageStream(
  message: string, 
  history: ChatHistoryItem[] = [], 
  model: GeminiModel = "gemini-3.5-flash",
  files?: { mimeType: string, data: string }[],
  adminInstruction?: string,
  bypassSafety?: boolean,
  useSearch?: boolean
) {
  try {
    const contents: any[] = history.length > 0 ? [...history] : [];
    
    const currentParts: MessagePart[] = [{ text: message }];
    if (files && files.length > 0) {
      files.forEach(f => {
        currentParts.push({
          inlineData: {
            mimeType: f.mimeType,
            data: f.data,
          }
        });
      });
    }
    
    contents.push({ role: 'user', parts: currentParts });

    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        contents,
        useSearch,
        config: {
          systemInstruction: adminInstruction || "Tên bạn là Zenith Intelligence. Bạn là một trợ lý AI cao cấp, chuyên gia trong lĩnh vực phân tích kinh doanh, kỹ thuật phần mềm và chiến lược sáng tạo. \n\nHướng dẫn:\n- Định dạng: Luôn sử dụng Markdown hoàn hảo (in đậm để nhấn mạnh, tiêu đề rõ ràng, danh sách lồng nhau và bảng dữ liệu sạch sẽ).\n- Ngôn ngữ: Luôn trả lời bằng ngôn ngữ của người dùng (Tiếng Việt hoặc Tiếng Anh) với tông giọng chuyên nghiệp, thông thái.\n- Phân tích hình ảnh & tài liệu: Nếu có hình ảnh, video hoặc tài liệu (PDF), hãy phân tích kỹ thuật, nội dung hoặc dữ liệu chuyên sâu.\n- Mã nguồn: Cung cấp các đoạn mã sẵn sàng cho sản xuất và có chú thích đầy đủ.",
          safetySettings: bypassSafety ? [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ] : undefined
        }
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to connect to AI server";
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If not JSON, clean up html tags or use the truncated raw text
          const bodyMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          errorMessage = bodyMatch ? bodyMatch[1].replace(/<[^>]*>/g, '').trim() : text.slice(0, 150).trim() || errorMessage;
        }
      } catch {
        errorMessage = `HTTP error ${response.status} (${response.statusText})`;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error("No reader available");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") return;
          
          let data: any;
          try {
            data = JSON.parse(dataStr);
          } catch (jsonErr) {
            console.error("Error parsing SSE JSON data:", jsonErr);
            continue;
          }

          if (data && data.error) {
            let errorMsg = data.error;
            try {
              const nested = JSON.parse(data.error);
              if (nested?.error?.message) {
                errorMsg = nested.error.message;
              }
            } catch {
              // Not nested JSON, use original error string
            }
            throw new Error(errorMsg);
          }

          if (data && (data.text || data.grounding)) {
            yield data;
          }
        }
      }
    }
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    throw error;
  }
}
