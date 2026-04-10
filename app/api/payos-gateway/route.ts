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
      return NextResponse.json({ error: 'PayOS Keys missing' }, { status: 500 });
    }

    // Luôn chọn orderCode là số nguyên duy nhất
    const orderCode = Number(String(Date.now()).slice(-6)); 

    const mappedItems = (items as any[]).map(item => ({
      name: String(item.name || 'Sản phẩm').slice(0, 50),
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Math.round(Number(item.price)) || 0)
    }));

    const itemsTotal = mappedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalAmount = Number(amount);

    // Bù trừ phí ship/giảm giá vào items để PayOS chấp nhận (Phải khớp 100%)
    if (finalAmount > itemsTotal) {
      mappedItems.push({ name: 'Phí vận chuyển', quantity: 1, price: finalAmount - itemsTotal });
    } else if (finalAmount < itemsTotal) {
      mappedItems.push({ name: 'Giảm giá', quantity: 1, price: finalAmount - itemsTotal });
    }

    const payosPayload: any = {
      orderCode,
      amount: finalAmount,
      description: String(description || `NIE8 ${orderCode}`).slice(0, 25),
      items: mappedItems,
      returnUrl,
      cancelUrl
    };

    // Alphabetical sort for signature
    const signatureString = `amount=${payosPayload.amount}&cancelUrl=${payosPayload.cancelUrl}&description=${payosPayload.description}&orderCode=${payosPayload.orderCode}&returnUrl=${payosPayload.returnUrl}`;
    const signature = createHmacSignature(signatureString, checksumKey);

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
      return NextResponse.json({ 
        error: `PayOS Error: ${data.desc || data.message || 'Unknown'}`,
        debug: data
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: data.data.checkoutUrl,
      orderCode
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
