import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    // Xác minh chữ ký từ PayOS để tránh webhook giả
    if (checksumKey && body.signature) {
      const { orderCode, amount, description, accountNumber, reference } = body.data || {};
      const signatureString = `accountNumber=${accountNumber}&amount=${amount}&description=${description}&orderCode=${orderCode}&reference=${reference}`;
      const expectedSig = crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');

      if (expectedSig !== body.signature) {
        console.warn('[PayOS Webhook] Chữ ký không hợp lệ — bỏ qua');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const { code, data } = body;

    // code '00' = thanh toán thành công
    if (code === '00' && data) {
      const supabase = await createClient();
      const { description } = data;

      // Tìm order ID từ description (format: NIE8-XXXXXX)
      const orderIdMatch = description?.match(/NIE8-[A-Z0-9]+/);
      if (!orderIdMatch) {
        return NextResponse.json({ message: 'Order ID không tìm thấy trong description' });
      }

      const orderId = orderIdMatch[0];

      // Cập nhật trạng thái đơn hàng → processing
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('status', 'pending'); // Chỉ update nếu còn pending

      if (error) {
        console.error('[PayOS Webhook] Lỗi cập nhật order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[PayOS Webhook] Đơn hàng ${orderId} đã thanh toán thành công.`);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi webhook';
    console.error('[PayOS Webhook Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
