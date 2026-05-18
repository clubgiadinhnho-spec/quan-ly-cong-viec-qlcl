import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, User, OfficialReport, ReportDraft } from '../types';
import { formatDate } from '../lib/dateUtils';
import { 
  AlertCircle, Paperclip, Calendar, Download, Clock, CheckCircle2, FileText, X, TrendingUp, Briefcase, Sparkles, GraduationCap, UserCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { isTaskDeleted, isUserTask } from '../utils/userUtils';

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
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentUser.id);
  const [staffExplanation, setStaffExplanation] = useState('');
  const [leaderEvaluation, setLeaderEvaluation] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const printTemplateRef = useRef<HTMLDivElement>(null);

  // Filter tasks by month and selected user
  const currentMonthTasks = useMemo(() => {
    const [month, year] = reportPeriod.split('/');
    if (!month || !year) return [];
    return tasks.filter(t => {
      if (isTaskDeleted(t)) return false;
      const date = new Date(t.issueDate);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = String(date.getFullYear());
      const belongsToUser = selectedStaffId === 'ALL' || t.assigneeId === selectedStaffId;
      return m === month && y === year && belongsToUser;
    });
  }, [tasks, reportPeriod, selectedStaffId]);

  // KPI Categories Const
  const KPI_CATEGORIES = {
    PROFESSIONAL: { 
      codes: ['TNG', 'CBO', 'UCB', 'CNH', 'KNN', 'KNB'] 
    },
    DEVELOPMENT: { 
      codes: ['CTI', 'TTT', 'HOC', 'DTA', 'AI'] 
    }
  };

  // Stats for Dashboard
  const stats = useMemo(() => {
    const total = currentMonthTasks.length;
    const completed = currentMonthTasks.filter(t => t.status === 'APPROVED').length;
    const kpiRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const profTasks = currentMonthTasks.filter(t => KPI_CATEGORIES.PROFESSIONAL.codes.includes(t.category || ''));
    const profCount = profTasks.filter(t => t.status === 'APPROVED').length;
    const cảiTiếnCount = currentMonthTasks.filter(t => t.category === 'CTI' && t.status === 'APPROVED').length;
    
    // AI participation
    const aiTasks = currentMonthTasks.filter(t => t.category === 'AI');
    const aiCount = aiTasks.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED').length;
    const aiRate = total > 0 ? Math.round((aiCount / total) * 100) : 0;

    // QCD Calculation
    const completedWithQCD = currentMonthTasks.filter(t => (t.status === 'COMPLETED' || t.status === 'APPROVED') && t.leaderQCD);
    const qcdRate = completedWithQCD.length > 0 
      ? Math.round((completedWithQCD.reduce((acc, t) => acc + ((t.leaderQCD!.q + t.leaderQCD!.c + t.leaderQCD!.d) / 3), 0) / completedWithQCD.length) / 5 * 100)
      : 0;

    return { kpiRate, profCount, cảiTiếnCount, aiRate, qcdRate };
  }, [currentMonthTasks]);

  const getCategoryKPI = (code: string) => {
    const catTasks = currentMonthTasks.filter(t => t.category === code);
    if (catTasks.length === 0) return '100%';
    const done = catTasks.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED').length;
    return `${Math.round((done / catTasks.length) * 100)}%`;
  };

  useEffect(() => {
    loadDraft();
  }, [reportPeriod, selectedStaffId]);

  const loadDraft = async () => {
    try {
      const draftId = `${reportPeriod.replace(/\//g, '-')}_${selectedStaffId}`;
      const draftDoc = await getDoc(doc(db, 'report_drafts', draftId));
      if (draftDoc.exists()) {
        const data = draftDoc.data() as any;
        setStaffExplanation(data.staffExplanation || '');
        setLeaderEvaluation(data.leaderEvaluation || '');
      } else {
        setStaffExplanation('');
        setLeaderEvaluation('');
      }
    } catch (err) {
      console.warn("Lỗi tải bản nháp:", err);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await onSaveDraft({
        monthYear: reportPeriod,
        content: JSON.stringify({ staffExplanation, leaderEvaluation }),
        userId: selectedStaffId,
        updatedAt: new Date().toISOString()
      } as any);
    } catch (err) {
      console.error("Lưu nháp thất bại:", err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleExportPDF = async () => {
    const confirmed = window.confirm("XUẤT BÁO CÁO PDF? \n\nHệ thống sẽ chuẩn bị file A4 chuyên nghiệp.");
    if (!confirmed) return;

    setIsExportingPDF(true);
    
    if (!printTemplateRef.current) return;

    try {
      const element = printTemplateRef.current;
      const originalStyle = element.style.cssText;
      
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
        windowWidth: 1200,
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
      pdf.save(`BAO_CAO_KPI_${reportPeriod.replace(/\//g, '_')}_${selectedStaffId}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Lỗi khi tạo file PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const getStatusColor = (kpi: string) => {
    if (kpi === 'N/A') return 'text-gray-400';
    if (kpi === '0%') return 'text-red-400';
    const num = parseInt(kpi);
    if (num >= 100) return 'text-emerald-600 font-black';
    return 'text-red-600 font-black';
  };

  const getResultLabel = (kpi: string) => {
    if (kpi === 'N/A') return <span translate="no" className="notranslate text-gray-400">N/A</span>;
    const num = parseInt(kpi);
    if (num >= 100) return <span translate="no" className="notranslate text-emerald-600 font-black">ĐẠT</span>;
    return <span translate="no" className="notranslate text-red-600 font-black animate-pulse">KHÔNG ĐẠT</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500 px-4">
      
      {/* 1. Dashboard Header & Global Controls */}
      <div className="bg-white rounded-md shadow-2xl border-4 border-blue-50 overflow-hidden px-8 py-8 transition-all duration-300">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-md shadow-xl shadow-blue-200 flex items-center justify-center text-white shrink-0">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">
                  <span translate="no" className="notranslate">BÁO CÁO THÁNG</span>
                </h1>
                <input 
                  type="text" 
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="bg-transparent border-none px-0 py-0 text-slate-900 font-black text-3xl outline-none w-32 tracking-tight uppercase focus:ring-0"
                  translate="no"
                />
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={currentUser.role === 'Staff'}
                  className={`bg-slate-50 border border-slate-200 px-3 py-1.5 text-slate-600 font-bold text-xs rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 uppercase ${currentUser.role === 'Staff' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentUser.role !== 'Staff' && <option value="ALL" translate="no" className="notranslate">TOÀN PHÒNG</option>}
                  {users.map(u => (
                    <option key={u.id} value={u.id} translate="no" className="notranslate">{u.name.toUpperCase()}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span translate="no" className="notranslate">HỆ THỐNG KPI TỰ ĐỘNG</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="h-12 px-6 bg-white border-2 border-slate-100 text-slate-600 rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-lg transition-all active:scale-95"
            >
              <span translate="no" className="notranslate">{isSavingDraft ? 'ĐANG LƯU...' : 'LƯU BẢN NHÁP'}</span>
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="h-12 px-8 bg-white border-2 border-blue-600 text-blue-600 rounded-md text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-3"
            >
              <Download size={20} strokeWidth={3} />
              <span translate="no" className="notranslate">{isExportingPDF ? 'ĐANG XỬ LÝ...' : 'TRÍCH XUẤT PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'TỔNG KPI ĐẠT', value: `${stats.kpiRate}%`, icon: CheckCircle2, color: 'bg-emerald-500' },
          { title: 'CHUYÊN MÔN', value: stats.profCount, icon: Briefcase, color: 'bg-blue-600' },
          { title: 'CẢI TIẾN', value: stats.cảiTiếnCount, icon: Sparkles, color: 'bg-amber-500' },
          { title: 'ĐÀO TẠO & AI', value: `${stats.aiRate}%`, icon: GraduationCap, color: 'bg-indigo-600' }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`${item.color} p-3 rounded-md shadow-2xl border-b-4 border-black/10 relative overflow-hidden group text-white`}
          >
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-125 transition-transform duration-500">
              <item.icon size={70} />
            </div>
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-1 bg-white/20 rounded-md">
                <item.icon size={14} strokeWidth={2.5} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-none">
                <span translate="no" className="notranslate">{item.title}</span>
              </p>
            </div>
            <p className="text-3xl font-black leading-none relative z-10">
              <span translate="no" className="notranslate">{item.value}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* 3. Professional KPI Table */}
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-blue-600 text-white sticky top-0 z-20">
                <th className="px-4 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 border-white/20 whitespace-nowrap w-[12%]">
                  <span translate="no" className="notranslate">NHÓM KPI</span>
                </th>
                <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 border-white/20 w-[22%]">
                  <span translate="no" className="notranslate">NỘI DUNG KPI</span>
                </th>
                <th className="px-4 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 border-white/20 w-[8%]">
                  <span translate="no" className="notranslate">TỶ TRỌNG</span>
                </th>
                <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 border-white/20 w-[8%]">
                  <span translate="no" className="notranslate">KPI</span>
                </th>
                <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 border-white/20 w-[10%]">
                  <span translate="no" className="notranslate">KẾT QUẢ</span>
                </th>
                <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-widest border border-slate-300 w-[40%]">
                  <span translate="no" className="notranslate">DIỄN GIẢI CHI TIẾT</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {/* NHÓM 1: KPI TÀI CHÍNH (30%) */}
              <tr className="bg-slate-50/50">
                <td rowSpan={2} className="px-4 py-6 font-black text-blue-800 border border-slate-300 bg-blue-50/30 align-middle text-center w-32">
                  <span translate="no" className="notranslate uppercase">1. KPI TÀI CHÍNH (30%)</span>
                </td>
                <td className="px-6 py-4 border border-slate-300">
                  <span translate="no" className="notranslate font-bold uppercase text-slate-700">DT Net (Net Revenue)</span>
                </td>
                <td className="px-4 py-4 text-center border border-slate-300 font-black text-blue-600">15%</td>
                <td className="px-6 py-4 text-center border border-slate-300 font-bold text-slate-400 italic">N/A</td>
                <td className="px-6 py-4 text-center border border-slate-300">
                  <span translate="no" className="notranslate text-slate-400 italic">N/A</span>
                </td>
                <td className="px-6 py-4 border border-slate-300 text-slate-400 italic text-[11px]">
                  <span translate="no" className="notranslate">Báo cáo từ Kế toán Quản trị</span>
                </td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="px-6 py-4 border border-slate-300">
                  <span translate="no" className="notranslate font-bold uppercase text-slate-700">EBITDA</span>
                </td>
                <td className="px-4 py-4 text-center border border-slate-300 font-black text-blue-600">15%</td>
                <td className="px-6 py-4 text-center border border-slate-300 font-bold text-slate-400 italic">N/A</td>
                <td className="px-6 py-4 text-center border border-slate-300">
                  <span translate="no" className="notranslate text-slate-400 italic">N/A</span>
                </td>
                <td className="px-6 py-4 border border-slate-300 text-slate-400 italic text-[11px]">
                  <span translate="no" className="notranslate">Báo cáo từ Kế toán Quản trị</span>
                </td>
              </tr>

              {/* NHÓM 2: KPI CHUYÊN MÔN (55%) */}
              {(() => {
                const group2Items = [
                  { label: 'Tiếp nhận và triển khai xử lý khiếu nại khách hàng KNN <=48h (Bên ngoài và nội bộ)', weight: '15%', kpi: getCategoryKPI('KNN') },
                  { label: 'Tiếp nhận và triển khai xử lý khiếu nại khách hàng B2C <=48h (Bên ngoài và nội bộ) mảng B2C', weight: '10%', kpi: '100%' },
                  { label: 'Hoàn thành 100% hồ sơ công bố của TPP', weight: '15%', kpi: getCategoryKPI('CBO') },
                  { label: 'Hoàn thành 100% công tác kiểm soát 5S tại các NM', weight: '5%', kpi: '100%' },
                  { label: 'Hoàn thành 100% công tác hỗ trợ đánh giá chứng nhận các HT.QLCL (Phối hợp cùng NM)', weight: '5%', kpi: '100%' },
                  { label: 'Tỷ lệ đáp ứng yêu cầu từ các bộ phận khác (Khảo sát)', weight: '5%', kpi: '100%' }
                ];

                return group2Items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    {idx === 0 && (
                      <td rowSpan={6} className="px-4 py-8 font-black text-blue-800 border border-slate-300 bg-blue-50/30 align-middle text-center">
                        <span translate="no" className="notranslate uppercase">2. KPI CHUYÊN MÔN (55%)</span>
                      </td>
                    )}
                    <td className="px-6 py-4 border border-slate-300">
                      <span translate="no" className="notranslate font-bold text-slate-800 leading-snug">{item.label}</span>
                    </td>
                    <td className="px-4 py-4 text-center border border-slate-300 font-black text-blue-600">{item.weight}</td>
                    <td className={`px-6 py-4 text-center border border-slate-300 font-black text-[16px] ${getStatusColor(item.kpi)}`}>
                      <span translate="no" className="notranslate">{item.kpi}</span>
                    </td>
                    <td className="px-6 py-4 text-center border border-slate-300">
                      {getResultLabel(item.kpi)}
                    </td>
                    <td className="px-6 py-4 border border-slate-300 text-slate-500 text-[11px] italic">
                      <span translate="no" className="notranslate">Dữ liệu hệ thống quản trị công việc</span>
                    </td>
                  </tr>
                ));
              })()}

              {/* NHÓM 4: HIỆU QUẢ/CHẤT LƯỢNG CÔNG VIỆC (20%) */}
              <tr className="bg-amber-50/30 hover:bg-amber-100/30 transition-colors">
                <td className="px-4 py-8 font-black text-amber-800 border border-slate-300 bg-amber-50/80 align-middle text-center">
                  <span translate="no" className="notranslate uppercase text-xs">HIỆU QUẢ CÔNG VIỆC (20%)</span>
                </td>
                <td className="px-6 py-4 border border-slate-300">
                  <span translate="no" className="notranslate font-bold text-slate-800 leading-snug">Chỉ số đánh giá Chất lượng - Chi phí - Tiến độ (Q-C-D) bình quân tháng</span>
                </td>
                <td className="px-4 py-4 text-center border border-slate-300 font-black text-amber-600">20%</td>
                <td className={`px-6 py-4 text-center border border-slate-300 font-black text-[18px] text-amber-700`}>
                  <span translate="no" className="notranslate">{stats.qcdRate}%</span>
                </td>
                <td className="px-6 py-4 text-center border border-slate-300">
                  {getResultLabel(`${stats.qcdRate}%`)}
                </td>
                <td className="px-6 py-4 border border-slate-300 text-slate-500 text-[11px] italic">
                  <span translate="no" className="notranslate">Dữ liệu đánh giá Q-C-D trực tiếp từ Lãnh đạo cho từng đầu việc.</span>
                </td>
              </tr>

              {/* NHÓM 3: KPI PHÁT TRIỂN TỔ CHỨC (15%) */}
              {(() => {
                const group3Items = [
                  { label: 'Số sáng kiến/cải tiến được ghi nhận: 1 cải tiến/tháng/phòng', weight: '2%', kpi: '1' },
                  { label: '100% nhân sự phòng đáp ứng và thực thi 3T', weight: '2%', kpi: '100%' },
                  { label: '30% nhân sự phòng ứng dụng AI vào công việc', weight: '2%', kpi: '100%' },
                  { label: '100% nhân sự phòng tham gia đào tạo, chia sẻ nội bộ', weight: '2%', kpi: '100%' },
                  { label: '100% nhân sự tham gia chương trình nội bộ (Theo tiêu chuẩn tập đoàn)', weight: '2%', kpi: '100%' }
                ];

                return group3Items.map((item, idx) => (
                  <tr key={idx} className="bg-slate-50/30 hover:bg-indigo-50/30 transition-colors">
                    {idx === 0 && (
                      <td rowSpan={5} className="px-4 py-8 font-black text-indigo-800 border border-slate-300 bg-indigo-50/30 align-middle text-center">
                        <span translate="no" className="notranslate uppercase">3. KPI PHÁT TRIỂN TỔ CHỨC (15%)</span>
                      </td>
                    )}
                    <td className="px-6 py-4 border border-slate-300">
                      <span translate="no" className="notranslate font-bold text-slate-800 leading-snug">{item.label}</span>
                    </td>
                    <td className="px-4 py-4 text-center border border-slate-300 font-black text-indigo-600">{item.weight}</td>
                    <td className={`px-6 py-4 text-center border border-slate-300 font-black text-[16px] ${getStatusColor(item.kpi)}`}>
                      <span translate="no" className="notranslate">{item.kpi}</span>
                    </td>
                    <td className="px-6 py-4 text-center border border-slate-300">
                      {getResultLabel(item.kpi)}
                    </td>
                    <td className="px-6 py-4 border border-slate-300 text-slate-500 text-[11px] italic">
                      <span translate="no" className="notranslate">Tham gia hoạt động văn hóa & đào tạo TPP</span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Explanation & Management Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff Explanation Area */}
        <div className="bg-white p-8 rounded-md shadow-2xl border-2 border-slate-200 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-md">
              <UserCircle size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight">
                 <span translate="no" className="notranslate">GIẢI TRÌNH & Ý KIẾN NHÂN VIÊN</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                <span translate="no" className="notranslate">TỰ ĐÁNH GIÁ CÁC CHỈ SỐ CHƯA ĐẠT (NẾU CÓ)</span>
              </p>
            </div>
          </div>
          <textarea 
            className="w-full p-6 bg-slate-50/50 border-2 border-slate-200 rounded-md outline-none focus:ring-4 focus:ring-emerald-50 text-[14px] h-[300px] resize-none transition-all font-medium text-slate-700 leading-relaxed shadow-inner placeholder:text-slate-300"
            placeholder="Nhập nội dung giải trình chi tiết về tiến độ, khó khăn và lý do tại sao KPI chưa đạt..."
            value={staffExplanation}
            onChange={(e) => setStaffExplanation(e.target.value)}
          />
        </div>

        {/* Management Evaluation Area */}
        <div className="bg-white p-8 rounded-md shadow-2xl border-2 border-slate-200 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-md">
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-lg tracking-tight">
                <span translate="no" className="notranslate">ĐÁNH GIÁ CỦA TRƯỞNG PHÒNG</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                <span translate="no" className="notranslate">CHỈ ĐẠO & ĐỊNH HƯỚNG CẢI THIỆN</span>
              </p>
            </div>
          </div>
          <textarea 
            className="w-full p-6 bg-slate-50/50 border-2 border-slate-200 rounded-md outline-none focus:ring-4 focus:ring-blue-50 text-[14px] h-[300px] resize-none transition-all font-medium text-slate-700 leading-relaxed shadow-inner placeholder:text-slate-300"
            placeholder="Ghi chú đánh giá hiệu suất của nhân viên trong tháng và các chỉ đạo thực hiện cho tháng tiếp theo..."
            value={leaderEvaluation}
            onChange={(e) => setLeaderEvaluation(e.target.value)}
          />
        </div>
      </div>

      {/* 5. PDF Print Template (Hidden) */}
      <div ref={printTemplateRef} className="hidden" style={{ width: '210mm', padding: '20mm', background: 'white', color: 'black', fontFamily: 'serif' }}>
        {/* PDF Header */}
        <div className="flex justify-between border-b-2 border-black pb-4 mb-8">
          <div className="text-center w-1/2">
            <p className="font-black text-[11pt] uppercase">TẬP ĐOÀN TÂN PHÚ</p>
            <p className="font-black text-[11pt] uppercase">PHÒNG QLCL</p>
          </div>
          <div className="text-center w-1/2">
            <p className="font-black text-[11pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="font-bold text-[10pt]">Độc lập - Tự do - Hạnh phúc</p>
            <div className="w-24 h-0.5 bg-black mx-auto mt-1"></div>
          </div>
        </div>

        <h1 className="text-center text-[20pt] font-black uppercase mb-2">BÁO CÁO THEO DÕI KPI THÁNG</h1>
        <p className="text-center text-[13pt] italic mb-10">{reportPeriod} - Nhân sự: {users.find(u => u.id === selectedStaffId)?.name.toUpperCase() || 'TOÀN PHÒNG'}</p>

        {/* Dashboard Stats in PDF */}
        <div className="grid grid-cols-4 gap-4 mb-8">
           {[
             { label: 'KPI ĐẠT', val: `${stats.kpiRate}%` },
             { label: 'CHUYÊN MÔN', val: stats.profCount },
             { label: 'CẢI TIẾN', val: stats.cảiTiếnCount },
             { label: 'AI & ĐÀO TẠO', val: `${stats.aiRate}%` }
           ].map((s, i) => (
             <div key={i} className="border-2 border-black p-3 text-center">
                <p className="text-[9pt] font-bold mb-1 uppercase">{s.label}</p>
                <p className="text-[14pt] font-black">{s.val}</p>
             </div>
           ))}
        </div>

        {/* Table in PDF */}
        <table className="w-full border-collapse border-2 border-black text-[10pt] mb-10">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="border border-black p-2 bg-gray-200">NHÓM KPI</th>
              <th className="border border-black p-2 bg-gray-200">NỘI DUNG KPI</th>
              <th className="border border-black p-2 bg-gray-200">KPI (%)</th>
              <th className="border border-black p-2 bg-gray-200">KẾT QUẢ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-3 font-bold text-center">TÀI CHÍNH (30%)</td>
              <td className="border border-black p-3" colSpan={3}>Dữ liệu theo dõi độc lập (DT Net: N/A | EBITDA: N/A)</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-bold text-center">CHUYÊN MÔN (55%)</td>
              <td className="border border-black p-0" colSpan={3}>
                <table className="w-full border-none">
                  <tbody>
                    <tr className="border-b border-black italic">
                        <td className="p-2 w-1/2">Khiếu nại khách hàng KNN (&lt;=48h)</td>
                        <td className="p-2 border-l border-black text-center">{getCategoryKPI('KNN')}</td>
                        <td className="p-2 border-l border-black text-center">{getResultLabel(getCategoryKPI('KNN'))}</td>
                    </tr>
                    <tr className="border-b border-black italic">
                        <td className="p-2 w-1/2">Khiếu nại khách hàng B2C (&lt;=48h)</td>
                        <td className="p-2 border-l border-black text-center">100%</td>
                        <td className="p-2 border-l border-black text-center">ĐẠT</td>
                    </tr>
                    <tr className="border-b border-black italic">
                        <td className="p-2 w-1/2">Hồ sơ công bố TPP (CBO)</td>
                        <td className="p-2 border-l border-black text-center">{getCategoryKPI('CBO')}</td>
                        <td className="p-2 border-l border-black text-center">{getResultLabel(getCategoryKPI('CBO'))}</td>
                    </tr>
                    <tr className="italic">
                        <td className="p-2 w-1/2">Kiểm soát 5S & HT.QLCL</td>
                        <td className="p-2 border-l border-black text-center">100%</td>
                        <td className="p-2 border-l border-black text-center">ĐẠT</td>
                    </tr>
                    <tr className="italic border-t border-black bg-gray-50">
                        <td className="p-2 w-1/2 font-bold">HIỆU QUẢ/CHẤT LƯỢNG (Q-C-D)</td>
                        <td className="p-2 border-l border-black text-center font-bold">{stats.qcdRate}%</td>
                        <td className="p-2 border-l border-black text-center font-bold">{getResultLabel(`${stats.qcdRate}%`)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-bold text-center">PHÁT TRIỂN (15%)</td>
              <td className="border border-black p-0" colSpan={3}>
                <table className="w-full border-none">
                  <tbody>
                   <tr className="border-b border-black italic">
                      <td className="p-2 w-1/2">Cải tiến sáng kiến (CTI)</td>
                      <td className="p-2 border-l border-black text-center">{stats.cảiTiếnCount}</td>
                      <td className="p-2 border-l border-black text-center">ĐẠT</td>
                   </tr>
                   <tr className="italic">
                      <td className="p-2 w-1/2">Ứng dụng AI</td>
                      <td className="p-2 border-l border-black text-center">{stats.aiRate}%</td>
                      <td className="p-2 border-l border-black text-center">ĐẠT</td>
                   </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer info */}
        <div className="grid grid-cols-2 gap-10 mt-10">
           <div className="space-y-4">
              <h4 className="font-bold underline text-[12pt] mb-2 uppercase">GIẢI TRÌNH CỦA NHÂN VIÊN:</h4>
              <p className="text-[11pt] leading-relaxed text-justify">{staffExplanation || '........................................................................'}</p>
           </div>
           <div className="space-y-4">
              <h4 className="font-bold underline text-[12pt] mb-2 uppercase">Ý KIẾN CỦA TRƯỞNG PHÒNG:</h4>
              <p className="text-[11pt] leading-relaxed text-justify">{leaderEvaluation || '........................................................................'}</p>
           </div>
        </div>

        <div className="flex justify-between mt-20 px-10">
           <div className="text-center">
              <p className="font-black mb-16 uppercase">NGƯỜI LẬP BIỂU</p>
              <p className="font-bold">{users.find(u => u.id === selectedStaffId)?.name || '........................'}</p>
           </div>
           <div className="text-center">
              <p className="italic text-[10pt] mb-1">TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
              <p className="font-black mb-16 uppercase">TRƯỞNG PHÒNG QUẢN LÝ CHẤT LƯỢNG</p>
              <p className="font-bold italic opacity-50">BÀNH NHỰT HÙNG</p>
           </div>
        </div>
      </div>
    </div>
  );
};
