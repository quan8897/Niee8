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
        { error: 'PayOS Keys missing in Vercel. Please check env variables.' },
        { status: 500 }
      );
    }

    const orderCode = Number(String(Date.now()).slice(-7)); // Rút ngắn lại cho an toàn

    const mappedItems = (items as any[]).map(item => ({
      name: String(item.name).slice(0, 50),
      quantity: Number(item.quantity) || 1,
      price: Math.round(Number(item.price))
    }));

    // Tính tổng tiền từ danh sách items
    const itemsTotal = mappedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Nếu có phí ship (amount > itemsTotal)
    if (Number(amount) > itemsTotal) {
      mappedItems.push({
        name: 'Phí vận chuyển',
        quantity: 1,
        price: Number(amount) - itemsTotal
      });
    } 
    // Nếu có giảm giá (amount < itemsTotal)
    else if (Number(amount) < itemsTotal) {
      mappedItems.push({
        name: 'Giảm giá / Voucher',
        quantity: 1,
        price: Number(amount) - itemsTotal // Giá trị âm
      });
    }

    const payosPayload = {
      orderCode: orderCode,
      amount: Number(amount),
      description: String(description || `NIE8 ${orderCode}`).slice(0, 25),
      items: mappedItems,
      returnUrl: String(returnUrl),
      cancelUrl: String(cancelUrl)
    };

    // Signature theo Alphabet: amount, cancelUrl, description, orderCode, returnUrl
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
      return NextResponse.json({ error: data.desc || data.message || 'PayOS Gateway Error' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: data.data.checkoutUrl,
      orderCode
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
