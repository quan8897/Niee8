import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyFunction() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- ĐANG TRUY VẤN SUPABASE SQL ---');
    
    // Câu lệnh SQL bạn yêu cầu để xem mã nguồn function
    const { data, error } = await supabase.rpc('get_function_source', { p_proname: 'secure_checkout' });

    if (error) {
        // Nếu rpc 'get_function_source' chưa tồn tại, thử chạy query trực tiếp (nếu được phép)
        console.log('Thử chạy query trực tiếp...');
        const { data: rawData, error: rawError } = await supabase
            .from('pg_proc')
             // Lưu ý: Thao tác này có thể bị chặn bởi RLS trên hệ thống bảng pg_ catalog
             // Tuy nhiên Service Role có thể có quyền
            .select('prosrc')
            .eq('proname', 'secure_checkout');

        if (rawError) {
            console.error('Lỗi khi truy vấn:', rawError.message);
        } else {
            console.log('MÃ NGUỒN HIỆN TẠI TRÊN DB:');
            console.log(rawData?.[0]?.prosrc || 'Không tìm thấy function.');
        }
    } else {
        console.log('MÃ NGUỒN HIỆN TẠI TRÊN DB:');
        console.log(data);
    }
}

verifyFunction();
