import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Bảo vệ bằng CRON_SECRET — chỉ Vercel Cron hoặc internal calls mới gọi được
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Tìm đơn hàng PayOS pending quá 30 phút
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id, items')
      .eq('status', 'pending')
      .eq('payment_method', 'payos')
      .lt('created_at', thirtyMinutesAgo);

    if (error) throw error;
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: 'Không có đơn hàng hết hạn', cancelled: 0 });
    }

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      // Hủy đơn hàng và hoàn kho thông qua RPC restore_stock
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (!updateError) {
        // Gọi restore_stock cho từng item
        for (const item of (order.items || [])) {
          await supabase.rpc('restore_stock', {
            p_product_id: item.id,
            p_size: item.size,
            p_quantity: item.quantity,
            p_order_id: order.id,
          });
        }
        cancelledCount++;
      }
    }

    console.log(`[Cron Cleanup] Đã hủy ${cancelledCount} đơn hàng hết hạn`);
    return NextResponse.json({ message: 'Hoàn thành dọn dẹp', cancelled: cancelledCount });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    console.error('[Cron Cleanup Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
