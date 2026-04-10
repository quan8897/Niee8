import { NextRequest, NextResponse } from 'next/server';

// ĐẶT RUNTIME NODEJS ĐỂ TƯƠNG THÍCH SDK
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 1. Hàm GET để kiểm tra sức khỏe của API
export async function GET() {
  return NextResponse.json({ 
    status: 'API Checkout-V3 is Online',
    timestamp: new Date().toISOString(),
    runtime: 'nodejs'
  });
}

export async function POST(request: NextRequest) {
  console.log('[Checkout-V3] Request Incoming...');
  
  try {
    // Import lười để tránh lỗi khởi tạo module
    const { createClient } = await import('@supabase/supabase-js');
    const { PayOS } = await import('@payos/node');
    
    // Đọc body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 });
    }

    const { customerName, customerPhone, customerAddress, customerCity, items, paymentMethod, userId } = body;
    
    // Kiểm tra biến môi trường
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Thiếu cấu hình Supabase trên Server' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    console.log(`[Checkout-V3] Processing order: ${orderId}`);

    // Truy vấn sản phẩm
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, price, name')
      .in('id', items.map((i: any) => i.id));
    
    if (dbError) throw new Error(`Supabase Error: ${dbError.message}`);

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

    // Gọi RPC lưu đơn
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

    if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
    if (rpcResult?.success === false) return NextResponse.json({ error: rpcResult.error }, { status: 400 });

    // Xử lý PayOS
    if (paymentMethod === 'payos') {
      const payosClientId = process.env.PAYOS_CLIENT_ID;
      const payosApiKey = process.env.PAYOS_API_KEY;
      const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

      if (!payosClientId || !payosApiKey || !payosChecksum) {
        return NextResponse.json({ error: 'Config Error: Missing PayOS keys' }, { status: 500 });
      }

      const payos = new PayOS({
        clientId: payosClientId,
        apiKey: payosApiKey,
        checksumKey: payosChecksum,
      });

      const orderCode = Number(String(Date.now()).slice(-7));
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://niee8.vercel.app';

      const paymentLink = await payos.paymentRequests.create({
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
      });

      return NextResponse.json({ success: true, orderId, checkoutUrl: paymentLink.checkoutUrl });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (fatal: any) {
    console.error('[Checkout-V3] FATAL CRASH:', fatal);
    return NextResponse.json({ 
      error: 'SERVER_CRASH', 
      message: fatal.message,
      stack: fatal.stack 
    }, { status: 500 });
  }
}
