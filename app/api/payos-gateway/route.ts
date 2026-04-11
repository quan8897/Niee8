import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ status: "ok", message: "API Gateway is alive" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Bóc tách dữ liệu
    const orderId = body.orderId || 'ORD' + Date.now();
    const amount = Math.round(Number(body.amount) || 2000);
    const description = String(body.description || 'Nie8 Payment').slice(0, 25);
    const items = Array.isArray(body.items) ? body.items : [];
    const returnUrl = body.returnUrl || '';
    const cancelUrl = body.cancelUrl || '';

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      return NextResponse.json({ error: 'PayOS Keys missing in Environment Variables' }, { status: 500 });
    }

    const orderCode = Number(String(Date.now()).slice(-7));

    const mappedItems = items.map((item: any) => ({
      name: String(item.name || 'Sản phẩm').slice(0, 50),
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Math.round(Number(item.price)) || 0)
    }));

    const itemsTotal = mappedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    if (amount > itemsTotal) {
      mappedItems.push({ name: 'Phí vận chuyển', quantity: 1, price: amount - itemsTotal });
    } else if (amount < itemsTotal) {
      mappedItems.push({ name: 'Chiết khấu', quantity: 1, price: amount - itemsTotal });
    }

    const payosPayload = {
      orderCode,
      amount,
      description,
      items: mappedItems,
      returnUrl,
      cancelUrl
    };

    // Signature Alphabetical Order
    const signatureString = `amount=${payosPayload.amount}&cancelUrl=${payosPayload.cancelUrl}&description=${payosPayload.description}&orderCode=${payosPayload.orderCode}&returnUrl=${payosPayload.returnUrl}`;
    const signature = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');

    const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ ...payosPayload, signature }),
    });

    const resData = await response.json();

    if (!response.ok || resData.code !== '00') {
      return NextResponse.json({ 
        error: `PayOS Error: ${resData.desc || resData.message || 'Unknown'}`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: resData.data.checkoutUrl
    });

  } catch (err: any) {
    return NextResponse.json({ error: `Critical Error: ${err.message}` }, { status: 500 });
  }
}
