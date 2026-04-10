import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function createSignature(data: any, checksumKey: string) {
  const sortedData = Object.keys(data).sort().reduce((obj: any, key: string) => {
    obj[key] = data[key];
    return obj;
  }, {});
  const queryString = Object.keys(sortedData).map(key => `${key}=${sortedData[key]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(queryString).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Luôn trả về JSON, không để Vercel trả về HTML
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'API Online' });
  }

  const orderId = `NIE8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  try {
    const { items, paymentMethod, customerName, customerPhone, customerAddress, customerCity, userId } = req.body;
    
    // Lấy biến môi trường trực tiếp
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksum = process.env.PAYOS_CHECKSUM_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!payosClientId || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Config missing on Vercel Dashboard' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Tính giá
    const { data: dbProducts } = await supabase.from('products').select('id, price, name').in('id', items.map((i: any) => i.id));
    let totalAmount = 0;
    items.forEach((item: any) => {
      const p = dbProducts?.find(dbP => dbP.id === item.id);
      const price = p ? Number(String(p.price).replace(/[^0-9]/g, '')) : 0;
      totalAmount += price * (Number(item.quantity) || 1);
    });
    const finalTotal = totalAmount + (totalAmount >= 2000000 ? 0 : 30000);

    // 2. Lưu DB
    const { data: rpcResult, error: rpcError } = await supabase.rpc('secure_checkout', {
      p_order_id: orderId,
      p_user_id: userId || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_customer_city: customerCity,
      p_items: items.map((i: any) => ({ id: i.id, size: i.size, quantity: i.quantity })),
      p_total_amount: finalTotal,
      p_payment_method: paymentMethod
    });

    if (rpcError) throw rpcError;
    if (rpcResult?.success === false) return res.status(400).json({ error: rpcResult.error });

    // 3. PayOS Link
    if (paymentMethod === 'payos') {
      const paymentData = {
        orderCode: Number(String(Date.now()).slice(-7)),
        amount: Math.max(2000, finalTotal),
        description: orderId,
        cancelUrl: `https://niee8.vercel.app/?payment=cancel&orderId=${orderId}`,
        returnUrl: `https://niee8.vercel.app/?payment=pending&orderId=${orderId}`
      };
      
      const signature = createSignature(paymentData, payosChecksum!);
      const pyRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosClientId!,
          'x-api-key': payosApiKey!
        },
        body: JSON.stringify({ ...paymentData, signature })
      });

      const pyData = await pyRes.json();
      if (pyData.code !== '00') throw new Error(pyData.desc);

      return res.status(200).json({ success: true, orderId, checkoutUrl: pyData.data.checkoutUrl });
    }

    return res.status(200).json({ success: true, orderId });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
