import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createSignature(data: any, checksumKey: string) {
  const sortedData = Object.keys(data).sort().reduce((obj: any, key: string) => {
    obj[key] = data[key];
    return obj;
  }, {});
  const queryString = Object.keys(sortedData).map(key => `${key}=${sortedData[key]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(queryString).digest('hex');
}

export async function POST(request: NextRequest) {
  const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  try {
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!payosClientId || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'System Config Error: Missing Env Vars' }, { status: 500 });
    }

    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity, userId } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Tính toán giá thực tế từ DB
    const { data: dbProducts } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    
    let totalAmount = 0;
    items.forEach((item: any) => {
      const p = dbProducts?.find(dbP => dbP.id === item.id);
      const price = p ? Number(String(p.price).replace(/[^0-9]/g, '')) : 0;
      totalAmount += price * (Number(item.quantity) || 1);
    });

    const finalTotal = totalAmount + (totalAmount >= 2000000 ? 0 : 30000);

    // 2. Lưu DB qua RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items.map((i: any) => ({ id: i.id, size: i.size, quantity: i.quantity })),
      p_total_amount: finalTotal,
      p_payment_method: paymentMethod
    });

    if (rpcError) throw new Error(`DB Error: ${rpcError.message}`);
    if (rpcResult?.success === false) return NextResponse.json({ error: rpcResult.error }, { status: 400 });

    // 3. Thanh toán PayOS
    if (paymentMethod === 'payos') {
      const orderCode = Number(String(Date.now()).slice(-7));
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://niee8.vercel.app').replace(/\/$/, '');

      const paymentData = {
        orderCode,
        amount: Math.max(2000, finalTotal),
        description: orderId,
        cancelUrl: `${appUrl}/?payment=cancel&orderId=${orderId}`,
        returnUrl: `${appUrl}/?payment=pending&orderId=${orderId}`
      };

      const signature = createSignature(paymentData, payosChecksum!);
      const payosResponse = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosClientId!,
          'x-api-key': payosApiKey!
        },
        body: JSON.stringify({ ...paymentData, signature })
      });

      const payosResult = await payosResponse.json();
      if (payosResult.code !== '00') throw new Error(`PayOS Error: ${payosResult.desc}`);

      return NextResponse.json({ success: true, orderId, checkoutUrl: payosResult.data.checkoutUrl });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error(`[PaymentHandler][${orderId}]`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
