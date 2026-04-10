import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayOS } from '@payos/node';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      console.error('[PayOS Webhook] Missing configuration');
      return NextResponse.json({ error: 'Missing PayOS config' }, { status: 500 });
    }

    // Khởi tạo PayOS SDK
    const payos = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });

    // 1. Xác minh chữ ký bằng SDK chính thức
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(body);
      console.log('[PayOS Webhook] Verified Data:', webhookData);
    } catch (e: any) {
      console.warn('[PayOS Webhook] Xác minh chữ ký thất bại:', e.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Xử lý cập nhật DB
    // Chúng ta sử dụng Service Role Key để ghi đè RLS (vì Webhook không có user session)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      console.error('[PayOS Webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { description } = webhookData;

    // Tìm order ID từ description (format: NIE8-XXXXXX)
    const orderIdMatch = description?.match(/NIE8-[A-Z0-9]+/);
    if (!orderIdMatch) {
      console.warn('[PayOS Webhook] Không tìm thấy Order ID trong description:', description);
      return NextResponse.json({ message: 'Order ID not found in description' });
    }

    const orderId = orderIdMatch[0];

    // Cập nhật trạng thái đơn hàng -> processing
    // Chỉ cập nhật nếu đơn hiện tại đang ở trạng thái 'pending'
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select();

    if (error) {
      console.error('[PayOS Webhook] Lỗi cập nhật đơn hàng:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedOrder || updatedOrder.length === 0) {
      console.log(`[PayOS Webhook] Đơn hàng ${orderId} đã được xử lý trước đó hoặc không tồn tại.`);
    } else {
      console.log(`[PayOS Webhook] Đơn hàng ${orderId} đã thanh toán và chuyển sang trạng thái PROCESSING thành công.`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[PayOS Webhook Error] Fatal:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
