import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Note: In AI Studio Build, process.env.GEMINI_API_KEY is automatically injected
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = "Bạn là Stylist của NIEE8. Trả lời cực kỳ ngắn gọn (dưới 50 chữ). Tư vấn size và 1 item phối kèm nếu cần. Bảng size: S(eo 62-65), M(eo 66-69), L(eo 70-73), XL(eo 74-77).";

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export async function generateAIResponse(message: string, history: ChatMessage[] = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const chatHistory = history.map(msg => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `SYSTEM INSTRUCTION: ${SYSTEM_INSTRUCTION}` }] },
        ...chatHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateOutfitSuggestions(productName: string, productCategory: string, otherProducts: { id: string, name: string }[]) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const prompt = `Dựa trên sản phẩm "${productName}" (${productCategory}), hãy chọn tối đa 2 ID sản phẩm phối hợp tốt nhất từ danh sách này: ${otherProducts.map(p => `${p.id}:${p.name}`).join(', ')}. CHỈ trả về mảng JSON ID, ví dụ ["id1", "id2"].`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Outfit Suggestion Error:", error);
    return [];
  }
}

export async function generateInstagramCaption(productName: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  try {
    const prompt = `Viết một caption Instagram thu hút cho sản phẩm "${productName}". Phong cách: Tối giản, lãng mạn, sang trọng. Bao gồm cả hashtag phù hợp.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Instagram Caption Error:", error);
    throw error;
  }
}
