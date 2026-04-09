export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await request.json();
    const { action, message, history, productName, productCategory, otherProducts } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key missing' }), { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    let requestBody: any = {};

    if (action === 'chat') {
      const maxHistoryCount = 6;
      const trimmedHistory = history && history.length > maxHistoryCount 
        ? history.slice(history.length - maxHistoryCount) 
        : (history || []);
        
      const contents = trimmedHistory.map((msg: any) => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const systemInstruction = "Bạn là Stylist của NIEE8. Trả lời cực kỳ ngắn gọn (dưới 50 chữ). Tư vấn size và 1 item phối kèm nếu cần. Bảng size: S(eo 62-65), M(eo 66-69), L(eo 70-73), XL(eo 74-77).";
      requestBody = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
      };

    } else if (action === 'outfit') {
      const prompt = `Dựa trên sản phẩm "${productName}" (${productCategory}), hãy chọn tối đa 2 ID sản phẩm phối hợp tốt nhất từ danh sách này: ${otherProducts.map((p:any) => `${p.id}:${p.name}`).join(', ')}. CHỈ trả về mảng JSON ID, ví dụ ["id1", "id2"].`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };

    } else if (action === 'caption') {
      const prompt = `Viết một caption Instagram thu hút cho sản phẩm "${productName}". Phong cách: Tối giản, lãng mạn, sang trọng. Bao gồm cả hashtag phù hợp. Không dùng quá nhiều emoji.`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      };
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return new Response(JSON.stringify({ text: aiText }), { status: 200 });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
