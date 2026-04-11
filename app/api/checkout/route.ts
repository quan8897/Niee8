import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import PayOS from '@payos/node';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const orderId = `NIE8-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  try {
    const body = await request.json();
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity, userId, totalAmount, note, discountAmount, couponCode } = body;

    const payosCid = process.env.PAYOS_CLIENT_ID;
    const payosKey = process.env.PAYOS_API_KEY;
    const payosCs = process.env.PAYOS_CHECKSUM_KEY;
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const sbSvcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!payosCid || !payosKey || !payosCs || !sbSvcKey) {
      return NextResponse.json({ error: 'Thiếu cấu hình PayOS hoặc Supabase trên môi trường Vercel.' }, { status: 500 });
    }

    const payos = new PayOS(payosCid, payosKey, payosCs);
    const supabase = createClient(sbUrl, sbSvcKey);

    // 1. Ghi đơn hàng và trừ kho an toàn qua RPC
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
    if (rpcResult?.success === false) return NextResponse.json({ 
        error_code: rpcResult.error_code, 
        error: rpcResult.error 
    }, { status: 400 });

    // 2. Tạo link thanh toán PayOS (nếu chọn phương thức payos)
    if (paymentMethod === 'payos') {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://nie8studio.vn').replace(/\/$/, '');
      const orderCode = rpcResult.payos_order_code; // Lấy mã số nguyên từ DB (PostgreSQL Sequence)
      
      // Đồng bộ thời gian hết hạn: 15 phút (khớp với Cronjob tự hủy đơn)
      const expiredAt = Math.floor(Date.now() / 1000) + (15 * 60);

      const paymentData = {
        orderCode: Number(orderCode),
        amount: Math.round(rpcResult.calculated_total), // Dùng giá đã được tính lại từ Database
        description: orderId.slice(0, 25),
        cancelUrl: `${appUrl}/?payment=cancel&orderId=${orderId}`,
        returnUrl: `${appUrl}/?payment=pending&orderId=${orderId}`,
        expiredAt: expiredAt 
      };

      try {
        const pyData = await payos.createPaymentLink(paymentData);
        return NextResponse.json({ 
          success: true, 
          orderId, 
          checkoutUrl: pyData.checkoutUrl 
        });
      } catch (payosError: any) {
        // Rollback đơn hàng nếu tạo link thất bại (Optional, hoặc để Cronjob tự hốt)
        console.error('[PayOS SDK Error]:', payosError);
        throw new Error(`Lỗi khởi tạo thanh toán: ${payosError.message}`);
      }
    }

    return NextResponse.json({ success: true, orderId });

  } catch (err: any) {
    console.error('[Checkout API Fatal Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
