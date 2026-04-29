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

  const cleanColors = (el: HTMLElement) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode() as HTMLElement;
    while (node) {
      const style = window.getComputedStyle(node);
      const bg = style.backgroundColor;
      const tc = style.color;
      const bc = style.borderColor;
      
      if (bg.includes('oklch')) node.style.backgroundColor = '#ffffff';
      if (tc.includes('oklch')) node.style.color = '#111827';
      if (bc.includes('oklch')) node.style.borderColor = '#e5e7eb';
      node = walker.nextNode() as HTMLElement;
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
      
      cleanColors(element);

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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
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
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold', borderBottom: '1px solid black' }}>HỆ THỐNG QUẢN LÝ QC</p>
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
    </div>
  );
};
