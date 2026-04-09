import { NextRequest, NextResponse } from 'next/server';

const MAX_HISTORY = 6;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, message, history, productName, productCategory, otherProducts } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key chưa được cấu hình trên Server' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    let requestBody: Record<string, unknown> = {};

    if (action === 'chat') {
      // Sliding window: chỉ giữ 6 tin nhắn gần nhất để tiết kiệm token
      const trimmedHistory = Array.isArray(history) && history.length > MAX_HISTORY
        ? history.slice(-MAX_HISTORY)
        : (history || []);

      const contents = trimmedHistory.map((msg: { role: string; text: string }) => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      requestBody = {
        systemInstruction: {
          parts: [{
            text: `Bạn là niee8 AI Stylist — chuyên gia phối đồ tận tâm, tinh tế. Xưng "mình" và "bạn". Phong cách: THANH LỊCH, HIỆN ĐẠI, GỌN GÀNG. Bảng size NIEE8: S(eo 62-65, <48kg, <158cm), M(eo 66-69, 49-54kg, 159-162cm), L(eo 70-73, 55-60kg, 163-168cm), XL(eo 74-77, >60kg). Trả lời dưới 60 chữ, không dài dòng.`
          }]
        },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
      };
    } else if (action === 'outfit') {
      const prompt = `Dựa trên sản phẩm "${productName}" (${productCategory}), chọn tối đa 2 ID phối hợp từ: ${(otherProducts || []).map((p: { id: string; name: string }) => `${p.id}:${p.name}`).join(', ')}. CHỈ trả về mảng JSON ID, ví dụ ["id1","id2"].`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      };
    } else if (action === 'caption') {
      const prompt = `Viết caption Instagram thu hút cho sản phẩm "${productName}". Phong cách: Tối giản, lãng mạn, sang trọng. Bao gồm hashtag phù hợp. Không dùng quá nhiều emoji.`;
      requestBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ text });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    console.error('[AI API Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
