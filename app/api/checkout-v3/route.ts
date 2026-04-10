import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Cố định dùng Node.js runtime truyền thống
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[Checkout-V3] Request received at', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Checkout-V3] Missing Supabase Config');
      return NextResponse.json({ error: 'Thiếu cấu hình Database.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Tạo Order ID & Tính tiền
    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Lấy giá thực từ DB
    const { data: dbProducts, error: dbError } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    
    if (dbError) {
      console.error('[Checkout-V3] DB Product Fetch Error:', dbError);
      return NextResponse.json({ error: 'Không thể lấy thông tin sản phẩm từ Database.' }, { status: 500 });
    }

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
    console.log('[Checkout-V3] Calling RPC secure_checkout for', orderId);
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

    if (rpcError) {
      console.error('[Checkout-V3] RPC Error:', rpcError);
      return NextResponse.json({ error: `Lỗi đặt hàng: ${rpcError.message}` }, { status: 400 });
    }

    if (rpcResult && rpcResult.success === false) {
      return NextResponse.json({ error: rpcResult.error || 'Hết hàng hoặc lỗi tồn kho.' }, { status: 400 });
    }

    // 3. Nếu là PayOS -> Gọi PayOS
    if (paymentMethod === 'payos') {
      if (!payosClientId || !payosApiKey || !payosChecksum) {
        console.error('[Checkout-V3] Missing PayOS Keys');
        return NextResponse.json({ error: 'Thiếu cấu hình API PayOS.' }, { status: 500 });
      }

      try {
        const orderCode = Number(String(Date.now()).slice(-7));
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://niee8.vercel.app';

        const payosPayload: any = {
          orderCode,
          amount: Math.max(2000, finalTotal),
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
          console.error('[Checkout-V3] PayOS Rejection:', payosData);
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
          return NextResponse.json({ error: `PayOS Error: ${payosData.desc || 'Lỗi cổng thanh toán'}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, orderId, checkoutUrl: payosData.data.checkoutUrl });

      } catch (payosErr: any) {
        console.error('[Checkout-V3] PayOS Network Error:', payosErr.message);
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        return NextResponse.json({ error: 'Lỗi kết nối tới hệ thống PayOS.' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    console.error('[Checkout-V3] FATAL ERROR:', err.message);
    return NextResponse.json({ error: 'Lỗi hệ thống nghiêm trọng.' }, { status: 500 });
  }
}
