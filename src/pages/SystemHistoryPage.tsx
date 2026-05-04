import React from 'react';
import { LogEntry, User } from '../types';
import { Search, Lock, Info, Activity, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface SystemHistoryPageProps {
  logs: LogEntry[];
  allUsers: User[];
  currentUser: User;
}

export const SystemHistoryPage: React.FC<SystemHistoryPageProps> = ({ logs, allUsers, currentUser }) => {
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'DELEGATION_CHANGE': return <Lock size={20} />;
      case 'TASK_UPDATE': return <Activity size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'DELEGATION_CHANGE': return 'bg-amber-100 text-amber-600';
      case 'TASK_UPDATE': return 'bg-blue-100 text-blue-600 text-blue-600';
      case 'ERROR': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

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
                  <p className="text-3xl font-black text-blue-600 leading-none">{logs.length}</p>
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Dòng</span>
                </div>
             </div>
             <div className="w-px h-12 bg-blue-100/60"></div>
             <Activity className="text-blue-500" size={28} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Modern Table Layout */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[100px]">ID / Loại</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung hoạt động</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[250px]">Tác nhân & Đối tượng</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[180px] text-right">Ngày giờ thực hiện</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length > 0 ? (
              logs.map((log, idx) => {
                const actor = allUsers.find(u => u.id === log.userId);
                const target = allUsers.find(u => u.id === log.targetId);
                
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    key={log.id} 
                    className="group hover:bg-blue-50/20 transition-colors"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg ${getLogColor(log.type)}`}>
                          {getLogIcon(log.type)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-300 font-bold">#{log.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5 align-top">
                      <div className="max-w-xl">
                        <p className="text-[14px] font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                            log.type === 'ERROR' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'
                          }`}>
                            TYPE_{log.type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-top">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">Tác nhân</span>
                           <span className={`text-[11px] font-black px-2 py-0.5 rounded border ${
                             log.userId === 'SYSTEM' 
                               ? 'bg-slate-800 text-white border-slate-700' 
                               : 'bg-white text-slate-700 border-slate-200'
                           }`}>
                             {actor?.name || 'VÔ DANH (SYSTEM)'}
                           </span>
                        </div>
                        
                        {target && (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">Đối tượng</span>
                            <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                              {target.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right align-top">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 inline-flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-blue-600 font-mono text-[12px] font-black">
                          <Clock size={12} strokeWidth={2.5} />
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 pr-0.5">
                          {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-slate-100 border-dashed">
                    <Search size={32} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Chưa có bản ghi hoạt động nào được ghi nhận.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
