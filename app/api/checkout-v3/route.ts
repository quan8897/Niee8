import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Khởi tạo Supabase client bên ngoài handler để tăng tốc
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Hàm tạo chữ ký SHA256 (Manual)
function createSignature(data: any, checksumKey: string) {
  const sortedData = Object.keys(data)
    .sort()
    .reduce((obj: any, key: string) => {
      obj[key] = data[key];
      return obj;
    }, {});

  const queryString = Object.keys(sortedData)
    .map(key => `${key}=${sortedData[key]}`)
    .join('&');

  return crypto
    .createHmac('sha256', checksumKey)
    .update(queryString)
    .digest('hex');
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Ready', 
    env_check: {
      supabase: !!supabaseUrl && !!supabaseKey,
      payos: !!process.env.PAYOS_CLIENT_ID
    }
  });
}

export async function POST(request: NextRequest) {
  const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  try {
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;

    if (!payosClientId || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Chưa cấu hình đầy đủ biến môi trường trên Vercel.',
        missing: {
          payos: !payosClientId,
          supabaseUrl: !supabaseUrl,
          supabaseKey: !supabaseKey
        }
      }, { status: 500 });
    }

    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity, userId } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Tính toán giá
    const { data: dbProducts } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    
    let totalAmount = 0;
    const finalItems = items.map((item: any) => {
      const p = dbProducts?.find(dbP => dbP.id === item.id);
      const price = p ? Number(String(p.price).replace(/[^0-9]/g, '')) : 0;
      totalAmount += price * (Number(item.quantity) || 1);
      return { name: p?.name || 'Sản phẩm', quantity: Number(item.quantity), price };
    });

    const finalTotal = totalAmount + (totalAmount >= 2000000 ? 0 : 30000);

    // 2. Lưu Database
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

    if (rpcError) throw new Error(`DB RPC Error: ${rpcError.message}`);
    if (rpcResult?.success === false) return NextResponse.json({ error: rpcResult.error }, { status: 400 });

    // 3. Gọi PayOS (Manual Fetch)
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

      if (payosResult.code !== '00') {
        throw new Error(`PayOS API Error: ${payosResult.desc}`);
      }

      return NextResponse.json({ 
        success: true, 
        orderId, 
        checkoutUrl: payosResult.data.checkoutUrl 
      });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    console.error(`[Checkout-V3][${orderId}] FATAL:`, err.message);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống nghiêm trọng', 
      details: err.message,
      orderId 
    }, { status: 500 });
  }
}
