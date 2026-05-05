import React from 'react';
import { LogEntry, User, Task } from '../types';
import { Search, Lock, Info, Activity, Clock, Trash2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface SystemHistoryPageProps {
  logs: LogEntry[];
  allUsers: User[];
  currentUser: User;
  tasks: Task[];
  onDeleteTasksBulk: (ids: string[]) => Promise<void>;
  setConfirmModal: (modal: any) => void;
}

export const SystemHistoryPage: React.FC<SystemHistoryPageProps> = ({ 
  logs, 
  allUsers, 
  currentUser,
  tasks,
  onDeleteTasksBulk,
  setConfirmModal
}) => {
  const handleResetTasks = () => {
    if (tasks.length === 0) {
      alert("Không có công việc nào để dọn dẹp!");
      return;
    }

    setConfirmModal({
      show: true,
      title: "CẢNH BÁO: RESET TOÀN BỘ CÔNG VIỆC",
      message: `Bạn đang yêu cầu XÓA VĨNH VIỄN ${tasks.length} công việc trong hệ thống. Hành động này KHÔNG THỂ khôi phục. Bạn có chắc chắn muốn làm trống BẢNG CÔNG VIỆC không?`,
      onConfirm: async () => {
        try {
          const allIds = tasks.map(t => t.id);
          await onDeleteTasksBulk(allIds);
          alert(`Đã dọn dẹp thành công ${allIds.length} công việc!`);
        } catch (error) {
          alert("Lỗi khi dọn dẹp công việc.");
        } finally {
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      }
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'DELEGATION_CHANGE': return <Lock size={18} />;
      case 'DELEGATED_ACTION': return <ShieldAlert size={18} />;
      case 'TASK_CREATE': return <Activity size={18} />;
      case 'TASK_UPDATE': return <Activity size={18} />;
      case 'TASK_DELETE': return <Trash2 size={18} />;
      case 'TASK_RESTORE': return <Activity size={18} />;
      case 'TASK_PERMANENT_DELETE': return <ShieldAlert size={18} />;
      case 'TASK_LOCK': return <Lock size={18} />;
      case 'PROFILE_UPDATE': return <Activity size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getLogLabel = (type: string) => {
    if (!type) return 'HỆ THỐNG';
    switch (type) {
      case 'TASK_CREATE': return 'KHỞI TẠO';
      case 'TASK_UPDATE': return 'CẬP NHẬT';
      case 'TASK_DELETE': return 'XÓA TẠM';
      case 'TASK_RESTORE': return 'KHÔI PHỤC';
      case 'TASK_PERMANENT_DELETE': return 'XÓA VĨNH VIỄN';
      case 'TASK_LOCK': return 'CHỐT DS';
      case 'DELEGATION_CHANGE': return 'PHÂN QUYỀN';
      case 'DELEGATED_ACTION': return 'ỦY QUYỀN';
      case 'PROFILE_UPDATE': return 'HỒ SƠ';
      case 'ERROR': return 'LỖI HỆ THỐNG';
      case 'SYSTEM': return 'HỆ THỐNG';
      default: return type.replace('_', ' ');
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'DELEGATION_CHANGE': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'DELEGATED_ACTION': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'TASK_CREATE': return 'bg-green-100 text-green-600 border-green-200';
      case 'TASK_UPDATE': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'TASK_DELETE': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'TASK_RESTORE': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'TASK_PERMANENT_DELETE': return 'bg-red-100 text-red-600 border-red-200';
      case 'TASK_LOCK': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      case 'PROFILE_UPDATE': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'ERROR': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const filteredLogs = logs
    .filter(log => log.userId !== 'SYSTEM')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-24 animate-in fade-in duration-500 font-sans">
      {/* Dynamic Header Section */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200/60 p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-110" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-xl shadow-md border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:rotate-6 transition-transform">
              <Search size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">
                NHẬT KÝ HỆ THỐNG
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <p className="text-[10px] text-blue-600/60 font-black uppercase tracking-[0.2em]">
                  GIÁM SÁT BIẾN ĐỘNG & QUẢN TRỊ RỦI RO
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl border border-blue-100/50 shadow-sm flex items-center gap-5">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng nhật ký</p>
                <div className="flex items-baseline gap-1 justify-end">
                  <p className="text-3xl font-black text-blue-600 leading-none">{filteredLogs.length}</p>
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Dòng</span>
                </div>
             </div>
             <div className="w-px h-12 bg-blue-100/60"></div>
             <Activity className="text-blue-500" size={28} strokeWidth={1.5} />
          </div>
        </div>

        {/* Reset Actions Section for Admins */}
        <div className="flex justify-end pt-4">
           <button 
             onClick={handleResetTasks}
             className="flex items-center gap-2.5 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 border-b-4 border-red-800"
           >
             <Trash2 size={16} strokeWidth={2.5} />
             DỌN DẸP TOÀN BỘ CÔNG VIỆC (RESET)
           </button>
        </div>
      </div>

      {/* Modern Table Layout - Redesigned with Frames and clear columns */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-center border-r border-slate-800 w-[80px]">STT</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-left border-r border-slate-800 w-[220px]">Nhân sự thực hiện</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-left border-r border-slate-800 w-[180px]">Phân loại</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-left border-r border-slate-800">Nội dung điều chỉnh</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-right w-[200px]">Ngày giờ</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => {
                  const actor = allUsers.find(u => u.id === log.userId);
                  const target = allUsers.find(u => u.id === log.targetId);
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.01 }}
                      key={log.id} 
                      className={`group transition-all duration-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40`}
                    >
                      {/* STT / ID */}
                      <td className="px-5 py-6 text-center border-r border-slate-100 align-middle">
                        <div className="flex flex-col items-center">
                          <span translate="no" className="notranslate text-sm font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                            {String(filteredLogs.length - idx).padStart(2, '0')}
                          </span>
                          <span translate="no" className="notranslate text-[8px] font-mono text-slate-300 font-bold tracking-tighter mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            #{(log.id || '').slice(0, 6).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      
                      {/* Nhân sự thực hiện (Ai) */}
                      <td className="px-6 py-6 border-r border-slate-100 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white shrink-0 font-black text-xs ${
                            log.userId === 'SYSTEM' ? 'bg-slate-800' : 'bg-blue-600'
                          }`}>
                            <span translate="no" className="notranslate">
                              {log.userId === 'SYSTEM' ? 'SYS' : (actor?.name?.substring(0, 2).toUpperCase() || '??')}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span translate="no" className="notranslate text-[13px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                              {actor?.name || 'HỆ THỐNG'}
                            </span>
                            <span translate="no" className="notranslate text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {actor?.role || 'HỆ THỐNG'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phân loại (Sửa gì) */}
                      <td className="px-6 py-6 border-r border-slate-100 align-middle">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${getLogColor(log.type)}`}>
                            {getLogIcon(log.type)}
                          </div>
                          <div className="flex flex-col">
                            <span translate="no" className={`notranslate text-[10px] font-black uppercase tracking-wider ${
                              log.type === 'ERROR' || log.type === 'TASK_PERMANENT_DELETE' ? 'text-red-600' : 
                              log.type === 'TASK_CREATE' ? 'text-green-600' :
                              log.type === 'TASK_DELETE' ? 'text-orange-600' :
                              'text-slate-600'
                            }`}>
                              {getLogLabel(log.type)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Nội dung điều chỉnh */}
                      <td className="px-6 py-6 border-r border-slate-100 align-middle">
                        <div className="space-y-2">
                          <p translate="no" className="notranslate text-[14px] font-bold text-slate-700 leading-snug group-hover:text-blue-900 transition-colors">
                            {log.details || 'Không có nội dung chi tiết'}
                          </p>
                          {target && (
                            <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100/50 rounded-md py-1 px-2 w-fit">
                              <span translate="no" className="notranslate text-[9px] font-black text-blue-500 uppercase tracking-widest">Đối tượng:</span>
                              <span translate="no" className="notranslate text-[10px] font-black text-blue-700 uppercase">
                                {target.name || 'HỆ THỐNG'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ngày giờ (Lúc nào) */}
                      <td className="px-6 py-6 text-right border-slate-100 align-middle bg-slate-50/30">
                        <div className="flex flex-col items-end gap-1.5">
                          <div translate="no" className="notranslate flex items-center gap-1.5 text-blue-700 font-mono text-[13px] font-black bg-blue-100/50 px-2.5 py-1 rounded-md border border-blue-200/50">
                            <Clock size={14} strokeWidth={3} />
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div translate="no" className="notranslate flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] pr-1">
                            {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 border-4 border-slate-100 border-dashed animate-pulse">
                      <Search size={40} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Không tìm thấy bất kỳ dữ liệu nhật ký nào.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
