import React from 'react';
import { Task } from '../../types';
import { Activity, Zap, Shield, CheckCircle } from 'lucide-react';
import { getTaskDeadlineStatus } from '../../lib/dateUtils';

interface StatsSummaryProps {
  tasks: Task[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks, selectedMonth = 'all', onMonthChange }) => {
  const nonDeleted = tasks.filter(t => !t.deletedAt);
  // YÊU CẦU BẮT BUỘC: Dashboard chỉ tính các việc APPROVED và KHÔNG đang chờ duyệt
  const approvedTasks = nonDeleted.filter(t => t.status === 'APPROVED' && !t.waitingApproval);
  
  const totalCount = approvedTasks.length;
  const activeTasks = approvedTasks; // Tất cả APPROVED được coi là đang xử lý cho Dashboard này
  
  const priorityTasks = activeTasks.filter(t => !!t.priorityOrder);
  const normalTasks = activeTasks.filter(t => !priorityTasks.includes(t));
  
  // LOGIC HOÀN THÀNH CHUẨN: Bao gồm cả việc đã xong kỳ cũ
  const completedTasks = React.useMemo(() => {
    // THIẾT QUÂN LUẬT: Master Data Only - Chỉ đếm Task gốc đã xong, không đếm history trùng
    const directCompleted = nonDeleted.filter(t => (t.status === 'COMPLETED' || t.status === 'Hoàn thành') && !t.waitingApproval);
    
    // THỰC THI: Loại bỏ hoàn toàn việc đếm cycleHistory ảo để khớp 100% với số dòng trên Table
    const combined = [...directCompleted];
    
    // THIẾT QUÂN LUẬT: Deduplicate fingerprint để khớp bảng
    const uniqueMap = new Map();
    combined.forEach(item => {
      if (!item.id || !item.code) return;
      const rawDate = item.actualEndDate || '';
      const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
      const contentStr = (item.currentUpdate || '').trim();
      const fingerprint = `${item.code}_${dateStr}_${contentStr}`;
      if (!uniqueMap.has(fingerprint)) {
        uniqueMap.set(fingerprint, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [nonDeleted]);
  
  // Extract unique MM/YY from completed tasks
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    completedTasks.forEach(t => {
      const date = t.actualEndDate;
      if (date) {
        // HỖ TRỢ CẢ 2 ĐỊNH DẠNG: ISO (2026-05-...) hoặc DD/MM/YY (13/05/26)
        const dateStr = typeof date === 'string' ? date : (date as any).toISOString?.() || '';
        
        let m = '', y = '';
        const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
        const vnMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})/);

        if (isoMatch) {
          y = isoMatch[1].substring(2);
          m = isoMatch[2];
        } else if (vnMatch) {
          y = vnMatch[3];
          m = vnMatch[2];
        }

        if (m && y) {
          months.add(`${m}/${y}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yB - yA;
      return mB - mA;
    });
  }, [completedTasks]);

  const filteredCompleted = selectedMonth === 'all' 
    ? completedTasks 
    : completedTasks.filter(t => {
        const date = t.actualEndDate;
        if (!date) return false;
        const dateStr = typeof date === 'string' ? date : (date as any).toISOString?.() || '';
        
        let m = '', y = '';
        const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
        const vnMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})/);

        if (isoMatch) {
          y = isoMatch[1].substring(2);
          m = isoMatch[2];
        } else if (vnMatch) {
          y = vnMatch[3];
          m = vnMatch[2];
        }
        
        return `${m}/${y}` === selectedMonth;
      });

  const completedCount = filteredCompleted.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-amber-500 py-3 px-3.5 rounded-2xl border border-amber-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Activity size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">TỔNG DỰ ÁN</p>
              <p className="text-[9px] text-amber-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap">Đang quản lý</p>
            </div>
          </div>
          <div className="text-[33px] font-medium text-white leading-none shrink-0"><span translate="no" className="notranslate">{totalCount}</span></div>
        </div>
      </div>

      <div className="bg-emerald-500 py-3 px-3.5 rounded-2xl border border-emerald-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Shield size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">BÌNH THƯỜNG</p>
              <p className="text-[9px] text-emerald-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap text-ellipsis overflow-hidden">HỆ THỐNG KIỂM SOÁT</p>
            </div>
          </div>
          <div className="text-[33px] font-medium text-white leading-none shrink-0"><span translate="no" className="notranslate">{normalTasks.length}</span></div>
        </div>
      </div>

      <div className="bg-red-500 py-3 px-3.5 rounded-2xl border border-red-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Zap size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">ƯU TIÊN / GẤP</p>
              <p className="text-[9px] text-red-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap">BẤT QUY TẮC</p>
            </div>
          </div>
          <div className="text-[33px] font-medium text-white leading-none shrink-0"><span translate="no" className="notranslate">{priorityTasks.length}</span></div>
        </div>
      </div>

      <div className="bg-blue-600 py-3 px-3.5 rounded-2xl border border-blue-700 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <CheckCircle size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">HOÀN THÀNH</p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[9px] text-blue-100 font-bold uppercase opacity-80 leading-none whitespace-nowrap">Kết quả</p>
                <select 
                  value={selectedMonth}
                  onChange={(e) => onMonthChange && onMonthChange(e.target.value)}
                  className="bg-blue-700/50 text-[9px] font-bold text-white border-none rounded px-1 py-0.5 outline-none cursor-pointer hover:bg-blue-800 transition-colors"
                  translate="no"
                >
                  <option value="all">ALL</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="text-[33px] font-medium text-white leading-none shrink-0"><span translate="no" className="notranslate">{completedCount}</span></div>
        </div>
      </div>
    </div>
  );
};
