import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CartItem } from '@/types';
import crypto from 'crypto';

// Tạo Order ID bảo mật — không thể brute-force
function generateSecureOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (b: number) => chars[b % chars.length]
  ).join('');
  return `NIE8-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;

    if (!customerName || !customerPhone || !items?.length) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt hàng' }, { status: 400 });
    }

    const supabase = await createClient();

    // Tính tổng tiền TRÊN SERVER — không tin giá từ Client
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, price')
      .in('id', items.map((i: CartItem) => i.id));

    if (productError || !productData) {
      return NextResponse.json({ error: 'Không thể xác minh sản phẩm' }, { status: 400 });
    }

    // Tính tổng tiền thật từ DB
    let serverTotal = 0;
    for (const item of items as CartItem[]) {
      const product = productData.find((p: { id: string; price: string }) => p.id === item.id);
      if (!product) continue;
      const price = parseFloat(String(product.price).replace(/[^0-9]/g, ''));
      serverTotal += (isNaN(price) ? 0 : price) * item.quantity;
    }
    const shippingFee = serverTotal >= 2000000 ? 0 : 30000;
    const finalTotal = Math.round(serverTotal + shippingFee);

    const orderId = generateSecureOrderId();

    // Atomic transaction: Trừ kho + Lưu đơn cùng 1 lúc
    const { data: result, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items.map((item: CartItem) => ({ id: item.id, size: item.size, quantity: item.quantity })),
      p_total_amount: finalTotal,
      p_payment_method: paymentMethod,
    });

    if (rpcError) throw rpcError;
    if (result && !result.success) {
      return NextResponse.json({ error: result.error || 'Lỗi xử lý đơn hàng' }, { status: 400 });
    }

    // PayOS — tạo payment link
    if (paymentMethod === 'payos') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const payosRes = await fetch(`${request.nextUrl.origin}/api/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: finalTotal,
          description: `NIE8-${orderId.slice(-6)}`,
          items: items.map((item: CartItem) => ({
            name: item.name,
            quantity: item.quantity,
            price: Math.round(parseFloat(String(item.price).replace(/[^0-9]/g, '')) || 0),
          })),
          returnUrl: `${appUrl}?payment=pending&orderId=${orderId}`,
          cancelUrl: `${appUrl}?payment=cancel&orderId=${orderId}`,
        }),
      });

      if (!payosRes.ok) {
        const errData = await payosRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi tạo link PayOS');
      }

      const payosData = await payosRes.json();
      return NextResponse.json({ success: true, orderId, checkoutUrl: payosData.checkoutUrl });
    }

    // COD
    return NextResponse.json({ success: true, orderId });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    console.error('[Checkout API Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
