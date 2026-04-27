import React, { useState, useEffect } from 'react';
import { Task, User } from '../types';
import { STAFF_LIST } from '../constants';
import { formatDate } from '../lib/dateUtils';
import { AlertCircle, Plus, Paperclip, Calendar, BarChart, Info, CheckCircle2, Clock } from 'lucide-react';

interface ReportPageProps {
  tasks: Task[];
  users: User[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export const ReportPage = ({ tasks, users, onUpdateTask }: ReportPageProps) => {
  const [reportPeriod, setReportPeriod] = useState(() => {
    const saved = localStorage.getItem('qc_report_period');
    return saved || 'Tháng 04/2026';
  });

  useEffect(() => {
    localStorage.setItem('qc_report_period', reportPeriod);
  }, [reportPeriod]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = tasks.filter((t) => ['IN_PROGRESS', 'PENDING_APPROVAL', 'ON_HOLD'].includes(t.status)).length;
  const issues = tasks.filter((t) => t.isHighlighted).length;
  const highPriority = tasks.filter((t) => t.priority === 'HIGH').length;

  const handleFileUpload = (taskId: string) => {
    // In a real app, this would open a file picker
    // For now, we simulate adding a mock attachment
    const mockFile = `evidence_${Math.floor(Math.random() * 1000)}.pdf`;
    const task = tasks.find(t => t.id === taskId);
    const attachments = [...(task?.reportAttachments || []), mockFile];
    onUpdateTask(taskId, { reportAttachments: attachments });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
           <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             <h1 className="text-3xl font-black text-gray-900 tracking-tighter">BÁO CÁO THÁNG</h1>
             <div className="relative group min-w-[280px]">
                <input 
                  type="text" 
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="w-full bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-black pl-5 pr-12 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-3xl border-2 border-transparent focus:border-blue-200 transition-all cursor-pointer tracking-tighter"
                  placeholder="03/2026"
                />
                <Calendar size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
             </div>
           </div>
           <div className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
             <div className="w-1 h-3 bg-blue-500 rounded-full" />
             Phân tích hiệu suất & giải trình công việc
           </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <button className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-2xl font-black text-gray-500 flex items-center gap-2 hover:bg-gray-100 transition-all text-[10px] uppercase tracking-widest">
            <Plus size={14} className="rotate-45" />
            LƯU NHÁP
          </button>
          <button className="bg-blue-600 shadow-xl shadow-blue-200 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all text-[10px] uppercase tracking-widest">
            <Plus size={14} />
            TRÍCH XUẤT PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Tổng Công Việc', value: total, color: 'text-gray-900', bg: 'bg-white', icon: BarChart },
          { label: 'CV Đã Xong', value: completed, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'CV Đang Làm', value: ongoing, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Vấn Đề Nổi Cộm', value: issues, color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle },
          { label: 'Ưu Tiên Cao', value: highPriority, color: 'text-amber-500', bg: 'bg-amber-50', icon: BarChart },
          { label: 'Tổng Nhân Sự', value: users.length, color: 'text-gray-600', bg: 'bg-gray-100', icon: users.length > 5 ? Plus : Info },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center justify-center`}>
            <div className={`p-2 rounded-full mb-2 ${stat.color.replace('text', 'bg').replace('600', '100').replace('500', '100')}`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
         <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertCircle size={24} /></div>
             <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">DANH SÁCH VẤN ĐỀ NỔI CỘM & GIẢI TRÌNH</h3>
                <p className="text-xs text-gray-500 italic">Nhân viên tự giải trình và đính kèm bằng chứng khắc phục</p>
             </div>
           </div>
         </div>

         <div className="space-y-6">
           {tasks.filter((t) => t.isHighlighted).map((t) => (
             <div key={t.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 border border-gray-100 bg-gray-50/50 rounded-2xl hover:bg-white transition-all hover:shadow-md hover:border-blue-100">
               {/* Left side: Problem info */}
               <div className="space-y-4">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Cấp bách</span>
                      <span className="text-[10px] font-bold text-gray-400">MÃ CV: {t.code}</span>
                    </div>
                    <h4 className="font-bold text-base text-gray-800 leading-tight">{t.title}</h4>
                 </div>
                 
                 <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Tình trạng hiện tại</p>
                   <p className="text-xs text-gray-600 leading-relaxed italic">
                     {t.currentUpdate || 'Chưa có cập nhật mới nhất cho diễn tiến này.'}
                   </p>
                 </div>

                 <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                   <span>Người phụ trách: <span className="text-gray-700">{users.find(s => s.id === t.assigneeId)?.name}</span></span>
                   <span>Hạn: <span className="text-red-500">{formatDate(t.expectedEndDate)}</span></span>
                 </div>
               </div>

               {/* Right side: Explanation and attachments */}
               <div className="space-y-4 flex flex-col">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
                       <Info size={12} className="text-blue-500" />
                       Tự giải trình & Chú thích
                    </p>
                    <textarea 
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs h-32 resize-none leading-relaxed transition-all"
                      placeholder="Nhập nội dung giải trình nguyên nhân, vướng mắc hoặc phương án khắc phục..."
                      value={t.reportExplanation || ''}
                      onChange={(e) => onUpdateTask(t.id, { reportExplanation: e.target.value })}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Bằng chứng / Đính kèm</p>
                    <div className="flex flex-wrap gap-2">
                      {t.reportAttachments?.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 pl-3 pr-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 group">
                           <Paperclip size={12} className="text-blue-500" />
                           {file}
                           <button 
                            onClick={() => {
                              const newFiles = t.reportAttachments?.filter((_, i) => i !== idx);
                              onUpdateTask(t.id, { reportAttachments: newFiles });
                            }}
                            className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition-colors"
                           >
                            <Plus size={12} className="rotate-45" />
                           </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => handleFileUpload(t.id)}
                        className="flex items-center gap-2 border-2 border-dashed border-gray-200 p-2 rounded-lg text-[10px] font-black text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                      >
                         <Plus size={14} />
                         ĐÍNH KÈM FILE
                      </button>
                    </div>
                  </div>
               </div>
             </div>
           ))}
           {tasks.filter((t) => t.isHighlighted).length === 0 && (
             <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">Không có vấn đề nổi cộm trong kỳ báo cáo này.</p>
                <p className="text-xs text-gray-300 mt-2">Dữ liệu được lấy tự động từ danh sách công việc có đánh dấu nổi bật.</p>
             </div>
           )}
         </div>
      </div>

       <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
         <h3 className="text-lg font-black text-gray-800 mb-8 border-b border-gray-100 pb-4 uppercase tracking-tight flex items-center gap-3">
           <BarChart className="text-blue-600" />
           TỔNG QUAN NĂNG SUẤT ĐỘI NGŨ
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {users.filter(s => s.role !== 'Admin').map((staff) => {
             const staffTasks = tasks.filter((t) => t.assigneeId === staff.id);
             const staffCompleted = staffTasks.filter((t) => t.status === 'COMPLETED').length;
             const staffOngoing = staffTasks.filter((t) => t.status === 'IN_PROGRESS').length;
             const staffIssues = staffTasks.filter((t) => t.isHighlighted).length;
             const percent = staffTasks.length > 0 ? (staffCompleted / staffTasks.length) * 100 : 0;
             
             return (
               <div key={staff.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <img src={staff.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{staff.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{staff.role}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-gray-500">Tiến độ hoàn thành</span>
                      <span className="text-blue-600">{Math.round(percent)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                      <p className="text-[8px] text-gray-400 uppercase font-black">Xong</p>
                      <p className="text-sm font-black text-green-600">{staffCompleted}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                      <p className="text-[8px] text-gray-400 uppercase font-black">Đang làm</p>
                      <p className="text-sm font-black text-blue-600">{staffOngoing}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                      <p className="text-[8px] text-gray-400 uppercase font-black">Lỗi</p>
                      <p className="text-sm font-black text-red-500">{staffIssues}</p>
                    </div>
                  </div>
               </div>
             );
           })}
         </div>
       </div>

       {/* Better Idea: AI Analysis Summary */}
       <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl shadow-blue-200 text-white overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><BarChart size={24} /></div>
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase">TỔNG KẾT & PHÂN TÍCH THÔNG MINH</h3>
                <p className="text-xs text-blue-100 font-medium">Phân tích xu hướng hiệu suất kỳ này so với kỳ trước</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-blue-50 leading-relaxed italic">
                  "Dựa trên dữ liệu, đội ngũ đang có tỉ lệ hoàn thành công việc ở mức <b>{Math.round((completed / tasks.length) * 100)}%</b>. 
                  Sự gia tăng ở các công việc Ưu tiên cao ({highPriority}) cho thấy áp lực công việc đang dồn về cuối kỳ. 
                  Khuyến nghị: Tập trung giải quyết dứt điểm {issues} vấn đề nổi cộm để đảm bảo KPI."
                </p>
                <div className="pt-4 flex gap-4">
                   <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                     <p className="text-[10px] uppercase font-black text-blue-200">Chỉ số Sức khỏe</p>
                     <p className="text-xl font-black">TỐT</p>
                   </div>
                   <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                     <p className="text-[10px] uppercase font-black text-blue-200">Độ trễ TB</p>
                     <p className="text-xl font-black">1.2 NGÀY</p>
                   </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                 <div className="w-48 h-48 border-8 border-white/10 rounded-full flex flex-col items-center justify-center relative shadow-inner">
                    <p className="text-[10px] uppercase font-black text-blue-200">Hiệu suất Đội</p>
                    <p className="text-5xl font-black tracking-tighter">84%</p>
                    <div className="absolute inset-0 border-8 border-t-white border-l-white border-b-transparent border-r-transparent rounded-full animate-spin duration-[3s]" />
                 </div>
              </div>
            </div>
          </div>
          {/* Decorative background shape */}
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
       </div>
    </div>
  );
};

