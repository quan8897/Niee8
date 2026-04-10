import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Bóc tách dữ liệu cực kỳ cẩn thận
    const orderId = String(body.orderId || 'ORD' + Date.now());
    const amount = Math.round(Number(body.amount) || 2000);
    const description = String(body.description || 'Thanh toán NIE8').slice(0, 25);
    const items = Array.isArray(body.items) ? body.items : [];
    const returnUrl = String(body.returnUrl || '');
    const cancelUrl = String(body.cancelUrl || '');

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error('Config PAYOS_CLIENT_ID, PAYOS_API_KEY hoặc PAYOS_CHECKSUM_KEY bị thiếu trên Vercel.');
    }

    // Tạo mã đơn hàng ngắn ngẫu nhiên
    const orderCode = Math.floor(Math.random() * 8999999) + 1000000;

    // Chuẩn hóa danh sách items để khớp với tổng tiền
    const mappedItems = items.map((item: any) => ({
      name: String(item.name || 'Sản phẩm').slice(0, 50),
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Math.round(Number(item.price)) || 0)
    }));

    const itemsTotal = mappedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (amount > itemsTotal) {
      mappedItems.push({ name: 'Phí vận chuyển', quantity: 1, price: amount - itemsTotal });
    } else if (amount < itemsTotal) {
      mappedItems.push({ name: 'Giảm giá/Voucher', quantity: 1, price: amount - itemsTotal });
    }

    const payosPayload = {
      orderCode,
      amount,
      description,
      items: mappedItems,
      returnUrl,
      cancelUrl
    };

    // Signature Alphabetical Order: amount, cancelUrl, description, orderCode, returnUrl
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
        error: `PayOS Từ chối: ${resData.desc || resData.message || 'Lỗi không xác định'}`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: resData.data.checkoutUrl
    });

  } catch (err: any) {
    console.error('CRITICAL GATEWAY ERROR:', err.message);
    return NextResponse.json({ 
      error: `Lỗi hệ thống cổng thanh toán: ${err.message}` 
    }, { status: 500 });
  }
}
