import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * API Hủy đơn hàng an toàn (Server-side)
 * Bảo vệ chống lại việc người dùng lạ mò ID để hủy đơn của người khác.
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, token } = await request.json();

    if (!orderId || !token) {
      return NextResponse.json({ error: 'Thiếu thông tin xác thực' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Kiểm tra quyền sở hữu đơn hàng (Ownership check)
    // Phải khớp cả ID và cancellation_token (mã bí mật chỉ người mua mới có trong link)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .eq('cancellation_token', token)
      .single();

    if (fetchError || !order) {
      console.warn(`[Cancel API] Yêu cầu hủy không hợp lệ cho đơn ${orderId}`);
      return NextResponse.json({ error: 'Đơn hàng không tồn tại hoặc mã xác thực không đúng' }, { status: 403 });
    }

    // 2. Kiểm tra trạng thái đơn hàng
    if (order.status !== 'pending') {
      return NextResponse.json({ error: `Đơn hàng này không thể hủy (trạng thái hiện tại: ${order.status})` }, { status: 400 });
    }

    // 3. Thực hiện hủy đơn AN TOÀN qua RPC (Đã bao gồm logic hoàn kho tự động qua Trigger)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('cancel_order_safe', {
      p_order_id: orderId
    });

    if (rpcError) {
      console.error(`[Cancel API RPC Error]`, rpcError);
      throw new Error(rpcError.message);
    }

    if (rpcResult?.success === false) {
      return NextResponse.json({ error: rpcResult.error }, { status: 400 });
    }

    // Thành công
    return NextResponse.json({ success: true, message: 'Đã hủy đơn hàng và hoàn trả số lượng vào kho.' });

  } catch (error: any) {
    console.error('[Cancel API Fatal Error]:', error.message);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi hủy đơn hàng' }, { status: 500 });
  }
}
