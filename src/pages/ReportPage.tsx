import React, { useState, useEffect, useRef } from 'react';
import { Task, User, OfficialReport, ReportDraft } from '../types';
import { STAFF_LIST } from '../constants';
import { formatDate } from '../lib/dateUtils';
import { AlertCircle, Plus, Paperclip, Calendar, BarChart, Info, CheckCircle2, Clock, ChevronDown, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReportPageProps {
  tasks: Task[];
  users: User[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  currentUser: User;
  officialReports: OfficialReport[];
  onSaveDraft: (draft: Omit<ReportDraft, 'id'>) => Promise<void>;
  onSaveOfficialReport: (report: Omit<OfficialReport, 'id'>) => Promise<void>;
}

export const ReportPage = ({ 
  tasks, 
  users, 
  onUpdateTask, 
  currentUser,
  officialReports,
  onSaveDraft,
  onSaveOfficialReport
}: ReportPageProps) => {
  const [reportPeriod, setReportPeriod] = useState(() => {
    const saved = localStorage.getItem('qc_report_period');
    return saved || 'Tháng 04/2026';
  });
  const [monthlyConclusion, setMonthlyConclusion] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const printTemplateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('qc_report_period', reportPeriod);
    loadDraft();
  }, [reportPeriod]);

  const loadDraft = async () => {
    if (!currentUser) return;
    try {
      const draftId = `${reportPeriod.replace(/\//g, '-')}_${currentUser.id}`;
      const draftDoc = await getDoc(doc(db, 'report_drafts', draftId));
      if (draftDoc.exists()) {
        const data = draftDoc.data() as ReportDraft;
        setMonthlyConclusion(data.content);
      } else {
        setMonthlyConclusion('');
      }
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.warn("Permission denied while loading report draft. This is expected if security rules are still deploying.");
      } else {
        console.error("Error loading draft:", err);
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!currentUser) return;
    setIsSavingDraft(true);
    try {
      await onSaveDraft({
        monthYear: reportPeriod,
        content: monthlyConclusion,
        userId: currentUser.id,
        updatedAt: new Date().toISOString()
      });
      alert("Đã lưu bản nháp thành công!");
    } catch (err) {
      console.error("Save draft error:", err);
      alert("Lỗi khi lưu bản nháp.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const currentMonthReports = officialReports.filter(r => r.monthYear === reportPeriod);

  const handleExportPDF = async () => {
    console.log('Bắt đầu xuất PDF...');
    const confirmed = window.confirm("Bạn có muốn CHỐT báo cáo này và lưu vào lịch sử chính thức không?");
    if (!confirmed) return;

    setIsExportingPDF(true);
    // Save official report snapshot (Resilient to failure)
    try {
      await onSaveOfficialReport({
        monthYear: reportPeriod,
        content: monthlyConclusion,
        userId: currentUser.id,
        stats: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'COMPLETED').length,
          ongoing: tasks.filter(t => ['IN_PROGRESS', 'PENDING_APPROVAL', 'ON_HOLD'].includes(t.status)).length,
          issues: tasks.filter(t => t.isHighlighted).length
        },
        isOfficial: true,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn("⚠️ Không thể lưu vào Database: " + (err.message || "Lỗi quyền hạn"));
    }

    if (!printTemplateRef.current) return;

    try {
      const element = printTemplateRef.current;
      
      // Force display for capturing with high fidelity
      const originalStyle = element.style.cssText;
      element.style.display = 'block';
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-9999';
      element.style.width = '210mm';
      element.style.backgroundColor = '#ffffff';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // Approx A4 width in pixels
        onclone: (clonedDoc) => {
          // Recursive function to strip oklch/modern colors which html2canvas fails on
          const cleanColors = (el: HTMLElement) => {
            const style = window.getComputedStyle(el);
            const properties = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke'];
            properties.forEach(prop => {
              const value = (el.style as any)[prop] || style.getPropertyValue(prop);
              if (value && value.includes('oklch')) {
                (el.style as any)[prop] = style.getPropertyValue(prop);
                const finalValue = (el.style as any)[prop];
                if (finalValue && finalValue.includes('oklch')) {
                  if (prop === 'backgroundColor') (el.style as any)[prop] = '#ffffff';
                  else if (prop === 'color') (el.style as any)[prop] = '#000000';
                  else (el.style as any)[prop] = 'transparent';
                }
              }
            });
            Array.from(el.children).forEach(child => cleanColors(child as HTMLElement));
          };

          const cloneRoot = clonedDoc.body.querySelector('[ref="printTemplateRef"]') || clonedDoc.body;
          cleanColors(cloneRoot as HTMLElement);
        }
      });

      // Restore original style
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      let heightLeft = imgHeight - pdfHeight;
      let position = -pdfHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        position -= pdfHeight;
      }

      pdf.save(`BaoCao_QC_${reportPeriod.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Lỗi xuất PDF: " + (err instanceof Error ? err.message : "Vui lòng kiểm tra console"));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleApplyHistoricalReport = (report: OfficialReport) => {
    setMonthlyConclusion(report.content);
    setReportPeriod(report.monthYear);
    setShowHistory(false);
  };

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = tasks.filter((t) => ['IN_PROGRESS', 'PENDING_APPROVAL', 'ON_HOLD'].includes(t.status)).length;
  const issues = tasks.filter((t) => t.isHighlighted).length;
  const highPriority = tasks.filter((t) => t.priority === 'HIGH').length;

  const handleFileUpload = (taskId: string) => {
    const mockFile = `evidence_${Math.floor(Math.random() * 1000)}.pdf`;
    const task = tasks.find(t => t.id === taskId);
    const attachments = [...(task?.reportAttachments || []), mockFile];
    onUpdateTask(taskId, { reportAttachments: attachments });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" ref={reportRef}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
           <div className="flex flex-col sm:flex-row sm:items-center gap-3">
             <div className="flex items-center gap-4">
               <h1 className="text-3xl font-black text-gray-900 tracking-tighter">BÁO CÁO THÁNG</h1>
               <div className="relative">
                 <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 p-1 px-2 bg-gray-50 hover:bg-gray-100 rounded text-[10px] font-bold text-gray-500 border border-gray-200 uppercase"
                 >
                    Lịch sử <ChevronDown size={14} />
                 </button>
                 {showHistory && (
                   <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Báo cáo đã chốt</span>
                         <Plus size={14} className="rotate-45 cursor-pointer text-gray-400" onClick={() => setShowHistory(false)} />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {officialReports.map(report => (
                          <button 
                            key={report.id}
                            onClick={() => handleApplyHistoricalReport(report)}
                            className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-50 group flex items-center justify-between"
                          >
                             <div>
                               <p className="text-xs font-bold text-gray-800">{report.monthYear}</p>
                               <p className="text-[9px] text-gray-400 font-medium">{formatDate(report.createdAt)}</p>
                             </div>
                             <FileText size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                          </button>
                        ))}
                        {officialReports.length === 0 && (
                          <div className="p-4 text-center text-xs text-gray-400 italic">Chưa có báo cáo chính thức nào.</div>
                        )}
                      </div>
                   </div>
                 )}
               </div>
             </div>
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

        <div className="flex gap-3 relative z-10 no-pdf">
          <button 
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-2xl font-black text-gray-500 flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50 transition-all text-[10px] uppercase tracking-widest"
          >
            <Clock size={14} />
            {isSavingDraft ? 'ĐANG LƯU...' : 'LƯU NHÁP'}
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleExportPDF(); }}
            disabled={isExportingPDF}
            className="bg-blue-600 shadow-xl shadow-blue-200 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all text-[10px] uppercase tracking-widest min-w-[180px] justify-center"
          >
            {isExportingPDF ? (
              <>
                <Clock size={14} className="animate-spin" />
                ĐANG KHỞI TẠO...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                TRÍCH XUẤT PDF
              </>
            )}
          </button>
        </div>
      </div>

      {isExportingPDF && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-auto border border-blue-100">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Đang xử lý dữ liệu</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Đang khởi tạo file PDF, vui lòng đợi giây lát...
              </p>
           </div>
        </div>
      )}

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

                  <div className="no-pdf">
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
                        className="flex items-center gap-2 border-2 border-dashed border-gray-200 p-2 rounded-lg text-[10px] font-black text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all text-center justify-center w-full sm:w-auto"
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
             </div>
           )}
         </div>
      </div>

      {/* NEW: Monthly Conclusion Section for Draft Saving */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
         <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileText size={24} /></div>
            <div>
               <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">TỔNG KẾT & ĐỀ XUẤT CỦA BỘ PHẬN</h3>
               <p className="text-xs text-gray-500 italic">Nội dung này được lưu làm nháp cho kỳ báo cáo</p>
            </div>
         </div>
         <textarea 
            className="w-full p-6 bg-gray-50 border border-gray-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm h-48 resize-none leading-relaxed transition-all shadow-inner"
            placeholder="Nhập tổng kết chung, các kiến nghị hoặc phương hướng hoạt động cho tháng tiếp theo..."
            value={monthlyConclusion}
            onChange={(e) => setMonthlyConclusion(e.target.value)}
         />
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
                    <img src={staff.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover" alt="" />
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
                   <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-center">
                     <p className="text-[10px] uppercase font-black text-blue-200">Chỉ số Sức khỏe</p>
                     <p className="text-xl font-black">TỐT</p>
                   </div>
                   <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-center">
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
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
       </div>

       <div ref={printTemplateRef} style={{ display: 'none', backgroundColor: '#ffffff', color: '#000000' }} className="pl-[30mm] pr-[20mm] pt-[20mm] pb-[20mm] font-serif w-[210mm]">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-start gap-4">
               {/* CSS LOGO REPLACEMENT TO AVOID CORS */}
               <div style={{ backgroundColor: '#1e40af', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#ffffff', fontSize: '20px' }}>
                 TP
               </div>
               <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-tight" style={{ color: '#000000' }}>CÔNG TY CP NHỰA TÂN PHÚ</p>
                  <p className="text-[10px] italic mt-1 leading-tight" style={{ color: '#6b7280' }}>ISO 9001:2015 Certification</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold uppercase" style={{ color: '#000000' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
               <p className="text-xs font-bold" style={{ color: '#000000' }}>Độc lập - Tự do - Hạnh phúc</p>
               <div className="mt-1 h-px w-32 ml-auto" style={{ backgroundColor: '#000000' }} />
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center mb-10 space-y-2">
             <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: '#000000' }}>BÁO CÁO TỔNG HỢP HIỆU SUẤT & GIẢI TRÌNH CÔNG VIỆC</h1>
             <p className="text-base font-bold uppercase" style={{ color: '#000000' }}>KỲ BÁO CÁO: {reportPeriod}</p>
             <p className="text-[10px] italic" style={{ color: '#6b7280' }}>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>

          {/* Statistics Table */}
          <div className="mb-10">
            <h2 className="text-xs font-bold uppercase border-l-4 pl-2 mb-4" style={{ borderColor: '#000000', color: '#000000' }}>I. THỐNG KÊ CHUNG</h2>
            <table className="w-full border-collapse border text-[11px]" style={{ borderColor: '#000000' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th className="border p-2" style={{ borderColor: '#000000' }}>TỔNG CÔNG VIỆC</th>
                  <th className="border p-2" style={{ borderColor: '#000000' }}>HOÀN THÀNH</th>
                  <th className="border p-2" style={{ borderColor: '#000000' }}>ĐANG THỰC HIỆN</th>
                  <th className="border p-2" style={{ borderColor: '#000000' }}>VẤN ĐỀ NỔI CỘM</th>
                  <th className="border p-2" style={{ borderColor: '#000000' }}>TỶ LỆ</th>
                </tr>
              </thead>
              <tbody className="text-center">
                <tr>
                  <td className="border p-4 font-bold" style={{ borderColor: '#000000' }}>{total}</td>
                  <td className="border p-4 font-bold" style={{ borderColor: '#000000', color: '#15803d' }}>{completed}</td>
                  <td className="border p-4 font-bold" style={{ borderColor: '#000000', color: '#1d4ed8' }}>{ongoing}</td>
                  <td className="border p-4 font-bold" style={{ borderColor: '#000000', color: '#dc2626' }}>{issues}</td>
                  <td className="border p-4 font-bold" style={{ borderColor: '#000000' }}>{total > 0 ? Math.round((completed / total) * 100) : 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Issues List */}
          <div className="mb-10">
            <h2 className="text-xs font-bold uppercase border-l-4 pl-2 mb-4" style={{ borderColor: '#000000', color: '#000000' }}>II. DANH SÁCH VẤN ĐỀ NỔI CỘM & GIẢI TRÌNH</h2>
            <table className="w-full border-collapse border text-[10px]" style={{ borderColor: '#000000' }}>
               <thead>
                 <tr style={{ backgroundColor: '#f3f4f6' }}>
                   <th className="border p-2 w-[5%]" style={{ borderColor: '#000000' }}>STT</th>
                   <th className="border p-2 w-[25%]" style={{ borderColor: '#000000' }}>TÊN CÔNG VIỆC / MÃ CV</th>
                   <th className="border p-2 w-[15%]" style={{ borderColor: '#000000' }}>PHỤ TRÁCH</th>
                   <th className="border p-2 w-[45%]" style={{ borderColor: '#000000' }}>NỘI DUNG GIẢI TRÌNH & KHẮC PHỤC</th>
                   <th className="border p-2 w-[10%]" style={{ borderColor: '#000000' }}>HẠN ĐỊNH</th>
                 </tr>
               </thead>
               <tbody>
                  {tasks.filter(t => t.isHighlighted).map((t, idx) => (
                    <tr key={t.id}>
                      <td className="border p-2 text-center" style={{ borderColor: '#000000' }}>{idx + 1}</td>
                      <td className="border p-2" style={{ borderColor: '#000000' }}>
                        <p className="font-bold">{t.title}</p>
                        <p className="text-[8px] uppercase mt-1" style={{ color: '#6b7280' }}>{t.code}</p>
                      </td>
                      <td className="border p-2 text-center" style={{ borderColor: '#000000' }}>
                        {users.find(u => u.id === t.assigneeId)?.name}
                      </td>
                      <td className="border p-2 leading-relaxed" style={{ borderColor: '#000000' }}>
                        {t.reportExplanation || 'Chưa có nội dung giải trình.'}
                      </td>
                      <td className="border p-2 text-center font-bold" style={{ borderColor: '#000000', color: '#dc2626' }}>
                        {formatDate(t.expectedEndDate)}
                      </td>
                    </tr>
                  ))}
                  {tasks.filter(t => t.isHighlighted).length === 0 && (
                    <tr>
                      <td colSpan={5} className="border p-4 text-center italic" style={{ borderColor: '#000000', color: '#6b7280' }}>
                        Không có vấn đề nổi cộm phát sinh trong kỳ.
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>

          {/* Conclusion Section */}
          <div className="mb-16">
            <h2 className="text-xs font-bold uppercase border-l-4 pl-2 mb-4" style={{ borderColor: '#000000', color: '#000000' }}>III. TỔNG KẾT & ĐỀ XUẤT CỦA BỘ PHẬN</h2>
            <table className="w-full border-collapse" style={{ borderColor: '#000000' }}>
              <tbody>
                <tr>
                  <td className="border p-6 text-[11px] leading-relaxed whitespace-pre-wrap" style={{ borderColor: '#000000', backgroundColor: '#f9fafb', minHeight: '150px', verticalAlign: 'top' }}>
                    {monthlyConclusion || 'Chưa có nội dung kết luận cho kỳ báo cáo này.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer - Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs mt-10">
             <div className="space-y-20">
                <p className="font-bold uppercase" style={{ color: '#000000' }}>NGƯỜI LẬP BIỂU</p>
                <p className="font-bold">(Ký, họ tên)</p>
                <div className="mt-16 border-t border-dotted w-32 mx-auto pt-2" style={{ borderColor: '#d1d5db' }}>
                  <p className="text-[10px]" style={{ color: '#9ca3af' }}>.............................................</p>
                </div>
             </div>
             <div className="space-y-20">
                <p className="font-bold uppercase" style={{ color: '#000000' }}>TRƯỞNG PHÒNG QLCL</p>
                <p className="font-bold">(Ký, họ tên)</p>
                <div className="mt-16 border-t border-dotted w-32 mx-auto pt-2" style={{ borderColor: '#d1d5db' }}>
                  <p className="text-[10px]" style={{ color: '#9ca3af' }}>.............................................</p>
                </div>
             </div>
             <div className="space-y-20">
                <p className="font-bold uppercase" style={{ color: '#000000' }}>GIÁM ĐỐC XÁC NHẬN</p>
                <p className="font-bold">(Ký, đóng dấu)</p>
                <div className="mt-16 border-t border-dotted w-32 mx-auto pt-2" style={{ borderColor: '#d1d5db' }}>
                   <p className="text-[10px]" style={{ color: '#9ca3af' }}>.............................................</p>
                </div>
             </div>
          </div>

          {/* Page Footer */}
          <div className="mt-20 pt-4 border-t flex justify-between text-[8px] italic" style={{ borderColor: '#e5e7eb', color: '#9ca3af' }}>
             <p>Tài liệu này được trích xuất tự động từ Hệ thống Quản trị Hiệu quả Công việc P.QLCL - Tân Phú Việt Nam</p>
             <p>Trang 1 / 1</p>
          </div>
       </div>
    </div>
  );
};

