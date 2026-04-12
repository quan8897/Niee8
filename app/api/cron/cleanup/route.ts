import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Bảo vệ bằng CRON_SECRET — chỉ Vercel Cron hoặc internal calls mới gọi được
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Service Role client — không cần Cookie, bypass RLS hoàn toàn
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending')
      .eq('payment_method', 'payos')
      .lt('created_at', fifteenMinutesAgo);

    if (error) throw error;
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: 'Không có đơn hàng hết hạn', cancelled: 0 });
    }

    let cancelledCount = 0;
    for (const order of expiredOrders) {
      const { error: cancelError } = await supabase.rpc('cancel_order_safe', {
        p_order_id: order.id
      });
      if (!cancelError) cancelledCount++;
      else console.error(`Lỗi khi hủy đơn ${order.id}:`, cancelError);
    }

    console.log(`[Cron Cleanup] Đã hủy ${cancelledCount} đơn hàng hết hạn`);
    return NextResponse.json({ message: 'Hoàn thành dọn dẹp', cancelled: cancelledCount });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    console.error('[Cron Cleanup Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
