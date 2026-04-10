import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

// Hàm tạo chữ ký
function createSignature(data: any, checksumKey: string) {
  const sortedData = Object.keys(data).sort().reduce((obj: any, key: string) => {
    obj[key] = data[key];
    return obj;
  }, {});
  const queryString = Object.keys(sortedData).map(key => `${key}=${sortedData[key]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(queryString).digest('hex');
}

export default async function handler(req: any) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'API is Online' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Lưu DB qua RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items,
      p_total_amount: body.totalAmount || 0, // Frontend should pass this if possible, or we calculate
      p_payment_method: paymentMethod
    });

    if (rpcError) throw rpcError;

    // Thanh toán PayOS
    if (paymentMethod === 'payos') {
      const paymentData = {
        orderCode: Number(String(Date.now()).slice(-7)),
        amount: 2000, // Test amount
        description: orderId,
        cancelUrl: 'https://niee8.vercel.app',
        returnUrl: 'https://niee8.vercel.app'
      };
      const signature = createSignature(paymentData, process.env.PAYOS_CHECKSUM_KEY!);
      
      const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.PAYOS_CLIENT_ID!,
          'x-api-key': process.env.PAYOS_API_KEY!
        },
        body: JSON.stringify({ ...paymentData, signature })
      });
      const result = await res.json();
      return new Response(JSON.stringify({ success: true, checkoutUrl: result.data.checkoutUrl, orderId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, orderId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
