import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, DollarSign, Clock, AlertTriangle, CheckCircle2, Trophy, Star, Medal } from 'lucide-react';
import { Task } from '../../types';
import { calculateKPI } from '../../utils/taskUtils';

interface AuditModalProps {
  task: Task;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ task, onClose }) => {
  const leaderQCD = task.leaderQCD || { q: 0, c: 0, d: 0 };
  const staffQCD = task.staffQCD || { q: 0, c: 0, d: 0 };

  const { avg, percentage, isPass, label, colorClass } = calculateKPI(leaderQCD.q, leaderQCD.c, leaderQCD.d);
  
  // Custom display for percentage level
  const statusLabel = percentage >= 120 ? 'XUẤT SẮC' : percentage >= 100 ? 'ĐẠT KPI' : 'KHÔNG ĐẠT KPI';

  const steps = [
    {
      id: 'Q',
      label: 'CHẤT LƯỢNG (QUALITY)',
      icon: <ShieldCheck size={20} className="text-blue-600" />,
      staffScore: staffQCD.q,
      staffNote: staffQCD.qExplanation || staffQCD.explanation || 'Chưa có giải trình',
      leaderScore: leaderQCD.q,
      leaderNote: leaderQCD.qComment || 'Chưa có nhận xét'
    },
    {
      id: 'C',
      label: 'CHI PHÍ (COST)',
      icon: <DollarSign size={20} className="text-emerald-600" />,
      staffScore: staffQCD.c,
      staffNote: staffQCD.cExplanation || staffQCD.explanation || 'Chưa có giải trình',
      leaderScore: leaderQCD.c,
      leaderNote: leaderQCD.cComment || 'Chưa có nhận xét'
    },
    {
      id: 'D',
      label: 'TIẾN ĐỘ (DELIVERY)',
      icon: <Clock size={20} className="text-amber-600" />,
      staffScore: staffQCD.d,
      staffNote: staffQCD.dExplanation || staffQCD.explanation || 'Chưa có giải trình',
      leaderScore: leaderQCD.d,
      leaderNote: leaderQCD.dComment || 'Chưa có nhận xét'
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative bg-[#FCFCFD] w-full max-w-lg rounded-[24px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-[4px] border-double border-amber-500"
      >
        {/* Header - Royal Style Ultra Compact */}
        <div className="bg-white px-5 py-3 border-b border-amber-100 flex flex-col items-center relative gap-0.5">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
          
          <div className="bg-amber-50 p-2 rounded-full shadow-inner border border-amber-100 mb-0.5 relative">
             <Trophy className="text-amber-600 drop-shadow-[0_0_5px_rgba(217,119,6,0.3)]" size={18} strokeWidth={2.5} />
          </div>

          <p className="text-[8px] font-black tracking-[0.2em] text-amber-500 uppercase">
             <span translate="no" className="notranslate">VINH DANH THÀNH TÍCH</span>
          </p>
          <h2 className="text-base font-black text-blue-900 tracking-tight text-center leading-tight">
             <span translate="no" className="notranslate">VINH DANH: {task.assigneeName}</span>
          </h2>
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content - Ultra Compact */}
        <div className="p-3">
          <div className="overflow-x-auto rounded-xl border border-amber-100 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-50/50 uppercase text-[8px] font-black tracking-[0.1em] text-blue-800">
                  <th className="px-3 py-2 text-left border-b border-amber-100">
                    <span translate="no" className="notranslate">MỤC</span>
                  </th>
                  <th className="px-3 py-2 text-left border-b border-amber-100 bg-white">
                    <span translate="no" className="notranslate">NHÂN VIÊN</span>
                  </th>
                  <th className="px-3 py-2 text-left border-b border-amber-100 bg-amber-50/10">
                    <span translate="no" className="notranslate">LÃNH ĐẠO</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {steps.map(step => (
                  <tr key={step.id} className="bg-white hover:bg-amber-50/5 transition-colors">
                    <td className="px-3 py-2 border-r border-amber-50">
                       <div className="flex items-center gap-1.5">
                         <div className="bg-gray-50 p-1 rounded-md border border-gray-100">
                           {React.cloneElement(step.icon as React.ReactElement, { size: 12 })}
                         </div>
                         <span translate="no" className="notranslate font-black text-[10px] text-gray-900 uppercase">{step.id}</span>
                       </div>
                    </td>
                    <td className="px-3 py-2 border-r border-amber-50">
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-0.5">
                           {[1, 2, 3, 4, 5].map(s => (
                             <Star 
                               key={s} 
                               size={10} 
                               className={`${s <= step.staffScore ? 'fill-blue-500 text-blue-500' : 'text-gray-200'}`} 
                               fill={s <= step.staffScore ? 'currentColor' : 'none'}
                             />
                           ))}
                           <span className="ml-1 font-black text-blue-700 text-[9px]" translate="no">({step.staffScore})</span>
                         </div>
                         <div className="p-1.5 bg-[#F8FAFC] rounded-lg border border-blue-50 italic text-gray-500 text-[9px] leading-tight max-w-[120px]">
                            <span translate="no" className="notranslate truncate block">"{step.staffNote}"</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 bg-amber-50/5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-0.5">
                           {[1, 2, 3, 4, 5].map(s => (
                             <Star 
                               key={s} 
                               size={11} 
                               className={`${s <= step.leaderScore ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.1)]' : 'text-gray-200'}`} 
                               fill={s <= step.leaderScore ? 'currentColor' : 'none'}
                             />
                           ))}
                           <span className="ml-1 font-black text-amber-700 text-[9px]" translate="no">({step.leaderScore})</span>
                         </div>
                         <div className="p-1.5 bg-white rounded-lg border border-amber-100 italic text-gray-700 text-[9px] font-medium leading-tight shadow-sm max-w-[120px]">
                            <span translate="no" className="notranslate uppercase font-black text-[7px] text-amber-500 mb-0.5 block tracking-tighter">NX:</span>
                            <span translate="no" className="notranslate truncate block">"{step.leaderNote}"</span>
                         </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Conclusion - Micro Certification Seal */}
          <div className="mt-4 relative">
             <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[7px] font-black tracking-widest uppercase shadow-md">
                <span translate="no" className="notranslate">KẾT QUẢ TỔNG HỢP</span>
             </div>
             
             <div className={`p-3.5 rounded-[18px] border-2 flex items-center justify-between gap-2 bg-gradient-to-br ${
               isPass ? 'from-amber-50 via-white to-emerald-50 border-amber-100' : 'from-gray-50 via-white to-red-50 border-gray-100'
             }`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2.5 rounded-[14px] shadow-md relative ${isPass ? 'bg-amber-500' : 'bg-gray-400'}`}>
                      <Medal className="text-white" size={20} />
                   </div>
                   <div>
                      <p className={`text-[8px] font-black uppercase tracking-[0.1em] mb-0.5 ${isPass ? 'text-amber-500' : 'text-gray-500'}`}>
                        <span translate="no" className="notranslate underline decoration-amber-200 decoration-1 underline-offset-1">THÀNH TÍCH KPI</span>
                      </p>
                      <h3 className={`text-sm font-black ${isPass ? 'text-amber-700' : 'text-gray-700'}`}>
                        <span translate="no" className="notranslate">{statusLabel}</span>
                      </h3>
                   </div>
                </div>
                
                <div className="relative">
                   <div className={`w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center rotate-6 shadow-sm ${
                     isPass ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600'
                   }`}>
                      <span translate="no" className="notranslate text-[6px] font-black tracking-tighter uppercase leading-none mb-0.5">XÁC NHẬN</span>
                      <span translate="no" className="notranslate text-xs font-black">{percentage}%</span>
                      <div className="w-5 h-px bg-current opacity-30 my-0.5" />
                      <span translate="no" className="notranslate text-[5px] font-black tracking-widest uppercase">OFFICIAL</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Footer - Micro */}
        <div className="p-2 bg-gray-50 border-t border-amber-50 flex justify-center">
           <button 
             onClick={onClose}
             className="px-6 py-1.5 bg-gray-900 text-white rounded-lg font-black text-[9px] uppercase tracking-[0.1em] hover:bg-black transition-all active:scale-95 shadow-sm border-b border-black"
           >
             <span translate="no" className="notranslate">ĐÓNG BẢNG VÀNG</span>
           </button>
        </div>
      </motion.div>
    </div>
  );
};

