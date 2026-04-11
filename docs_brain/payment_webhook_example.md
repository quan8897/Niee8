// File: app/api/webhooks/payment/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * ĐÂY LÀ ĐOẠN CODE MẪU XỬ LÝ WEBHOOK THANH TOÁN
 * Được cấu trúc theo App Router của Next.js
 */

// 1. Khởi tạo Supabase Admin Client (để có quyền ghi đè RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Lưu ý: Dùng Service Role Key ở phía Server
);

export async function POST(req: Request) {
  try {
    // 2. Đọc dữ liệu thô (raw body) để xác thực chữ ký số nếu cần
    const payload = await req.json();
    const signature = req.headers.get('x-payment-signature'); // Ví dụ header từ Cổng thanh toán

    console.log('--- Nhận Webhook từ Cổng thanh toán ---', payload.orderId);

    // 3. XÁC THỰC CHỮ KÝ SỐ (Security Check)
    // Giả sử Cổng thanh toán dùng HMAC-SHA256 để ký payload bằng Secret Key của bạn
    const secret = process.env.PAYMENT_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Lỗi: Chữ ký số không khớp! Có thể là yêu cầu giả mạo.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. KIỂM TRA TRẠNG THÁI GIAO DỊCH
    if (payload.status === 'SUCCESS') {
      const orderId = payload.orderId;

      // 5. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG TRÊN SUPABASE
      const { data: order, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid', payment_at: new Date() })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Lỗi cập nhật Database:', updateError.message);
        throw updateError;
      }

      // 6. GỬI EMAIL XÁC NHẬN (Cái này diễn ra ngầm)
      // fetch('https://api.resend.com/emails', { ... })
      console.log('--- Đã cập nhật Đơn hàng & Chuẩn bị gửi Email ---', orderId);

      // Trả về 200 OK để Cổng thanh toán biết chúng ta đã xử lý xong
      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Lỗi xử lý Webhook:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
