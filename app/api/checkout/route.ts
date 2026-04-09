import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CartItem } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;

    // Validate input
    if (!customerName || !customerPhone || !items?.length) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt hàng' }, { status: 400 });
    }

    const supabase = await createClient();

    // Tạo order ID
    const orderId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Tính tổng tiền TRÊN SERVER — không tin Client
    const { data: productData } = await supabase
      .from('products')
      .select('id, price, stock_by_size')
      .in('id', items.map((i: CartItem) => i.id));

    if (!productData) {
      return NextResponse.json({ error: 'Không thể xác minh sản phẩm' }, { status: 400 });
    }

    // Gọi hàm RPC atomic transaction
    const { data: result, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items.map((item: CartItem) => ({ id: item.id, size: item.size, quantity: item.quantity })),
      p_total_amount: 2000, // TEST MODE — TODO: tính từ productData
      p_payment_method: paymentMethod,
    });

    if (rpcError) throw rpcError;

    if (result && !result.success) {
      return NextResponse.json({ error: result.error || 'Lỗi xử lý đơn hàng' }, { status: 400 });
    }

    // Nếu PayOS — tạo payment link
    if (paymentMethod === 'payos') {
      const payosRes = await fetch(`${request.nextUrl.origin}/api/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: parseInt(orderId.slice(-6)),
          amount: 2000,
          description: `NIEE8-${orderId.slice(-4)}`,
          items: items.map((item: CartItem) => ({ name: item.name, quantity: item.quantity, price: 2000 })),
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}?payment=success&orderId=${orderId}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}?payment=cancel&orderId=${orderId}`,
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
