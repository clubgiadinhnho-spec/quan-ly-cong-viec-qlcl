import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, User, OfficialReport, ReportDraft } from '../types';
import { formatDate } from '../lib/dateUtils';
import { 
  AlertCircle, Plus, Paperclip, Calendar, Download, Clock, ChevronDown, CheckCircle, FileText, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, getDoc } from 'firebase/firestore';
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
    const confirmed = window.confirm("Bạn có muốn CHỐT báo cáo này và lưu vào lịch sử chính thức không?");
    if (!confirmed) return;

    setIsExportingPDF(true);
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
      console.warn("Lỗi lưu DB:", err);
    }

    if (!printTemplateRef.current) return;

    try {
      const element = printTemplateRef.current;
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
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });

      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`BaoCao_QC_${reportPeriod.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const issues = tasks.filter((t) => t.isHighlighted).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              BÁO CÁO THÁNG: 
              <input 
                type="text" 
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="bg-transparent border-none p-0 text-blue-600 font-black text-xl w-40 focus:ring-0"
              />
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Tổng hợp chỉ số KPIs & Vấn đề</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-black transition-all flex items-center gap-2"
          >
            <Clock size={16} /> Lịch sử
          </button>
          <button 
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black hover:bg-gray-50 transition-all"
          >
            {isSavingDraft ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <Download size={16} /> {isExportingPDF ? 'Đang xuất...' : 'Xuất PDF & Chốt'}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-full flex justify-between items-center mb-2">
            <h3 className="text-xs font-black text-gray-400 uppercase">Báo cáo đã chốt</h3>
            <button onClick={() => setShowHistory(false)}><X size={16} /></button>
          </div>
          {officialReports.map(report => (
            <div key={report.id} className="p-4 border border-gray-50 bg-gray-50 rounded-xl">
              <p className="font-black text-gray-900">{report.monthYear}</p>
              <p className="text-[10px] text-gray-400">Ngày lập: {formatDate(report.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Tổng nhiệm vụ', val: total, color: 'blue' },
          { label: 'Hoàn thành', val: completed, color: 'green' },
          { label: 'Vấn đề nổi cộm', val: issues, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black text-${stat.color}-600`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <AlertCircle className="text-red-500" />
          <h3 className="font-black text-gray-800 uppercase text-sm">VẤN ĐỀ CẦN GIẢI TRÌNH ({issues})</h3>
        </div>
        <div className="p-6 space-y-4">
          {tasks.filter(t => t.isHighlighted).map(t => (
            <div key={t.id} className="p-4 border border-gray-50 bg-gray-50 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-black text-gray-900 text-sm">{t.code} - {t.title}</h4>
                <span className="text-[10px] font-black text-gray-400 uppercase">{users.find(u => u.id === t.assigneeId)?.name}</span>
              </div>
              <textarea 
                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs h-24 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Nhập giải trình..."
                value={t.reportExplanation || ''}
                onChange={(e) => onUpdateTask(t.id, { reportExplanation: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-black text-gray-800 uppercase text-sm">TỔNG KẾT THÁNG</h3>
        <textarea 
          className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-sm h-40 resize-none transition-all"
          placeholder="Nhập nội dung tổng kết..."
          value={monthlyConclusion}
          onChange={(e) => setMonthlyConclusion(e.target.value)}
        />
      </div>

      <div ref={printTemplateRef} style={{ display: 'none', padding: '20mm', width: '210mm' }}>
         <h2 style={{ textAlign: 'center', textTransform: 'uppercase' }}>Báo cáo kết quả công tác tháng</h2>
         <p style={{ textAlign: 'center' }}>Kỳ báo cáo: {reportPeriod}</p>
         <hr />
         <h4>1. Thống kê</h4>
         <p>Tổng: {total} | Hoàn thành: {completed} | Vấn đề: {issues}</p>
         <h4>2. Giải trình vấn đề nổi cộm</h4>
         {tasks.filter(t => t.isHighlighted).map((t, i) => (
           <div key={i} style={{ marginBottom: '10px' }}>
             <p><b>{t.title}:</b> {t.reportExplanation || 'Chưa nội dung'}</p>
           </div>
         ))}
         <h4>3. Tổng kết</h4>
         <p style={{ whiteSpace: 'pre-wrap' }}>{monthlyConclusion}</p>
      </div>
    </div>
  );
};
