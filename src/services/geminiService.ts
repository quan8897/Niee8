export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export async function generateAIResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', message, history }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.text || "Xin lỗi, tôi đang phải chuẩn bị một vài bộ trang phục mới nên chưa thể trả lời ngay.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Kết nối AI Stylist đang gián đoạn, bạn thử lại sau nha!";
  }
}

export async function generateOutfitSuggestions(productName: string, productCategory: string, otherProducts: { id: string, name: string }[]): Promise<string[]> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'outfit', productName, productCategory, otherProducts }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const text = data.text || "[]";
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Outfit Suggestion Error:", error);
    return [];
  }
}

export async function generateInstagramCaption(productName: string): Promise<string> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'caption', productName }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("Gemini Instagram Caption Error:", error);
    throw error;
  }
}
