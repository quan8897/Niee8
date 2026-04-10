import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayOS } from '@payos/node';

// Cố định dùng Node.js runtime truyền thống
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestTime = new Date().toISOString();
  console.log(`[Checkout-V3] [${requestTime}] Started`);
  
  try {
    // 1. Kiểm tra cấu hình môi trường ngay lập tức
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

    if (!supabaseUrl || !supabaseKey) {
       return NextResponse.json({ error: 'Config Error: Missing Supabase URL or Key' }, { status: 500 });
    }

    // 2. Parse Body an toàn
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Giỏ hàng trống hoặc không hợp lệ.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Tính toán và kiểm tra tồn kho
    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    console.log(`[Checkout-V3] [${orderId}] Calculating amount...`);
    
    // Lấy giá thực từ DB
    const { data: dbProducts, error: dbError } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    
    if (dbError) {
      console.error('[Checkout-V3] DB Product Fetch Error:', dbError);
      return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });
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

    // 4. Gọi RPC (Dùng quyền Service Role nếu có)
    console.log(`[Checkout-V3] [${orderId}] Executing RPC...`);
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName || 'Khách vãng lai',
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: finalItems.map((i: any) => ({ id: i.id, size: i.size, quantity: i.quantity })),
      p_total_amount: finalTotal,
      p_payment_method: paymentMethod
    });

    if (rpcError) {
      console.error('[Checkout-V3] RPC Error:', rpcError);
      return NextResponse.json({ error: `Đặt hàng thất bại (RPC): ${rpcError.message}` }, { status: 400 });
    }

    if (rpcResult && rpcResult.success === false) {
      return NextResponse.json({ error: rpcResult.error || 'Sản phẩm đã hết hàng.' }, { status: 400 });
    }

    // 5. Luồng PayOS
    if (paymentMethod === 'payos') {
      if (!payosClientId || !payosApiKey || !payosChecksum) {
        return NextResponse.json({ error: 'Config Error: Missing PayOS Keys on Server' }, { status: 500 });
      }

      try {
        console.log(`[Checkout-V3] [${orderId}] Creating PayOS payment link...`);
        const payos = new PayOS({
          clientId: payosClientId,
          apiKey: payosApiKey,
          checksumKey: payosChecksum,
        });
        
        const orderCode = Number(String(Date.now()).slice(-7));
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://niee8.vercel.app';

        const paymentBody = {
          orderCode,
          amount: Math.max(2000, finalTotal),
          description: orderId,
          cancelUrl: `${appUrl}?payment=cancel&orderId=${orderId}`,
          returnUrl: `${appUrl}?payment=pending&orderId=${orderId}`,
          items: finalItems.map((i: any) => ({
            name: String(i.name).slice(0, 50),
            quantity: i.quantity,
            price: i.price
          }))
        };

        if (shippingFee > 0) {
          paymentBody.items.push({ name: 'Phí vận chuyển', quantity: 1, price: shippingFee });
        }

        const paymentLink = await payos.paymentRequests.create(paymentBody);
        
        console.log(`[Checkout-V3] [${orderId}] Success: Link created`);
        return NextResponse.json({ success: true, orderId, checkoutUrl: paymentLink.checkoutUrl });

      } catch (payosErr: any) {
        console.error('[Checkout-V3] PayOS SDK Runtime Error:', payosErr);
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        return NextResponse.json({ error: `Lỗi cổng thanh toán: ${payosErr.message || 'SDK Error'}` }, { status: 400 });
      }
    }

    console.log(`[Checkout-V3] [${orderId}] Success: COD Order`);
    return NextResponse.json({ success: true, orderId });

  } catch (fatalErr: any) {
    console.error('[Checkout-V3] CRITICAL SYSTEM ERROR:', fatalErr);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống nghiêm trọng (Vercel Runtime Error)', 
      details: fatalErr.message,
      stack: fatalErr.stack 
    }, { status: 500 });
  }
}
