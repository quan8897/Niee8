import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Kiểm tra biến môi trường
    const payosCid = process.env.PAYOS_CLIENT_ID;
    const payosKey = process.env.PAYOS_API_KEY;
    const payosCs = process.env.PAYOS_CHECKSUM_KEY;
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!payosCid || !sbUrl || !sbKey) {
      return NextResponse.json({ error: 'System Env Missing' }, { status: 500 });
    }

    const supabase = createClient(sbUrl, sbKey);

    // Lưu Database
    const { error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_customer_name: body.customerName,
      p_customer_phone: body.customerPhone,
      p_customer_address: body.customerAddress,
      p_customer_city: body.customerCity,
      p_items: body.items,
      p_total_amount: body.totalAmount,
      p_payment_method: body.paymentMethod
    });

    if (rpcError) throw rpcError;

    if (body.paymentMethod === 'payos') {
      const paymentData = {
        orderCode: Number(String(Date.now()).slice(-7)),
        amount: Math.max(2000, body.totalAmount),
        description: orderId,
        cancelUrl: 'https://niee8.vercel.app',
        returnUrl: 'https://niee8.vercel.app'
      };

      const sorted = Object.keys(paymentData).sort().reduce((obj: any, key: string) => {
        obj[key] = (paymentData as any)[key];
        return obj;
      }, {});
      const qs = Object.keys(sorted).map(key => `${key}=${sorted[key]}`).join('&');
      const signature = crypto.createHmac('sha256', payosCs!).update(qs).digest('hex');

      const pyRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': payosCid!, 'x-api-key': payosKey! },
        body: JSON.stringify({ ...paymentData, signature })
      });

      const pyData = await pyRes.json();
      if (pyData.code !== '00') throw new Error(pyData.desc);

      return NextResponse.json({ success: true, orderId, checkoutUrl: pyData.data.checkoutUrl });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
