import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PayOSItem {
  name: string;
  quantity: number;
  price: number;
}

function createHmacSignature(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, amount, description, items, returnUrl, cancelUrl } = body;

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return NextResponse.json(
        { error: 'PayOS chưa được cấu hình. Vui lòng thêm PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY vào Vercel.' },
        { status: 500 }
      );
    }

    // PayOS yêu cầu orderCode là số nguyên dương
    // Dùng hash 6 chữ số từ orderId string để tránh trùng lặp
    const orderCode = Math.abs(
      parseInt(
        crypto.createHash('md5').update(orderId).digest('hex').slice(0, 8),
        16
      )
    ) % 999999 + 1;

    const payosPayload = {
      orderCode,
      amount: Math.max(2000, Math.round(amount)), // Tối thiểu 2000đ theo giới hạn PayOS
      description: (description || `NIE8-${orderCode}`).slice(0, 25), // PayOS giới hạn 25 ký tự
      items: (items as PayOSItem[]).map(item => ({
        name: item.name.slice(0, 50),
        quantity: item.quantity,
        price: Math.round(item.price),
      })),
      returnUrl,
      cancelUrl,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // Hết hạn 15 phút
    };

    // Tạo chữ ký HMAC-SHA256 theo đúng quy định của PayOS: Sắp xếp theo alphabet
    // amount, cancelUrl, description, orderCode, returnUrl
    const signatureString = `amount=${payosPayload.amount}&cancelUrl=${payosPayload.cancelUrl}&description=${payosPayload.description}&orderCode=${payosPayload.orderCode}&returnUrl=${payosPayload.returnUrl}`;
    const signature = createHmacSignature(signatureString, checksumKey);

    console.log('[PayOS] Sending payload with signature:', { ...payosPayload, signature });

    const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ ...payosPayload, signature }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== '00') {
      console.error('[PayOS Error]', data);
      throw new Error(data.desc || data.message || `PayOS error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: data.data.checkoutUrl,
      paymentLinkId: data.data.paymentLinkId,
      orderCode,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi tạo link thanh toán';
    console.error('[Create Payment Link Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
