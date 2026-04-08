import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { PayOS } from "@payos/node";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize PayOS
  const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || "",
    apiKey: process.env.PAYOS_API_KEY || "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || ""
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Create Payment Link
  app.post("/api/create-payment-link", async (req, res) => {
    try {
      const { orderId, amount, description, items, returnUrl, cancelUrl } = req.body;

      const order = {
        orderCode: orderId || Math.floor(Math.random() * 1000000),
        amount: amount,
        description: description || "Thanh toan don hang niee8",
        items: items || [],
        returnUrl: returnUrl || `${req.headers.origin}/checkout/success`,
        cancelUrl: cancelUrl || `${req.headers.origin}/checkout/cancel`,
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // Hết hạn sau 15 phút (tính bằng giây)
      };

      const paymentLink = await payos.paymentRequests.create(order);
      res.json(paymentLink);
    } catch (error: any) {
      console.error("PayOS Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Webhook for PayOS
  app.post("/api/payos-webhook", async (req, res) => {
    try {
      const webhookData = await payos.webhooks.verify(req.body);
      console.log("=== PayOS Webhook Received ===");
      console.log("Order Code:", webhookData.orderCode);
      console.log("Amount Received:", webhookData.amount);
      
      // Giả sử bạn có database để lấy expectedAmount của orderCode này
      // const order = await supabase.from('orders').select('total_amount').eq('order_code', webhookData.orderCode).single();
      // const expectedAmount = order.data.total_amount;
      
      const expectedAmount = 2000; // CHẾ ĐỘ TEST: Giá trị mong đợi là 2000đ

      if (webhookData.amount !== expectedAmount) {
        console.error(`[PAYMENT_FAILURE] Số tiền không chính xác!`);
        console.error(`- Đơn hàng: ${webhookData.orderCode}`);
        console.error(`- Thực nhận: ${webhookData.amount}đ`);
        console.error(`- Kỳ vọng: ${expectedAmount}đ`);
        
        // TRƯỜNG HỢP SAI SỐ TIỀN:
        // 1. Không cập nhật trạng thái đơn hàng thành 'PAID'
        // 2. Có thể cập nhật trạng thái thành 'PAYMENT_ERROR' trong DB
        // 3. Gửi thông báo cho Admin để xử lý hoàn tiền thủ công
        
        return res.status(200).json({ 
          status: "error", 
          message: "Số tiền thanh toán không khớp. Đơn hàng không được hoàn thành." 
        });
      }

      // TRƯỜNG HỢP ĐÚNG SỐ TIỀN:
      console.log(`[PAYMENT_SUCCESS] Thanh toán khớp 100%: ${webhookData.amount}đ`);
      // Cập nhật trạng thái đơn hàng thành 'PAID' tại đây
      
      res.json({ status: "success" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(400).json({ error: "Invalid webhook data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
