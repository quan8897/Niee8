import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Play, Filter, Search } from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'pass' | 'fail';
}

const testCases: TestCase[] = [
  { id: 'TC-01', name: 'Đặt hàng bằng đúng tồn kho', category: 'Edge Cases', status: 'pending' },
  { id: 'TC-02', name: 'Nhập kho số lượng lớn', category: 'Edge Cases', status: 'pending' },
  { id: 'TC-03', name: 'Đăng ký Restock sai size', category: 'Edge Cases', status: 'pending' },
  { id: 'TC-04', name: 'Tìm kiếm sản phẩm sai định dạng', category: 'Edge Cases', status: 'pending' },
  { id: 'TC-05', name: 'Đặt hàng khi hết hàng (Race)', category: 'Negative', status: 'pending' },
  { id: 'TC-06', name: 'Email sai định dạng Restock', category: 'Negative', status: 'pending' },
  { id: 'TC-07', name: 'Admin nhập kho số lượng âm', category: 'Negative', status: 'pending' },
  { id: 'TC-08', name: 'Thêm sản phẩm bằng can thiệp code', category: 'Negative', status: 'pending' },
  { id: 'TC-09', name: 'Truy cập Admin không đăng nhập', category: 'Security', status: 'pending' },
  { id: 'TC-10', name: 'SQL Injection qua form tìm kiếm', category: 'Security', status: 'pending' },
  { id: 'TC-11', name: 'XSS qua tên sản phẩm', category: 'Security', status: 'pending' },
  { id: 'TC-12', name: 'Thay đổi giá trong request', category: 'Security', status: 'pending' },
  { id: 'TC-13', name: '100+ user truy cập đồng thời', category: 'Performance', status: 'pending' },
  { id: 'TC-14', name: 'Tải nhiều sản phẩm chất lượng cao', category: 'Performance', status: 'pending' },
  { id: 'TC-15', name: 'Hiển thị Mobile (iOS/Android)', category: 'UX & Compat', status: 'pending' },
  { id: 'TC-16', name: 'Hỗ trợ phím màu (Accessibility)', category: 'UX & Compat', status: 'pending' },
  { id: 'TC-17', name: 'Thanh toán thất bại khi giỏ hàng trống', category: 'Integration', status: 'pending' },
  { id: 'TC-18', name: 'Email thông báo Restock', category: 'Integration', status: 'pending' },
  { id: 'TC-19', name: 'Khôi phục dữ liệu (Data Backup)', category: 'Integration', status: 'pending' },
];

const categories = Array.from(new Set(testCases.map(t => t.category)));

export default function UATDashboard() {
  const [filter, setFilter] = useState<'All' | 'Pass' | 'Fail' | 'Checked'>('All');

  const [testCasesState, setTestCasesState] = useState<TestCase[]>(testCases);

  const runAllTests = async () => {
    setTestCasesState(prev => prev.map(t => ({ ...t, status: 'pending' })));
    try {
      const res = await fetch('/api/run-tests', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setTestCasesState(prev => prev.map(t => ({ ...t, status: 'pass' })));
      } else {
        setTestCasesState(prev => prev.map(t => ({ ...t, status: 'fail' })));
      }
    } catch (err) {
      console.error('Lỗi khi chạy bộ test:', err);
      setTestCasesState(prev => prev.map(t => ({ ...t, status: 'fail' })));
    }
  };

  const stats = {
    total: testCasesState.length,
    pass: testCasesState.filter(t => t.status === 'pass').length,
    fail: testCasesState.filter(t => t.status === 'fail').length,
    pending: testCasesState.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="p-6 bg-nie8-bg min-h-screen">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif italic text-nie8-text">NIE8 - UAT TEST RUNNER</h1>
          <span className="text-xs text-nie8-text/50">v1.0 - 2026</span>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'TỔNG', value: stats.total, color: 'text-nie8-text' },
            { label: 'PASS', value: stats.pass, color: 'text-green-600' },
            { label: 'FAIL', value: stats.fail, color: 'text-red-600' },
            { label: 'PENDING', value: stats.pending, color: 'text-orange-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white p-4 rounded-2xl border border-nie8-text/5 shadow-sm text-center">
              <p className="text-[10px] font-bold text-nie8-text/40 mb-1">{stat.label}</p>
              <p className={`text-2xl font-serif italic ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center bg-white p-2 rounded-full border border-nie8-text/5 shadow-sm">
          <div className="flex gap-2">
            {['All', 'Pass', 'Fail', 'Checked'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-nie8-primary text-white' : 'text-nie8-text/60 hover:bg-nie8-primary/5'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button onClick={runAllTests} className="flex items-center gap-2 px-6 py-2 bg-nie8-text text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nie8-secondary transition-all">
            <Play size={14} /> Chạy tất cả
          </button>
        </div>
      </header>

      <div className="space-y-8">
        {categories.map(cat => (
          <section key={cat}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-nie8-secondary mb-4 flex items-center gap-2">
              {cat} <span className="bg-nie8-primary/10 text-nie8-primary px-2 py-0.5 rounded-full text-[10px]">{testCases.filter(t => t.category === cat).length}</span>
            </h2>
            <div className="space-y-2">
              {testCasesState.filter(t => t.category === cat).map(test => (
                <div key={test.id} className="bg-white p-4 rounded-2xl border border-nie8-text/5 shadow-sm flex items-center justify-between hover:border-nie8-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-nie8-text/20 text-nie8-primary focus:ring-nie8-primary" />
                    <span className="text-xs font-mono text-nie8-text/40 w-16">{test.id}</span>
                    <span className="text-sm font-medium text-nie8-text">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${test.status === 'pass' ? 'text-green-600' : test.status === 'fail' ? 'text-red-600' : 'text-orange-600'}`}>
                      {test.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
