import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Tạo OrderID ngẫu nhiên bảo mật hơn một chút
  const orderId = `NIE8-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  try {
    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity, userId, totalAmount, note, discountAmount, couponCode } = body;

    // Biến môi trường
    const payosCid = process.env.PAYOS_CLIENT_ID;
    const payosKey = process.env.PAYOS_API_KEY;
    const payosCs = process.env.PAYOS_CHECKSUM_KEY;
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const sbSvcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Bắt buộc dùng Service Role

    if (!payosCid || !payosCs || !sbSvcKey) {
      return NextResponse.json({ error: 'Config Error: Missing Env Vars on Vercel' }, { status: 500 });
    }

    const supabase = createClient(sbUrl, sbSvcKey);

    // LỖI 2 FIX: Truyền đầy đủ tham số vào RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items,
      p_total_amount: totalAmount,
      p_payment_method: paymentMethod,
      p_note: note || null,
      p_discount_amount: discountAmount || 0,
      p_coupon_code: couponCode || null
    });

    if (rpcError) throw new Error(`Database Error: ${rpcError.message}`);
    if (rpcResult?.success === false) return NextResponse.json({ error: rpcResult.error }, { status: 400 });

    // 2. Thanh toán PayOS
    if (paymentMethod === 'payos') {
      // LỖI 1 FIX: OrderCode duy nhất hơn và Signature đúng thứ tự PayOS yêu cầu
      const orderCode = Number(String(Date.now()).slice(-8)); 
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://nie8studio.vn').replace(/\/$/, '');

      const paymentData = {
        orderCode,
        amount: Math.max(2000, totalAmount),
        description: orderId.slice(0, 25), // PayOS giới hạn 25 ký tự description
        cancelUrl: `${appUrl}/?payment=cancel&orderId=${orderId}`,
        returnUrl: `${appUrl}/?payment=pending&orderId=${orderId}`
      };

      // LỖI 1 FIX: Thứ tự fix cứng theo tài liệu PayOS (amount -> cancelUrl -> description -> orderCode -> returnUrl)
      const signatureString = `amount=${paymentData.amount}&cancelUrl=${paymentData.cancelUrl}&description=${paymentData.description}&orderCode=${paymentData.orderCode}&returnUrl=${paymentData.returnUrl}`;
      const signature = crypto.createHmac('sha256', payosCs).update(signatureString).digest('hex');

      const pyRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosCid,
          'x-api-key': payosKey!
        },
        body: JSON.stringify({ ...paymentData, signature })
      });

      const pyData = await pyRes.json();
      if (pyData.code !== '00') throw new Error(`PayOS API Error: ${pyData.desc}`);

      return NextResponse.json({ 
        success: true, 
        orderId, 
        checkoutUrl: pyData.data.checkoutUrl 
      });
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    console.error('[Checkout API Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
