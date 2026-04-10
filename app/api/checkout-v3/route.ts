import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

    if (!supabaseUrl || !supabaseKey || !payosClientId || !payosApiKey || !payosChecksum) {
      return NextResponse.json({ error: 'Thiếu API Keys cấu hình trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Tạo Order ID & Tính tổng (Server-side)
    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Lấy giá thực từ DB
    const { data: dbProducts } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    
    let totalAmount = 0;
    const finalItems = items.map((item: any) => {
      const p = dbProducts?.find(dbP => dbP.id === item.id);
      const price = p ? Number(String(p.price).replace(/[^0-9]/g, '')) : 0;
      totalAmount += price * (Number(item.quantity) || 1);
      return {
        id: item.id,
        name: p?.name || 'Sản phẩm',
        size: item.size,
        quantity: Number(item.quantity),
        price: price
      };
    });

    const shippingFee = totalAmount >= 2000000 ? 0 : 30000;
    const finalTotal = totalAmount + shippingFee;

    // 2. Gọi RPC trừ kho và lưu đơn (Atomic)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: finalItems.map((i: any) => ({ id: i.id, size: i.size, quantity: i.quantity })),
      p_total_amount: finalTotal,
      p_payment_method: paymentMethod
    });

    if (rpcError || (rpcResult && !rpcResult.success)) {
      return NextResponse.json({ error: rpcResult?.error || rpcError?.message || 'Lỗi đặt hàng' }, { status: 400 });
    }

    // 3. Nếu là PayOS -> Gọi PayOS ngay tại đây
    if (paymentMethod === 'payos') {
      const orderCode = Number(String(Date.now()).slice(-7));
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

      const payosPayload: any = {
        orderCode,
        amount: finalTotal,
        description: `NIE8 ${orderCode}`,
        cancelUrl: `${appUrl}?payment=cancel&orderId=${orderId}`,
        returnUrl: `${appUrl}?payment=pending&orderId=${orderId}`,
        items: finalItems.map((i: any) => ({
          name: String(i.name).slice(0, 50),
          quantity: i.quantity,
          price: i.price
        }))
      };

      if (shippingFee > 0) {
        payosPayload.items.push({ name: 'Phí vận chuyển', quantity: 1, price: shippingFee });
      }

      const signatureString = `amount=${payosPayload.amount}&cancelUrl=${payosPayload.cancelUrl}&description=${payosPayload.description}&orderCode=${payosPayload.orderCode}&returnUrl=${payosPayload.returnUrl}`;
      const signature = crypto.createHmac('sha256', payosChecksum).update(signatureString).digest('hex');

      const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosClientId,
          'x-api-key': payosApiKey
        },
        body: JSON.stringify({ ...payosPayload, signature })
      });

      const payosData = await payosRes.json();
      
      if (!payosRes.ok || payosData.code !== '00') {
        // Rollback đơn hàng nếu PayOS lỗi
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        return NextResponse.json({ error: `PayOS Error: ${payosData.desc || 'Lỗi cổng thanh toán'}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, orderId, checkoutUrl: payosData.data.checkoutUrl });
    }

    // 4. Các phương thức khác (COD...)
    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    console.error('SERVER ERROR:', err.message);
    return NextResponse.json({ error: `Lỗi Server Checkout: ${err.message}` }, { status: 500 });
  }
}
