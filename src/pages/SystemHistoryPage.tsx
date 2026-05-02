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
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header Card Style - Following Nutifood Staff Card Layout */}
      <div className="bg-[#eff6ff] rounded-[32px] shadow-xl border-4 border-slate-100 overflow-hidden px-10 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-md border border-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Search size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[28px] font-black text-slate-900 tracking-tight uppercase leading-none mb-1">
                NHẬT KÝ HỆ THỐNG
              </h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                GHI NHẬN TOÀN BỘ BIẾN ĐỘNG & THAY ĐỔI QUAN TRỌNG
              </p>
            </div>
          </div>
          <div className="bg-white/50 px-5 py-3 rounded-2xl border border-blue-100/50 flex items-center gap-4">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng số bản ghi</p>
                <p className="text-xl font-black text-blue-600 leading-none">{logs.length}</p>
             </div>
             <div className="w-px h-8 bg-blue-100"></div>
             <Activity className="text-blue-400 opacity-50" size={24} />
          </div>
        </div>
      </div>

      {/* Logs Content */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {logs.length > 0 ? (
            logs.map((log, idx) => {
              const actor = allUsers.find(u => u.id === log.userId);
              const target = allUsers.find(u => u.id === log.targetId);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={log.id} 
                  className="p-6 hover:bg-slate-50/50 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start gap-5 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white transition-transform group-hover:scale-110 ${getLogColor(log.type)}`}>
                      {getLogIcon(log.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                          {log.details}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          <Clock size={10} />
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tác nhân:</span>
                           <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                             {actor?.name || 'Hệ thống'}
                           </span>
                        </div>
                        
                        {target && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Đối tượng:</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {target.name}
                            </span>
                          </div>
                        )}
                        
                        <div className="ml-auto text-[9px] font-black text-slate-200 uppercase tracking-[0.2em] self-center">
                          ID: {log.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle background decoration */}
                  <div className="absolute right-[-10px] bottom-[-20px] opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                    {getLogIcon(log.type)}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-100 border-dashed">
                <Search size={32} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Chưa có bản ghi hoạt động nào được ghi nhận.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
