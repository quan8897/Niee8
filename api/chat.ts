export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { message, history } = body;

    // Secure API key retrieval directly from server environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'System API Key configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SLIDING WINDOW: Giới hạn token. Chỉ lấy system + 6 tin nhắn gần nhất
    const maxHistoryCount = 6;
    const trimmedHistory = history && history.length > maxHistoryCount 
      ? history.slice(history.length - maxHistoryCount) 
      : (history || []);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // Xây dựng nội dung gửi sang Google (system instruction ẩn danh)
    const contents = trimmedHistory.map((msg: any) => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const systemInstruction = "Bạn là AI Stylist của thương hiệu NIEE8. Trả lời cực kỳ ngắn gọn, thân thiện, và tư vấn chuẩn xác chiều cao cân nặng. Tư vấn size: S(<48kg, <158cm), M(<54kg, <162cm), L(<60kg, <168cm).";

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        }
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi đang phải đi uống một chút trà, quay lại sau nha!";

    return new Response(JSON.stringify({ text: aiText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('AI Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Lỗi server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
