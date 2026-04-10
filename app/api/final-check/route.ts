import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  try {
    // 1. Đọc biến môi trường TRỰC TIẾP
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

    if (!supabaseUrl || !supabaseKey || !payosClientId) {
      return NextResponse.json({ error: 'Thiếu cấu hình trên Vercel Dashboard (Env Vars)' }, { status: 500 });
    }

    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity } = body;

    // 2. Tự khởi tạo Supabase ngay tại đây
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Gọi Database (RPC)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items,
      p_total_amount: body.totalAmount || 0,
      p_payment_method: paymentMethod
    });

    if (rpcError) throw new Error(`Database Error: ${rpcError.message}`);

    // 4. Nếu là PayOS, tạo link bằng fetch thuần (không dùng thư viện)
    if (paymentMethod === 'payos') {
      const paymentData = {
        orderCode: Number(String(Date.now()).slice(-7)),
        amount: 2000, 
        description: orderId,
        cancelUrl: 'https://niee8.vercel.app',
        returnUrl: 'https://niee8.vercel.app'
      };

      // Tự tính Signature
      const sortedData = Object.keys(paymentData).sort().reduce((obj: any, key: string) => {
        obj[key] = (paymentData as any)[key];
        return obj;
      }, {});
      const queryString = Object.keys(sortedData).map(key => `${key}=${sortedData[key]}`).join('&');
      const signature = crypto.createHmac('sha256', payosChecksum!).update(queryString).digest('hex');

      const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosClientId!,
          'x-api-key': payosApiKey!
        },
        body: JSON.stringify({ ...paymentData, signature })
      });

      const payosResult = await payosRes.json();
      if (payosResult.code !== '00') throw new Error(payosResult.desc);

      return NextResponse.json({ success: true, orderId, checkoutUrl: payosResult.data.checkoutUrl });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
