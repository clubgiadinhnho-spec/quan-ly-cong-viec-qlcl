import React, { useEffect } from 'react';
import { LogEntry, User, Task } from '../types';
import { formatDate } from '../lib/dateUtils';
import { Trash2, History, Activity } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SystemHistoryPageProps {
  logs: LogEntry[];
  allUsers: User[];
  currentUser: User;
  tasks: Task[];
  onResetSystem: () => Promise<void>;
  onDeleteLogsBulk: (logIds: string[]) => Promise<boolean>;
  setConfirmModal: any;
}

export const SystemHistoryPage: React.FC<SystemHistoryPageProps> = ({ 
  logs, 
  allUsers, 
  currentUser,
  tasks,
  onResetSystem,
  onDeleteLogsBulk,
  setConfirmModal
}) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Migration logic for old logs - More aggressive check
  useEffect(() => {
    const fixOldLogs = async () => {
      const logsToFix = logs.filter(log => {
        const isCurrentBoss = log.userId === 'LeNhatTruong0907767304' || 
                             log.userId === currentUser.id || 
                             (currentUser as any).uid === log.userId;
        
        const isNameMissing = !log.userName || log.userName === 'NHÂN SỰ';
        
        // Even if ID doesn't match, if the details are "System Reset" or "Lock Tasks", it was likely the boss
        const isBossAction = log.details?.includes('Reset toàn bộ') || log.details?.includes('Chốt dữ liệu');
        
        return (isCurrentBoss || isBossAction) && isNameMissing;
      });

      if (logsToFix.length > 0) {
        console.log(`[MIGRATION] Fixing ${logsToFix.length} logs for Admin status...`);
        for (const log of logsToFix) {
          try {
            await updateDoc(doc(db, 'system_logs', log.id), {
              userName: 'Lê Nhật Trường',
              userId: 'LeNhatTruong0907767304'
            });
          } catch (e) {
            console.error("Migration failed for log:", log.id, e);
          }
        }
      }
    };

    if (logs.length > 0 && currentUser) {
      fixOldLogs();
    }
  }, [logs, currentUser]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === logs.length) setSelectedIds([]);
    else setSelectedIds(logs.map(l => l.id));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA NHẬT KÝ",
      message: `Bạn có chắc muốn xóa vĩnh viễn ${selectedIds.length} dòng nhật ký đã chọn không? Hành động này không thể khôi phục.`,
      onConfirm: async () => {
        await onDeleteLogsBulk(selectedIds);
        setSelectedIds([]);
        setConfirmModal((p: any) => ({ ...p, show: false }));
      }
    });
  };

  const getUserName = (log: LogEntry) => {
    if (log.userId === 'SYSTEM') return 'HỆ THỐNG';
    
    // Ưu tiên thông tin từ danh sách users hiện có
    const user = allUsers.find(u => 
      u.id === log.userId || 
      (u as any).uid === log.userId || 
      (u as any).uniqueKey === log.userId || 
      u.uniqueKey === log.userId
    ) || (
      (currentUser.id === log.userId || (currentUser as any).uid === log.userId || currentUser.uniqueKey === log.userId) ? currentUser : null
    );

    if (user) return user.name;
    if (log.userName && log.userName !== 'NHÂN SỰ') return log.userName;
    
    // Fallback cho trường hợp ID cụ thể nếu không tìm thấy user object
    if (log.userId === 'LeNhatTruong0907767304') return 'Lê Nhật Trường';

    return 'NHÂN SỰ';
  };

  const getUserTitle = (log: LogEntry) => {
    if (log.userId === 'SYSTEM') return 'HỆ THỐNG';
    
    // Prioritize finding in allUsers including the current user context
    const user = allUsers.find(u => 
      u.id === log.userId || 
      (u as any).uid === log.userId || 
      (u as any).uniqueKey === log.userId ||
      u.uniqueKey === log.userId
    ) || (
      (currentUser.id === log.userId || (currentUser as any).uid === log.userId || currentUser.uniqueKey === log.userId) ? currentUser : null
    );
    
    if (user && user.title) return user.title.toUpperCase();
    
    // Fallback logic dựa trên ID hoặc Tên nếu không tìm thấy object user
    if (log.userId === 'LeNhatTruong0907767304' || log.userName === 'Lê Nhật Trường') return 'TRƯỜNG PHÒNG';
    if (log.userName === 'QUẢN TRỊ VIÊN') return 'ADMIN';
    
    return 'NHÂN SỰ';
  };

  const getUserAvatar = (log: LogEntry) => {
    if (log.userId === 'SYSTEM') return 'https://api.dicebear.com/7.x/avataaars/svg?seed=system';
    
    // 1. If name is explicitly the boss, use boss avatar (Highest priority)
    if (log.userName === 'Lê Nhật Trường' || log.userId === 'LeNhatTruong0907767304') {
      return currentUser.avatar;
    }

    // 2. Prioritize current user if IDs match
    if (log.userId === currentUser.id || 
        log.userId === (currentUser as any).uid || 
        log.userId === (currentUser as any).uniqueKey) {
      return currentUser.avatar;
    }

    // 3. Find in all users list
    const user = allUsers.find(u => 
      u.id === log.userId || 
      (u as any).uid === log.userId || 
      (u as any).uniqueKey === log.userId || 
      u.uniqueKey === log.userId
    );
    if (user && user.avatar) return user.avatar;

    // 4. Record level fallback (if log has a specific name, seed with that)
    const seed = log.userName || log.userId;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'TASK_CREATE': return 'Tạo việc';
      case 'TASK_UPDATE': return 'Cập nhật';
      case 'TASK_DELETE': return 'Xóa (Thùng rác)';
      case 'TASK_RESTORE': return 'Khôi phục';
      case 'TASK_PERMANENT_DELETE': return 'Xóa vĩnh viễn';
      case 'TASK_LOCK': return 'Chốt dữ liệu';
      case 'DELEGATED_ACTION': return 'Quyền ủy quyền';
      case 'SYSTEM': return 'HÀNG NGÀY';
      default: return type;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'TASK_CREATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'TASK_UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TASK_DELETE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'TASK_PERMANENT_DELETE': return 'bg-red-100 text-red-700 border-red-200';
      case 'TASK_LOCK': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleResetAll = () => {
    setConfirmModal({
      show: true,
      title: "CẢNH BÁO: RESET TOÀN BỘ",
      message: "Bạn có chắc chắn muốn xóa vĩnh viễn TOÀN BỘ công việc, nhật ký và thảo luận hiện có trong hệ thống không? Hành động này không thể khôi phục.",
      onConfirm: async () => {
        await onResetSystem();
        setConfirmModal((p: any) => ({ ...p, show: false }));
      }
    });
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100 mb-8">
        <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center text-blue-600">
              <History size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#0f172a] tracking-tight translate-y-1">
                <span translate="no" className="notranslate uppercase">NHẬT KÝ HỆ THỐNG</span>
              </h2>
              <p className="text-blue-500 text-[11px] font-black mt-1 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span translate="no" className="notranslate">GIÁM SÁT BIẾN ĐỘNG & QUẢN TRỊ RỦI RO</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 self-stretch md:self-auto">
            <div className="flex items-center gap-3">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-6 min-w-[180px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                    <span translate="no" className="notranslate">Tổng nhật ký</span>
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span translate="no" className="notranslate text-3xl font-black text-blue-600 leading-none">{logs.length}</span>
                    <span translate="no" className="notranslate text-[10px] font-black text-blue-400 uppercase tracking-widest translate-y-[-2px]">Dòng</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <Activity size={24} strokeWidth={2.5} />
                </div>
              </div>

              {selectedIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 animate-in fade-in slide-in-from-right-4"
                >
                  <Trash2 size={20} strokeWidth={3} />
                  <span translate="no" className="notranslate">Xóa {selectedIds.length} mục</span>
                </button>
              )}
            </div>

            <button 
              onClick={handleResetAll}
              className="w-full md:w-auto px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 opacity-60 hover:opacity-100"
            >
              <Trash2 size={14} strokeWidth={3} />
              <span translate="no" className="notranslate">DỌN DẸP TOÀN BỘ HỆ THỐNG</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-900/80 text-white">
                <th className="px-4 py-5 text-center border border-slate-700/50 w-[50px]">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-500 accent-blue-500 cursor-pointer"
                    checked={logs.length > 0 && selectedIds.length === logs.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center border border-slate-700/50 w-[60px]">
                  <span translate="no" className="notranslate">STT</span>
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-left border border-slate-700/50 w-[250px]">
                  <span translate="no" className="notranslate">NHÂN SỰ</span>
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-left border border-slate-700/50 w-[140px]">
                  <span translate="no" className="notranslate">PHÂN LOẠI</span>
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-left border border-slate-700/50">
                  <span translate="no" className="notranslate">NỘI DUNG ĐIỀU CHỈNH</span>
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center border border-slate-700/50 w-[150px]">
                  <span translate="no" className="notranslate">NGÀY GIỜ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center border border-slate-200">
                    <div className="flex flex-col items-center gap-4 opacity-10">
                      <History size={64} strokeWidth={1} />
                      <p className="font-black uppercase tracking-[0.3em] text-sm">
                        <span translate="no" className="notranslate">Hệ thống đang chờ lệnh...</span>
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs
                  .filter(log => {
                    const details = log.details || '';
                    return !/(?:🤖|\[Robot|Robot Assist|Robot Assistant|Robot Update|Robot:|\bRobot\b)/gi.test(details);
                  })
                  .map((log, index) => (
                    <tr 
                      key={log.id} 
                    className={`hover:bg-blue-50/20 transition-colors group ${selectedIds.includes(log.id) ? 'bg-blue-50/40' : ''}`}
                    onClick={() => toggleSelection(log.id)}
                  >
                    <td className="px-4 py-6 text-center border border-slate-200" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                        checked={selectedIds.includes(log.id)}
                        onChange={() => toggleSelection(log.id)}
                      />
                    </td>
                    <td className="px-4 py-6 text-center font-black text-slate-400 text-sm border border-slate-200">
                      {logs.length - index}
                    </td>
                    <td className="px-4 py-6 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getUserAvatar(log)} 
                          alt="avatar" 
                          className="w-11 h-11 rounded-full border-2 border-white shadow-md bg-slate-100"
                        />
                        <div translate="no" className="notranslate flex flex-col min-w-0">
                          <span className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{getUserName(log)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getUserTitle(log)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6 border border-slate-200">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-100 bg-white shadow-sm">
                        <div className="p-1 bg-slate-50 rounded-lg text-slate-400">
                          <Activity size={12} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {log.type === 'SYSTEM' ? 'SYSTEM' : (getLogTypeLabel(log.type) || '').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td translate="no" className="notranslate px-6 py-6 text-sm font-bold text-slate-700 border border-slate-200 leading-relaxed italic">
                      {log.details || <span translate="no" className="notranslate">Không có nội dung chi tiết</span>}
                    </td>
                    <td className="px-4 py-6 text-center border border-slate-200">
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg flex items-center gap-2 border border-blue-100">
                          <Activity size={12} className="opacity-50" />
                          <span className="text-xs font-black">
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider opacity-70">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
