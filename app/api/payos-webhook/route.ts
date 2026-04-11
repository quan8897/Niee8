import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PayOS from '@payos/node';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payosCid = process.env.PAYOS_CLIENT_ID;
    const payosKey = process.env.PAYOS_API_KEY;
    const payosCs = process.env.PAYOS_CHECKSUM_KEY;

    if (!payosCid || !payosKey || !payosCs) {
      throw new Error('Thiếu cấu hình PayOS trên môi trường Vercel.');
    }

    const payos = new PayOS(payosCid, payosKey, payosCs);

    // 1. Xác minh chữ ký Webhook bằng SDK chính thức
    let webhookData;
    try {
      webhookData = payos.verifyPaymentWebhookData(body);
    } catch (verifyError) {
      console.warn('[PayOS Webhook] Chữ ký không hợp lệ:', verifyError);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { orderCode, code } = webhookData;
    const isSuccess = code === '00';
    const newStatus = isSuccess ? 'processing' : 'cancelled';

    console.log(`[PayOS Webhook] Received data for orderCode: ${orderCode}, status: ${newStatus}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Cập nhật đơn hàng (Idempotency Check)
    // Chỉ cập nhật nếu đơn đang ở trạng thái 'pending'
    const { data: updatedOrders, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('payos_order_code', orderCode) // Truy vấn bằng mã số nguyên (chính xác tuyệt đối)
      .eq('status', 'pending')
      .select('id'); // Lấy lại ID để xác nhận có dòng nào được cập nhật không

    if (updateError) {
      console.error('[PayOS Webhook DB Error]:', updateError.message);
      throw updateError;
    }

    // 3. Xử lý kết quả
    if (!updatedOrders || updatedOrders.length === 0) {
      // Đơn hàng không tồn tại hoặc đã được xử lý (idempotency)
      console.log(`[PayOS Webhook] OrderCode ${orderCode} already processed or mismatch.`);
      return NextResponse.json({ success: true, message: 'Already processed or no pending order found.' });
    }

    console.log(`[PayOS Webhook] Successfully updated order ${updatedOrders[0].id} to ${newStatus}`);

    // Tại đây bạn có thể thêm logic gửi Telegram/Email thông báo đơn hàng mới
    // Chỉ gửi khi updatedOrders.length > 0 để tránh bị bắn tin nhắn trùng lặp

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[PayOS Webhook Fatal Error]:', error.message);
    // Vẫn trả về 200 nếu đây là lỗi logic nội bộ sau khi đã verify xong, 
    // để tránh PayOS retry vô hạn (tùy chiến lược của bạn)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
