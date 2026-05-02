import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, User, OfficialReport, ReportDraft } from '../types';
import { formatDate } from '../lib/dateUtils';
import { 
  AlertCircle, Plus, Paperclip, Calendar, Download, Clock, ChevronDown, CheckCircle, CheckCircle2, FileText, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { cleanModernColors } from '../lib/colorUtils';

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
      console.warn("Lỗi tải bản nháp:", err);
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
    } catch (err) {
      console.error("Lưu nháp thất bại:", err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleExportPDF = async () => {
    const confirmed = window.confirm("BẠN CÓ MUỐN CHỐT BÁO CÁO? \n\nHành động này sẽ tải file PDF và lưu bản sao chính thức vào hệ thống.");
    if (!confirmed) return;

    setIsExportingPDF(true);
    
    // Save to Firestore first
    try {
      await onSaveOfficialReport({
        monthYear: reportPeriod,
        content: monthlyConclusion,
        userId: currentUser.id,
        stats: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'COMPLETED').length,
          ongoing: tasks.filter(t => t.status !== 'COMPLETED').length,
          issues: tasks.filter(t => t.isHighlighted).length
        },
        isOfficial: true,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Lưu DB thất bại nhưng vẫn tiếp tục xuất PDF:", err);
    }

    if (!printTemplateRef.current) return;

    try {
      const element = printTemplateRef.current;
      const originalStyle = element.style.cssText;
      
      // Prepare for capture
      element.style.display = 'block';
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '210mm';
      element.style.backgroundColor = '#ffffff';
      
      cleanModernColors(element);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      });

      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ 
        orientation: 'p', 
        unit: 'mm', 
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`BAO_CAO_QC_${reportPeriod.replace(/\//g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Lỗi khi tạo file PDF. Vui lòng thử lại.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const issues = tasks.filter((t) => t.isHighlighted).length;

  // Render highlighted tasks for the report table
  const highlightedTasks = tasks.filter(t => t.isHighlighted);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Print Template (Hidden) */}
      <div 
        ref={printTemplateRef} 
        style={{ 
          display: 'none', 
          backgroundColor: '#ffffff', 
          color: '#000000',
          padding: '20mm', 
          width: '210mm',
          fontFamily: 'serif'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold' }}>TẬP ĐOÀN TÂN PHÚ</p>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid black' }}>
              <span translate="no" className="notranslate">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG</span>
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</p>
            <div style={{ width: '40mm', height: '1px', background: 'black', margin: '5px auto' }}></div>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '16pt', textTransform: 'uppercase', marginBottom: '10px' }}>
          BÁO CÁO KẾT QUẢ CÔNG TÁC THÁNG
        </h2>
        <p style={{ textAlign: 'center', fontSize: '12pt', marginBottom: '30px' }}>
          <i>Kỳ báo cáo: {reportPeriod}</i>
        </p>

        <section style={{ marginBottom: '25px' }}>
          <h4 style={{ fontSize: '12pt', textTransform: 'uppercase', borderLeft: '4px solid #1e40af', paddingLeft: '10px' }}>
            I. TÌNH HÌNH CHUNG
          </h4>
          <div style={{ marginLeft: '15px' }}>
            <p style={{ fontSize: '11pt' }}>- Tổng số nhiệm vụ/dự án đang triển khai: <b>{total}</b></p>
            <p style={{ fontSize: '11pt' }}>- Số nhiệm vụ đã hoàn thành trong kỳ: <b>{completed}</b> ({total > 0 ? ((completed/total)*100).toFixed(1) : 0}%)</p>
            <p style={{ fontSize: '11pt' }}>- Số vấn đề nổi cộm/sự cố cần giải trình: <b style={{ color: '#dc2626' }}>{issues}</b></p>
          </div>
        </section>

        <section style={{ marginBottom: '25px' }}>
          <h4 style={{ fontSize: '12pt', textTransform: 'uppercase', borderLeft: '4px solid #1e40af', paddingLeft: '10px' }}>
            II. CHI TIẾT CÁC VẤN ĐỀ NỔI CỘM
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '10pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #000', padding: '8px', width: '30px' }}>STT</th>
                <th style={{ border: '1px solid #000', padding: '8px', width: '80px' }}>MÃ CV</th>
                <th style={{ border: '1px solid #000', padding: '8px', width: '120px' }}>PHỤ TRÁCH</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>NỘI DUNG VẤN ĐỀ & GIẢI TRÌNH</th>
              </tr>
            </thead>
            <tbody>
              {highlightedTasks.length > 0 ? highlightedTasks.map((t, idx) => (
                <tr key={t.id}>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{t.code}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{users.find(u => u.id === t.assigneeId)?.name || 'N/A'}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ fontStyle: 'italic', color: '#374151' }}>{t.reportExplanation || 'Chưa có thông tin giải trình cụ thể.'}</div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    Không có vấn đề nổi cộm ghi nhận trong kỳ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h4 style={{ fontSize: '12pt', textTransform: 'uppercase', borderLeft: '4px solid #1e40af', paddingLeft: '10px' }}>
            III. TỔNG KẾT & ĐÁNH GIÁ CỦA QUẢN LÝ
          </h4>
          <div style={{ 
            marginLeft: '15px', 
            fontSize: '11pt', 
            whiteSpace: 'pre-wrap', 
            minHeight: '60px',
            lineHeight: '1.6',
            textAlign: 'justify'
          }}>
            {monthlyConclusion || 'Chưa có nội dung tổng kết cho tháng này.'}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '60px', fontSize: '11pt' }}>NGƯỜI LẬP BIỂU</p>
            <p style={{ fontWeight: 'bold', fontSize: '11pt' }}>{currentUser.name}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontStyle: 'italic', fontSize: '10pt', marginBottom: '5px' }}>
              TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </p>
            <p style={{ fontWeight: 'bold', marginBottom: '60px', fontSize: '11pt' }}>PHÊ DUYỆT CỦA TRƯỞNG PHÒNG</p>
            <p style={{ fontWeight: 'bold', fontSize: '11pt' }}>................................................</p>
          </div>
        </div>
      </div>

      <div className="bg-[#eff6ff] rounded-[32px] shadow-xl border-4 border-slate-100 overflow-hidden px-10 py-6 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-md border border-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar size={28} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[28px] font-black text-slate-900 tracking-tight uppercase leading-none">
                  BÁO CÁO THÁNG
                </h1>
                <div className="px-3 py-1 bg-white/80 rounded-xl border border-blue-100 flex items-center gap-2">
                  <input 
                    type="text" 
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="bg-transparent border-none p-0 text-blue-600 font-black text-xl w-36 focus:ring-0 text-center tracking-tighter"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                TỔNG HỢP CHỈ SỐ KPIS & VẤN ĐỀ NỔI CỘM
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="h-10 px-6 rounded-xl bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 border border-slate-200"
            >
              <Clock size={16} /> LỊCH SỬ
            </button>
            <button 
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="h-10 px-6 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-md transition-all"
            >
              {isSavingDraft ? 'ĐANG LƯU...' : 'LƯU NHÁP'}
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Download size={16} strokeWidth={3} /> {isExportingPDF ? 'ĐANG XUẤT...' : 'CHỐT BÁO CÁO (PDF)'}
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="bg-white p-6 rounded-[24px] shadow-xl border border-blue-50 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="col-span-full flex justify-between items-center mb-2 px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BÁO CÁO CHÍNH THỨC ĐÃ LƯU</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
          </div>
          {officialReports.length === 0 ? (
            <p className="col-span-full text-center py-4 text-[11px] text-slate-400 font-bold uppercase italic">Chưa có bản ghi nào.</p>
          ) : officialReports.map(report => (
            <div key={report.id} className="p-4 border border-slate-50 bg-slate-50/50 rounded-2xl hover:border-blue-200 transition-colors group">
              <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{report.monthYear}</p>
              <p className="text-[9px] font-black text-slate-400 mt-1 uppercase">Ngày lập: {formatDate(report.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* STATISTICS - 4 COLUMNS WIDE STYLE */}
      <div className="grid grid-cols-4 gap-4 px-2">
        <div className="bg-amber-500 p-2 px-4 rounded-[20px] border-b-2 border-amber-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[60px]">
          <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
            <FileText size={40} />
          </div>
          <div className="flex items-center gap-2 mb-0.5 relative z-10">
            <div className="p-1 bg-white/20 rounded-md">
              <FileText size={11} strokeWidth={2.5} />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest">Tổng nhiệm vụ</p>
          </div>
          <p className="text-xl font-black leading-none relative z-10 text-right">{total}</p>
        </div>

        <div className="bg-emerald-500 p-2 px-4 rounded-[20px] border-b-2 border-emerald-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[60px]">
          <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={40} />
          </div>
          <div className="flex items-center gap-2 mb-0.5 relative z-10">
            <div className="p-1 bg-white/20 rounded-md">
              <CheckCircle2 size={11} strokeWidth={2.5} />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest">Hoàn thành</p>
          </div>
          <p className="text-xl font-black leading-none relative z-10 text-right">{completed}</p>
        </div>

        <div className="bg-blue-600 p-2 px-4 rounded-[20px] border-b-2 border-blue-700 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[60px]">
          <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle size={40} />
          </div>
          <div className="flex items-center gap-2 mb-0.5 relative z-10">
            <div className="p-1 bg-white/20 rounded-md">
              <CheckCircle size={11} strokeWidth={2.5} />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest">Tỉ lệ đạt</p>
          </div>
          <p className="text-xl font-black leading-none relative z-10 text-right">{total > 0 ? Math.round((completed/total)*100) : 0}%</p>
        </div>

        <div className="bg-red-500 p-2 px-4 rounded-[20px] border-b-2 border-red-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[60px]">
          <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle size={40} />
          </div>
          <div className="flex items-center gap-2 mb-0.5 relative z-10">
            <div className="p-1 bg-white/20 rounded-md">
              <AlertCircle size={11} strokeWidth={2.5} />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Vấn đề nổi cộm</p>
          </div>
          <p className="text-xl font-black leading-none relative z-10 text-right">{issues}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-2">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertCircle size={18} />
                </div>
                <h3 className="font-black text-slate-900 uppercase text-[12px] tracking-tight">VẤN ĐỀ CẦN GIẢI TRÌNH ({issues})</h3>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {tasks.filter(t => t.isHighlighted).length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase italic">Không có vấn đề nổi cộm trong kỳ!</p>
                </div>
              ) : (
                tasks.filter(t => t.isHighlighted).map(t => (
                  <div key={t.id} className="p-5 border border-slate-50 bg-slate-50/30 rounded-2xl space-y-4 hover:border-red-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-[13px] uppercase tracking-tight">{t.title}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-red-500 uppercase">MÃ: {t.code}</span>
                          <span className="text-[9px] font-black text-slate-300"> | </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">PHỤ TRÁCH: {users.find(u => u.id === t.assigneeId)?.name}</span>
                        </div>
                      </div>
                    </div>
                    <textarea 
                      className="w-full p-4 bg-white border border-slate-100 rounded-xl text-[12px] h-28 focus:ring-2 focus:ring-red-100 outline-none transition-all placeholder:italic font-medium text-slate-700"
                      placeholder="Nhập nội dung giải trình chi tiết về nguyên nhân và giải pháp..."
                      value={t.reportExplanation || ''}
                      onChange={(e) => onUpdateTask(t.id, { reportExplanation: e.target.value })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <FileText size={18} />
              </div>
              <h3 className="font-black text-slate-900 uppercase text-[12px] tracking-tight">TỔNG KẾT & ĐÁNH GIÁ THÁNG</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
              Nội dung này sẽ xuất hiện trong phần III của báo cáo PDF chính thức.
            </p>
            <textarea 
              className="w-full p-6 bg-slate-50 border border-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-[13px] h-[350px] resize-none transition-all font-medium text-slate-700 leading-relaxed shadow-inner"
              placeholder="Nhập nội dung tổng kết chung về hiệu suất, các thành tựu đạt được và phương hướng cải thiện..."
              value={monthlyConclusion}
              onChange={(e) => setMonthlyConclusion(e.target.value)}
            />
            <button 
              onClick={handleSaveDraft}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-[0.98]"
            >
              CẬP NHẬT NỘI DUNG TỔNG KẾT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
