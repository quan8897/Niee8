export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

const API_BASE = '/api/ai';

export async function generateAIResponse(message: string, history: ChatMessage[] = []): Promise<string> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', message, history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || 'Xin lỗi, tôi không thể trả lời ngay lúc này.';
  } catch (error) {
    console.error('AI chat error:', error);
    return 'Kết nối AI Stylist đang gián đoạn, bạn thử lại sau nha!';
  }
}

export async function generateOutfitSuggestions(
  productName: string,
  productCategory: string,
  otherProducts: { id: string; name: string }[]
): Promise<string[]> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'outfit', productName, productCategory, otherProducts }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data.text || '[]';
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Outfit suggestions error:', error);
    return [];
  }
}

export async function generateInstagramCaption(productName: string): Promise<string> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'caption', productName }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.text || '';
  } catch (error) {
    console.error('Caption error:', error);
    throw error;
  }
}
