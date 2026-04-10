import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Hàm xác minh chữ ký Webhook thủ công
function verifyWebhookSignature(webhookBody: any, checksumKey: string) {
  const { data, signature } = webhookBody;
  
  const sortedData = Object.keys(data)
    .sort()
    .reduce((obj: any, key: string) => {
      obj[key] = data[key];
      return obj;
    }, {});

  const queryString = Object.keys(sortedData)
    .map(key => `${key}=${sortedData[key]}`)
    .join('&');

  const computedSignature = crypto
    .createHmac('sha256', checksumKey)
    .update(queryString)
    .digest('hex');

  return computedSignature === signature;
}

export async function POST(request: NextRequest) {
  console.log('[PayOS Webhook] Received request');
  
  try {
    const body = await request.json();
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
    
    // 1. Xác minh chữ ký thủ công (không dùng SDK)
    if (!verifyWebhookSignature(body, checksumKey)) {
      console.warn('[PayOS Webhook] Chữ ký không hợp lệ');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { data: webhookData } = body;
    console.log('[PayOS Webhook] Data verified:', webhookData);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { description, code } = webhookData;

    // Tìm order ID
    const orderIdMatch = description?.match(/NIE8-[A-Z0-9]+/);
    if (!orderIdMatch) {
      return NextResponse.json({ message: 'Order ID not found' });
    }

    const orderId = orderIdMatch[0];
    const isSuccess = code === '00';
    const newStatus = isSuccess ? 'processing' : 'cancelled';

    console.log(`[PayOS Webhook] Updating ${orderId} to ${newStatus}`);

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[PayOS Webhook Fatal Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
