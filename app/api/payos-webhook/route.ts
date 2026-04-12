import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayOS } from '@payos/node';

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

    const payos = new PayOS({ clientId: payosCid, apiKey: payosKey, checksumKey: payosCs });

    // 1. Xác minh chữ ký Webhook bằng SDK chính thức
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(body);
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

    // 3. Xử lý kết quả & Đối soát bất thường (Reconciliation - Chống AV-07)
    if (!updatedOrders || updatedOrders.length === 0) {
      // Đơn hàng không tồn tại hoặc đã được xử lý (idempotency)
      // HOẶC tiền về nhưng đơn đã bị hủy trước đó (Webhook trễ)
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, status, total_amount')
        .eq('payos_order_code', orderCode)
        .single();

      if (existingOrder?.status === 'cancelled' && isSuccess) {
        // ⚠️ TRƯỜNG HỢP BIÊN: Tiền đã về nhưng đơn bị hủy (do Cron hoặc khách hủy thủ công)
        console.warn(`[PayOS Anomaly] Tiền về cho đơn đã hủy: ${existingOrder.id}`);
        await supabase.from('payment_anomalies').insert({
          payos_order_code: orderCode,
          order_id: existingOrder.id,
          order_status: 'cancelled',
          payment_code: code,
          amount: existingOrder.total_amount,
          notes: 'Tiền đã về tài khoản nhưng đơn hàng đã ở trạng thái Cancelled (có thể do thanh toán muộn > 15p).'
        });
      }

      return NextResponse.json({ success: true, message: 'Already processed or logged as anomaly.' });
    }

    console.log(`[PayOS Webhook] Successfully updated order ${updatedOrders[0].id} to ${newStatus}`);

    // Tại đây bạn có thể thêm logic gửi Telegram/Email thông báo đơn hàng mới
    // Chỉ gửi khi updatedOrders.length > 0 để tránh bị bắn tin nhắn trùng lặp

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[PayOS Webhook Fatal Error]:', error.message);
    // Vẫn trả về 200 nếu đây là lỗi logic nội bộ sau khi đã verify xong, 
    // để tránh PayOS retry vô hạn (tùy chiến lược của bạn)
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
