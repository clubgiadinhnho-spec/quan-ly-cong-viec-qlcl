import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, User, OfficialReport, ReportDraft } from '../types';
import { 
  AlertCircle, Paperclip, Calendar, Download, Clock, CheckCircle2, FileText, X, TrendingUp, Briefcase, Sparkles, GraduationCap, UserCircle, Settings, Users, Check, Save, RotateCcw, ChevronDown, ChevronUp, Edit, Trash2, ChevronLeft, ChevronRight, Printer, ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { isTaskDeleted } from '../utils/userUtils';
import { cleanModernColors, oklchToRgbOrHex } from '../lib/colorUtils';

interface ReportPageProps {
  tasks: Task[];
  users: User[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  currentUser: User;
  officialReports: OfficialReport[];
  onSaveDraft: (draft: Omit<ReportDraft, 'id'>) => Promise<void>;
  onSaveOfficialReport: (report: Omit<OfficialReport, 'id'>) => Promise<void>;
  activeTab: 'dept' | 'staff' | 'config';
  setActiveTab: (tab: 'dept' | 'staff' | 'config') => void;
}

interface KPIItem {
  id: string;
  section: 'A' | 'B' | 'C';
  stt: number;
  label: string;
  weight: number;
  weightLeader?: number;
  kpis: string;
  kpisLeader?: string;
  code: string;
  defaultAlloc: { tan: number; tu: number; hung: number };
  coEval?: boolean;
}

const DEFAULT_KPI_ITEMS: KPIItem[] = [
  {
    id: 'A1', section: 'A', stt: 1,
    label: 'Tổ chức duy trì, cải tiến các Hệ thống QLCL đang áp dụng (CN.LAN: ISO 9001, BRCGS...; CN.BNI: ISO 9001, ISO 15378, BRCGS...) và áp dụng mô hình mới.',
    weight: 30, kpis: 'Tái chứng nhận/ Chứng nhận mới đạt yêu cầu [KHT].', code: 'KHT',
    defaultAlloc: { tan: 50, tu: 30, hung: 20 }
  },
  {
    id: 'A2', section: 'A', stt: 2,
    label: 'Hoạt động check nhãn hàng hóa (nhãn sản phẩm, hdsd, nội dung khắc trên khuôn) phù hợp luật định và thỏa mãn khách hàng; kịp tiến độ sản xuất, tung hàng.',
    weight: 10, kpis: 'Tuân thủ luật định, Kịp tiến độ [CNH].', code: 'CNH',
    defaultAlloc: { tan: 40, tu: 30, hung: 30 }
  },
  {
    id: 'A3', section: 'A', stt: 3,
    label: 'Thu thập hồ sơ, tự công bố, công bố hợp quy (theo QCVN; TCVN...) phù hợp quy định luật và yêu cầu khách hàng; kịp tiến độ sản xuất, bán hàng.',
    weight: 15, kpis: 'Tuân thủ luật định, Kịp tiến độ [CBO].', code: 'CBO',
    defaultAlloc: { tan: 40, tu: 30, hung: 30 }
  },
  {
    id: 'A4', section: 'A', stt: 4,
    label: 'Tiếp nhận, xử lý khiếu nại khách hàng bên ngoài và nội bộ (KNKH < 48h). Theo dõi khắc phục và cải tiến hệ thống.',
    weight: 10, kpis: '< 48h [KNN].', code: 'KNN',
    defaultAlloc: { tan: 30, tu: 30, hung: 40 }
  },
  {
    id: 'A5', section: 'A', stt: 5,
    label: 'Quản lý đăng ký SHTT ngoài nước (đăng ký tại các nước BLĐ chỉ định, xử lý vấn đề phát sinh đúng hạn theo quy định sở tại).',
    weight: 5, kpis: '100% đúng hạn [IPT].', code: 'IPT',
    defaultAlloc: { tan: 100, tu: 0, hung: 0 }
  },
  {
    id: 'A6', section: 'A', stt: 6,
    label: 'Xác thực chất lượng sản phẩm (an toàn thực phẩm, tiêu chuẩn công bố, kịp tiến độ thông quan, tung hàng, bán hàng).',
    weight: 10, kpis: 'Tuân thủ luật định, Kịp tiến độ [TNG].', code: 'TNG',
    defaultAlloc: { tan: 0, tu: 0, hung: 100 }
  },
  {
    id: 'A7', section: 'A', stt: 7,
    label: 'Tư vấn chuyên môn liên quan đến hoạt động P.QLCL (nhãn, công bố, thử nghiệm, HTQLCL...) cho khách hàng ngoài và nội bộ.',
    weight: 5, kpis: 'Tuân thủ luật định [TVA].', code: 'TVA',
    defaultAlloc: { tan: 40, tu: 30, hung: 30 }
  },
  {
    id: 'A8', section: 'A', stt: 8,
    label: 'Tổ chức duy trì, cải tiến hệ thống 5S tại các Chi nhánh TPP (đánh giá chéo, tự đánh giá, báo cáo tổng hợp chấm điểm, duy trì 5S).',
    weight: 5, kpis: 'Lập kế hoạch và Báo cáo đúng hạn [5SS].', code: '5SS',
    defaultAlloc: { tan: 15, tu: 15, hung: 70 }
  },
  {
    id: 'A9', section: 'A', stt: 9,
    label: 'Phát triển bản thân (tự học hỏi, nghiên cứu luật định, đào tạo áp dụng kiến thức mới thích nghi thay đổi). Mỗi tháng chia sẻ/báo cáo chuyên đề.',
    weight: 5, kpis: '1 tài liệu / tháng [PBT].', code: 'PBT',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'B1', section: 'B', stt: 1,
    label: 'Hoạt động phát sinh ngoài chức năng/nhiệm vụ (ví dụ: kiểm soát gia công Hóa Mỹ Phẩm). Ghi nhận và đánh giá cuối tháng dưới 10% trọng số.',
    weight: 0, kpis: 'Đáp ứng yêu cầu của BLĐ [PSI].', code: 'PSI',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'C1', section: 'C', stt: 1,
    label: 'Số sáng kiến/cải tiến được ghi nhận trên App My Tasco (CB.CNV có ít nhất 1 cải tiến / tháng).',
    weight: 1, weightLeader: 2, kpis: '1 cải tiến / tháng [CTI].', kpisLeader: '1 cải tiến / tháng [CTI].', code: 'CTI',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'C2', section: 'C', stt: 2,
    label: 'Tỷ lệ tham gia các buổi đào tạo nâng cao năng lực và chia sẻ kỹ năng nội bộ.',
    weight: 1, weightLeader: 2, kpis: '100% buổi [DTA].', kpisLeader: '100% [DTA].', code: 'DTA',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'C3', section: 'C', stt: 3,
    label: 'Thực thi và đáp ứng văn hóa 3T của tập đoàn (Trả lời văn hóa Quiz, hoàn thành đánh giá QCD đúng cam kết).',
    weight: 1, weightLeader: 2, kpis: '100% tuân thủ [TTT].', kpisLeader: '100% tuân thủ [TTT].', code: 'TTT',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'C4', section: 'C', stt: 4,
    label: 'Ứg dụng AI (Gemini, ChatGPT...) tối ưu hóa hơn 60% tiến độ và chất lượng công việc thực tế của phòng.',
    weight: 1, weightLeader: 2, kpis: '>= 60% công việc [AIU].', kpisLeader: '>= 60% công việc [AIU].', code: 'AIU',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  },
  {
    id: 'C5', section: 'C', stt: 5,
    label: 'Tham gia đầy đủ, tích cực các chương trình hoạt động nội bộ của Tập đoàn.',
    weight: 1, weightLeader: 2, kpis: 'Tham gia đầy đủ các chương trình phong trào phát động [BCH].', kpisLeader: 'Tham gia đầy đủ các chương trình phong trào phát động [BCH].', code: 'BCH',
    defaultAlloc: { tan: 33, tu: 33, hung: 34 }
  }
];

const sanitizeBchKpiItems = (items: KPIItem[]): KPIItem[] => {
  return items.map(item => {
    if (item.code === 'BCH') {
      let cleanKpis = item.kpis || '';
      cleanKpis = cleanKpis.replace(/Bán chéo Bảo hiểm\s*:?\s*/gi, '')
                            .replace(/Bán chéo bảo hiểm\s*:?\s*/gi, '')
                            .trim();
      
      let cleanKpisLeader = item.kpisLeader || '';
      cleanKpisLeader = cleanKpisLeader.replace(/Bán chéo Bảo hiểm\s*:?\s*/gi, '')
                                        .replace(/Bán chéo bảo hiểm\s*:?\s*/gi, '')
                                        .trim();

      if (cleanKpis && /^[a-z]/.test(cleanKpis)) {
        cleanKpis = cleanKpis.charAt(0).toUpperCase() + cleanKpis.slice(1);
      }
      if (cleanKpisLeader && /^[a-z]/.test(cleanKpisLeader)) {
        cleanKpisLeader = cleanKpisLeader.charAt(0).toUpperCase() + cleanKpisLeader.slice(1);
      }

      return {
        ...item,
        kpis: cleanKpis,
        kpisLeader: cleanKpisLeader || undefined
      };
    }
    return item;
  });
};

const getUserRoleTitle = (u: any): string => {
  if (!u) return 'Nhân sự';
  const name = u.name || '';
  const normName = name.trim();
  if (normName === 'Lê Nhật Trường') {
    return 'Trưởng phòng';
  }
  if (normName === 'Võ Thị Mỹ Tân' || normName.includes('Mỹ Tân') || normName.includes('Tân')) {
    return 'Trưởng nhóm';
  }
  if (normName === 'Bành Nhựt Hùng' || normName.includes('Nhựt Hùng') || normName === 'Nguyễn Kiều Phan Tú' || normName.includes('Phan Tú') || normName.endsWith('Tú')) {
    return 'Nhân viên';
  }
  if (u.title && u.title !== 'CHUYÊN VIÊN QC' && u.title !== 'CHỜ CẬP NHẬT') {
    return u.title;
  }
  return u.role === 'Staff' ? 'Nhân viên' : 'Quản lý';
};

export const ReportPage = ({ 
  tasks, 
  users, 
  currentUser,
  onSaveDraft,
  activeTab,
  setActiveTab
}: ReportPageProps) => {
  const [reportPeriod, setReportPeriod] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMonth = params.get("report_month");
      if (urlMonth && /^\d{2}\/\d{4}$/.test(urlMonth)) {
        return urlMonth;
      }
    }
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const handlePrevMonth = () => {
    const parts = reportPeriod.split('/');
    if (parts.length !== 2) return;
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return;
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    setReportPeriod(`${String(month).padStart(2, '0')}/${year}`);
  };

  const handleNextMonth = () => {
    const parts = reportPeriod.split('/');
    if (parts.length !== 2) return;
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return;
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    setReportPeriod(`${String(month).padStart(2, '0')}/${year}`);
  };

  // Config period for configuration matrix mapping (independent of report month)
  const [configPeriod, setConfigPeriod] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const handlePrevConfigMonth = () => {
    const parts = configPeriod.split('/');
    if (parts.length !== 2) return;
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return;
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    setConfigPeriod(`${String(month).padStart(2, '0')}/${year}`);
  };

  const handleNextConfigMonth = () => {
    const parts = configPeriod.split('/');
    if (parts.length !== 2) return;
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year)) return;
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    setConfigPeriod(`${String(month).padStart(2, '0')}/${year}`);
  };

  const isLNT = currentUser.name === 'Lê Nhật Trường';
  const isReportManager = currentUser.role === 'Admin' || 
                          isLNT || 
                          (currentUser.title || '').toUpperCase().includes('TRƯỞNG PHÒNG') ||
                          currentUser.personalEmail === 'lenhattruong.tpp@gmail.com' ||
                          currentUser.personalEmail === 'lenhattruong.caphef1@gmail.com';
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlStaffId = params.get("report_staff_id");
      if (urlStaffId) return urlStaffId;
    }
    return "ALL";
  });
  const isLntSelected = users.find(u => u.id === selectedStaffId)?.name === 'Lê Nhật Trường';
  const [staffExplanation, setStaffExplanation] = useState('');
  const [leaderEvaluation, setLeaderEvaluation] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingKpiList, setIsSavingKpiList] = useState(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Print settings and UI state (standardized with other tabs)
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [modalPrintOrient, setModalPrintOrient] = useState<'portrait' | 'landscape'>('landscape');
  const [modalPrintScale, setModalPrintScale] = useState<number>(85);

  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search);
  }, []);

  const isPrintMode = useMemo(() => {
    return urlParams?.get('print') === 'true';
  }, [urlParams]);

  const layoutOrient = useMemo(() => {
    return urlParams?.get('layout_orient') || modalPrintOrient;
  }, [urlParams, modalPrintOrient]);

  const printScale = useMemo(() => {
    return Number(urlParams?.get('print_scale')) || modalPrintScale;
  }, [urlParams, modalPrintScale]);

  const handleOpenNewTabToPrint = () => {
    const printUrl = new URL(window.location.href);
    printUrl.searchParams.set('print', 'true');
    printUrl.searchParams.set('tab', 'reports');
    printUrl.searchParams.set('report_tab', activeTab);
    printUrl.searchParams.set('report_staff_id', selectedStaffId);
    printUrl.searchParams.set('report_month', reportPeriod);
    printUrl.searchParams.set('layout_orient', modalPrintOrient);
    printUrl.searchParams.set('print_scale', modalPrintScale.toString());
    window.open(printUrl.toString(), '_blank');
    setShowPrintModal(false);
  };

  // Configuration and weights states
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [allocations, setAllocations] = useState<Record<string, Record<string, number>>>({});
  const [itemScores, setItemScores] = useState<Record<string, number>>({});
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [selectedDetailCategory, setSelectedDetailCategory] = useState<{ code: string; label: string } | null>(null);
  const [taskCategories, setTaskCategories] = useState<any[]>([]);

  // Dynamic KPI list management states
  const [kpiItems, setKpiItems] = useState<KPIItem[]>(() => sanitizeBchKpiItems(DEFAULT_KPI_ITEMS));

  // Auto-detect and run print if the URL has ?print=true (repositioned below kpiItems initialization)
  useEffect(() => {
    if (urlParams?.get('print') === 'true') {
      const checkAndPrint = () => {
        // Wait until we have some kpiItems loaded
        const hasData = kpiItems && kpiItems.length > 0;
        if (hasData) {
          window.print();
          // Clean up url parameter to avoid continuous printing on page reloads
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('print');
          newUrl.searchParams.delete('layout_orient');
          newUrl.searchParams.delete('print_scale');
          window.history.replaceState({}, '', newUrl.toString());
        } else {
          setTimeout(checkAndPrint, 500);
        }
      };
      
      const timer = setTimeout(checkAndPrint, 500);
      return () => clearTimeout(timer);
    }
  }, [urlParams, kpiItems]);
  const [isEditingKpiList, setIsEditingKpiList] = useState(false);
  const [newKpiSection, setNewKpiSection] = useState<'A' | 'B' | 'C'>('A');
  const [newKpiStt, setNewKpiStt] = useState(1);
  const [newKpiLabel, setNewKpiLabel] = useState('');
  const [newKpiCode, setNewKpiCode] = useState('');
  const [newKpiMeasure, setNewKpiMeasure] = useState('');
  const [newKpiMeasureLeader, setNewKpiMeasureLeader] = useState('');
  const [newKpiWeight, setNewKpiWeight] = useState(10);
  const [newKpiWeightLeader, setNewKpiWeightLeader] = useState<number | undefined>(undefined);

  // States to handle row-by-row inline KPI editing
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [kpiItemsBackup, setKpiItemsBackup] = useState<KPIItem[] | null>(null);

  // Full-featured edit modal states & helpers
  const [editingKpiItemFull, setEditingKpiItemFull] = useState<KPIItem | null>(null);
  const [tempEditSection, setTempEditSection] = useState<'A' | 'B' | 'C'>('A');
  const [tempEditStt, setTempEditStt] = useState<number>(1);
  const [tempEditLabel, setTempEditLabel] = useState<string>('');
  const [tempEditCode, setTempEditCode] = useState<string>('');
  const [tempEditKpis, setTempEditKpis] = useState<string>('');
  const [tempEditKpisLeader, setTempEditKpisLeader] = useState<string>('');
  const [tempEditWeight, setTempEditWeight] = useState<number>(0);
  const [tempEditWeightLeader, setTempEditWeightLeader] = useState<number | undefined>(undefined);

  const handleStartEditKpiItemFull = (item: KPIItem) => {
    setEditingKpiItemFull(item);
    setTempEditSection(item.section);
    setTempEditStt(item.stt);
    setTempEditLabel(item.label);
    setTempEditCode(item.code || '');
    setTempEditKpis(item.kpis);
    setTempEditKpisLeader(item.kpisLeader || '');
    
    const wKey = item.id;
    const wKeyLeader = `${item.id}_leader`;
    setTempEditWeight(weights[wKey] !== undefined ? weights[wKey] : item.weight);
    setTempEditWeightLeader(weights[wKeyLeader] !== undefined ? weights[wKeyLeader] : (item.weightLeader !== undefined ? item.weightLeader : item.weight));
  };

  const handleSaveEditKpiItemFull = async (andSyncCloud: boolean = false) => {
    if (!editingKpiItemFull) return;
    const targetId = editingKpiItemFull.id;
    const cleanCode = tempEditCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const updatedItem = {
      ...editingKpiItemFull,
      section: tempEditSection,
      stt: tempEditStt,
      label: tempEditLabel,
      code: cleanCode,
      kpis: tempEditKpis,
      kpisLeader: tempEditKpisLeader.trim() || undefined,
      weight: tempEditWeight,
      weightLeader: tempEditWeightLeader
    };

    let nextKpiItems: KPIItem[] = [];
    setKpiItems(prev => {
      const updated = prev.map(item => item.id === targetId ? updatedItem : item);
      nextKpiItems = reorderKpiStt(updated);
      return nextKpiItems;
    });

    const nextWeights = {
      ...weights,
      [targetId]: tempEditWeight,
      [`${targetId}_leader`]: tempEditWeightLeader !== undefined ? tempEditWeightLeader : tempEditWeight
    };
    setWeights(nextWeights);

    if (andSyncCloud) {
      if (!isReportManager) {
        showToast("Bạn không có quyền cập nhật cấu hình hệ thống.", "error");
        return;
      }
      try {
        const targetPeriod = activeTab === 'config' ? configPeriod : reportPeriod;
        const docId = targetPeriod.replace(/\//g, '-');
        const docRef = doc(db, 'kpi_configs', docId);
        const docSnap = await getDoc(docRef);

        let existingData: any = {};
        if (docSnap.exists()) {
          existingData = docSnap.data();
        }

        // Must pre-compute the next items array because setState is asynchronous
        const tempUpdated = kpiItems.map(item => item.id === targetId ? updatedItem : item);
        const resolvedKpiItems = reorderKpiStt(tempUpdated);

        await setDoc(docRef, {
          ...existingData,
          kpiItems: resolvedKpiItems,
          weights: nextWeights,
          updatedAt: new Date().toISOString()
        });

        await syncKpiToTaskCategories(resolvedKpiItems);
        showToast(`Đã đồng bộ trực tiếp chỉ tiêu [${cleanCode}] lên Cloud cho tháng ${targetPeriod} thành công!`, "success");
      } catch (err) {
        console.error("Lỗi đồng bộ Cloud từ modal:", err);
        showToast(`Cập nhật thành công cục bộ, nhưng không thể đồng bộ lên Cloud: ${err}`, "error");
      }
    } else {
      showToast(`Đã cập nhật chỉ tiêu [${cleanCode}] cục bộ! Hãy lưu cấu hình tháng để đồng bộ vĩnh viễn.`, "success");
    }
    setEditingKpiItemFull(null);
  };

  // Modern animated toast notifications state for sandboxed preview iframes
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const printTemplateRef = useRef<HTMLDivElement>(null);

  // Helper sorting functions to satisfy user rule: Lê Nhật Trường first, then Võ Thị Mỹ Tân, Nguyễn Kiều Phan Tú, Bành Nhựt Hùng
  const sortUserIds = (ids: string[]): string[] => {
    const score = (uid: string) => {
      const u = users.find(x => x.id === uid);
      if (!u) return 999;
      const n = u.name.toLowerCase();
      if (n.includes('trường') || n.includes('truong')) return 1;
      if (n.includes('tân') || n.includes('tan')) return 2;
      if (n.includes('tú') || n.includes('tu')) return 3;
      if (n.includes('hùng') || n.includes('hung')) return 4;
      return 10;
    };
    return [...ids].sort((a, b) => score(a) - score(b));
  };

  const sortUsers = <T extends { name: string }>(list: T[]): T[] => {
    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('trường') || n.includes('truong')) return 1;
      if (n.includes('tân') || n.includes('tan')) return 2;
      if (n.includes('tú') || n.includes('tu')) return 3;
      if (n.includes('hùng') || n.includes('hung')) return 4;
      return 10;
    };
    return [...list].sort((a, b) => score(a.name) - score(b.name));
  };

  const sortKpiItems = (items: KPIItem[]): KPIItem[] => {
    return [...items].sort((a, b) => {
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section);
      }
      return a.stt - b.stt;
    });
  };

  const reorderKpiStt = (items: KPIItem[]): KPIItem[] => {
    const sections: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    let result: KPIItem[] = [];
    sections.forEach(sec => {
      const sectionItems = items.filter(item => item.section === sec);
      // Sort them by original stt to keep their order
      sectionItems.sort((a, b) => a.stt - b.stt);
      // Re-index consecutively starting from 1
      const reindexed = sectionItems.map((item, idx) => ({
        ...item,
        stt: idx + 1
      }));
      result = [...result, ...reindexed];
    });
    // Add non-standard sections if any
    const remaining = items.filter(item => !sections.includes(item.section as any));
    result = [...result, ...remaining];
    return sortKpiItems(result);
  };

  // List of active staff for configuration
  const activeStaff = useMemo(() => {
    return users.filter(u => u.status === 'ACTIVE' && u.role !== 'Admin' && u.role !== 'Leader');
  }, [users]);

  // Managed personnel IDs list for current month configuration
  const [allocatedUserIds, setAllocatedUserIds] = useState<string[]>([]);

  // List of staff available for evaluation (custom allocated or active regular staff)
  const evaluationStaff = useMemo(() => {
    const list = users.filter(u => {
      if (allocatedUserIds.includes(u.id)) return true;
      return u.status === 'ACTIVE' && u.role !== 'Admin' && u.role !== 'Leader';
    });
    // Deduplicate just in case
    const seen = new Set();
    const unique = list.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
    return sortUsers(unique);
  }, [users, allocatedUserIds, sortUsers]);

  // Set selected staff to first active staff or CURRENT when staff tab loaded
  useEffect(() => {
    if (activeTab === 'staff' && selectedStaffId === 'ALL' && evaluationStaff.length > 0) {
      const userIsStaff = evaluationStaff.find(u => u.id === currentUser.id);
      setSelectedStaffId(userIsStaff ? currentUser.id : evaluationStaff[0].id);
    }
  }, [activeTab, evaluationStaff, currentUser, selectedStaffId]);

  // Role and Permission enforcement for non-managers
  useEffect(() => {
    if (!isReportManager) {
      if (activeTab !== 'staff') {
        setActiveTab('staff');
      }
      if (selectedStaffId !== currentUser.id) {
        setSelectedStaffId(currentUser.id);
      }
    }
  }, [isReportManager, activeTab, selectedStaffId, currentUser.id, setActiveTab]);

  // Synchronize task categories from database for labels and activity names
  useEffect(() => {
    const q = query(collection(db, 'task_categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTaskCategories(data);
    });
    return () => unsubscribe();
  }, []);

  // Tự động đồng bộ hóa label của kpiItems theo danh mục trong task_categories mới nhất
  useEffect(() => {
    if (taskCategories.length === 0 || kpiItems.length === 0) return;
    
    let hasChanges = false;
    const updated = kpiItems.map(item => {
      if (!item.code) return item;
      const matchedCat = taskCategories.find(
        c => (c.code || '').toUpperCase().trim() === item.code.toUpperCase().trim()
      );
      if (matchedCat && matchedCat.name && matchedCat.name !== item.label) {
        hasChanges = true;
        return { ...item, label: matchedCat.name };
      }
      return item;
    });

    if (hasChanges) {
      setKpiItems(updated);
    }
  }, [taskCategories, kpiItems]);

  // Fetch KPI configuration weights / allocations and saved drafts of scores/comments
  useEffect(() => {
    const fetchConfig = async () => {
      const tan = users.find(u => u.name.toLowerCase().includes('tân') || u.name.toLowerCase().includes('tan'));
      const tu = users.find(u => u.name.toLowerCase().includes('tú') || u.name.toLowerCase().includes('tu'));
      const hung = users.find(u => u.name.toLowerCase().includes('hùng') || u.name.toLowerCase().includes('hung'));
      const defaultList = [tan, tu, hung].filter((u): u is User => !!u).map(u => u.id);

      // Nếu không phải Trưởng Phòng/Admin, tự động áp dụng cấu hình mặc định cục bộ và không gọi Firestore kpi_configs để bảo mật tuyệt đối
      if (!isReportManager) {
        setKpiItems(sortKpiItems(sanitizeBchKpiItems(DEFAULT_KPI_ITEMS)));
        const defaultWeights: Record<string, number> = {};
        DEFAULT_KPI_ITEMS.forEach(item => { 
          defaultWeights[item.id] = item.weight;
          if (item.weightLeader !== undefined) {
            defaultWeights[item.id + '_leader'] = item.weightLeader;
          }
        });
        setWeights(defaultWeights);

        const defaultAlloc: Record<string, Record<string, number>> = {};
        DEFAULT_KPI_ITEMS.forEach(item => {
          defaultAlloc[item.id] = {};
          users.forEach(u => { defaultAlloc[item.id][u.id] = 0; });
          
          if (tan) defaultAlloc[item.id][tan.id] = item.defaultAlloc.tan || 0;
          if (tu) defaultAlloc[item.id][tu.id] = item.defaultAlloc.tu || 0;
          if (hung) defaultAlloc[item.id][hung.id] = item.defaultAlloc.hung || 0;

          const allocatedCount = [tan, tu, hung].filter(Boolean).length;
          if (allocatedCount === 0 && activeStaff.length > 0) {
            const sliceCount = Math.min(3, activeStaff.length);
            const sharesNum = Math.floor(100 / sliceCount);
            for (let i = 0; i < sliceCount; i++) {
              defaultAlloc[item.id][activeStaff[i].id] = i === sliceCount - 1 ? 100 - (sharesNum * (sliceCount - 1)) : sharesNum;
            }
          }
        });
        setAllocations(defaultAlloc);
        setAllocatedUserIds(sortUserIds(defaultList.length > 0 ? defaultList : activeStaff.map(u => u.id)));
        return;
      }

      try {
        const targetPeriod = activeTab === 'config' ? configPeriod : reportPeriod;
        let configDoc = await getDoc(doc(db, 'kpi_configs', targetPeriod.replace(/\//g, '-')));

        if (!configDoc.exists()) {
          // Look backward chronologically up to 12 months to find the most recent saved configuration
          let searchPeriod = targetPeriod;
          for (let i = 0; i < 12; i++) {
            const parts = searchPeriod.split('/');
            if (parts.length !== 2) break;
            let m = parseInt(parts[0], 10);
            let y = parseInt(parts[1], 10);
            if (isNaN(m) || isNaN(y)) break;
            m -= 1;
            if (m === 0) {
              m = 12;
              y -= 1;
            }
            searchPeriod = `${String(m).padStart(2, '0')}/${y}`;
            const tempDoc = await getDoc(doc(db, 'kpi_configs', searchPeriod.replace(/\//g, '-')));
            if (tempDoc.exists()) {
              configDoc = tempDoc;
              break;
            }
          }
        }

        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.weights) setWeights(data.weights);
          if (data.allocations) setAllocations(data.allocations);
          
          if (data.kpiItems && Array.isArray(data.kpiItems)) {
            setKpiItems(sortKpiItems(sanitizeBchKpiItems(data.kpiItems)));
          } else {
            setKpiItems(sortKpiItems(sanitizeBchKpiItems(DEFAULT_KPI_ITEMS)));
          }

          if (data.allocatedUserIds && Array.isArray(data.allocatedUserIds)) {
            setAllocatedUserIds(sortUserIds(data.allocatedUserIds));
          } else {
            // Infer from allocations
            const inferredUserIds = new Set<string>();
            if (data.allocations) {
              Object.values(data.allocations).forEach((allocRow: any) => {
                Object.keys(allocRow).forEach(uid => {
                  if (allocRow[uid] > 0) {
                    inferredUserIds.add(uid);
                  }
                });
              });
            }
            if (inferredUserIds.size > 0) {
              setAllocatedUserIds(sortUserIds(Array.from(inferredUserIds)));
            } else {
              setAllocatedUserIds(sortUserIds(defaultList.length > 0 ? defaultList : activeStaff.map(u => u.id)));
            }
          }
        } else {
          // Initialize Defaults
          setKpiItems(sortKpiItems(sanitizeBchKpiItems(DEFAULT_KPI_ITEMS)));
          const defaultWeights: Record<string, number> = {};
          DEFAULT_KPI_ITEMS.forEach(item => { 
            defaultWeights[item.id] = item.weight;
            if (item.weightLeader !== undefined) {
              defaultWeights[item.id + '_leader'] = item.weightLeader;
            }
          });
          setWeights(defaultWeights);

          const defaultAlloc: Record<string, Record<string, number>> = {};
          DEFAULT_KPI_ITEMS.forEach(item => {
            defaultAlloc[item.id] = {};
            users.forEach(u => { defaultAlloc[item.id][u.id] = 0; });
            
            if (tan) defaultAlloc[item.id][tan.id] = item.defaultAlloc.tan || 0;
            if (tu) defaultAlloc[item.id][tu.id] = item.defaultAlloc.tu || 0;
            if (hung) defaultAlloc[item.id][hung.id] = item.defaultAlloc.hung || 0;

            const allocatedCount = [tan, tu, hung].filter(Boolean).length;
            if (allocatedCount === 0 && activeStaff.length > 0) {
              const sliceCount = Math.min(3, activeStaff.length);
              const sharesNum = Math.floor(100 / sliceCount);
              for (let i = 0; i < sliceCount; i++) {
                defaultAlloc[item.id][activeStaff[i].id] = i === sliceCount - 1 ? 100 - (sharesNum * (sliceCount - 1)) : sharesNum;
              }
            }
          });
          setAllocations(defaultAlloc);
          setAllocatedUserIds(sortUserIds(defaultList.length > 0 ? defaultList : activeStaff.map(u => u.id)));
        }
      } catch (err) {
        console.warn("Lỗi tải cấu hình:", err);
      }
    };
    fetchConfig();
  }, [reportPeriod, configPeriod, activeTab, users, activeStaff, isReportManager]);

  // Load Saved KPI reports draft
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftId = `${reportPeriod.replace(/\//g, '-')}_${selectedStaffId}`;
        const draftDoc = await getDoc(doc(db, 'report_drafts', draftId));
        if (draftDoc.exists()) {
          const data = draftDoc.data() as any;
          setStaffExplanation(data.staffExplanation || '');
          setLeaderEvaluation(data.leaderEvaluation || '');
          setItemScores(data.itemScores || {});
          setItemComments(data.itemComments || {});
        } else {
          setStaffExplanation('');
          setLeaderEvaluation('');
          setItemScores({});
          setItemComments({});
        }
      } catch (err) {
        console.warn("Lỗi tải nháp:", err);
      }
    };
    loadDraft();
  }, [reportPeriod, selectedStaffId]);

  // Handle Save Draft with full scores and comments payload
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const draftId = `${reportPeriod.replace(/\//g, '-')}_${selectedStaffId}`;
      await setDoc(doc(db, 'report_drafts', draftId), {
        monthYear: reportPeriod,
        userId: selectedStaffId,
        staffExplanation,
        leaderEvaluation,
        itemScores,
        itemComments,
        updatedAt: new Date().toISOString()
      });
      showToast("Đã lưu bản nháp đánh giá KPI thành công!", "success");
    } catch (err: any) {
      console.error("Lưu nháp thất bại:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`Lưu bản nháp thất bại: ${errMsg}`, "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Helper to sync KPI categories to database task_categories collection
  const syncKpiToTaskCategories = async (itemsList: KPIItem[]) => {
    try {
      const catQuery = await getDocs(collection(db, 'task_categories'));
      const existingCats = catQuery.docs.map(doc => ({
        dbDocId: doc.id,
        ...doc.data()
      })) as any[];

      const batch = writeBatch(db);
      let hasChanges = false;

      for (const item of itemsList) {
        const itemCodeUpper = (item.code || '').toUpperCase().trim();
        if (!itemCodeUpper) continue;

        const matchingCat = existingCats.find(
          c => (c.code || '').toUpperCase().trim() === itemCodeUpper
        );

        if (matchingCat) {
          if (matchingCat.name !== item.label) {
            const catRef = doc(db, 'task_categories', matchingCat.dbDocId);
            batch.update(catRef, {
              name: item.label
            });
            hasChanges = true;
          }
        } else {
          const newCatRef = doc(collection(db, 'task_categories'));
          const cleanActivityName = item.label.length > 50 
            ? item.label.slice(0, 47) + '...' 
            : item.label;

          batch.set(newCatRef, {
            code: itemCodeUpper,
            activityName: cleanActivityName,
            name: item.label
          });
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await batch.commit();
      }
    } catch (catErr) {
      console.error("Lỗi đồng bộ danh mục mã hóa sang task_categories:", catErr);
    }
  };

  // 1. Lưu Cấu Hình Danh Mục KPI (Tách biệt)
  const handleSaveKpiList = async () => {
    if (!isReportManager) {
      showToast("Bạn không có quyền lưu cấu hình.", "error");
      return;
    }
    setIsSavingKpiList(true);
    try {
      const docId = configPeriod.replace(/\//g, '-');
      const docRef = doc(db, 'kpi_configs', docId);
      const docSnap = await getDoc(docRef);

      let existingData: any = {};
      if (docSnap.exists()) {
        existingData = docSnap.data();
      }

      await setDoc(docRef, {
        ...existingData,
        kpiItems,
        weights,
        updatedAt: new Date().toISOString()
      });

      await syncKpiToTaskCategories(kpiItems);
      showToast(`Đã lưu riêng danh mục KPI & Trọng số phòng ban tháng ${configPeriod} thành công!`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(`Lỗi: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setIsSavingKpiList(false);
    }
  };

  // 2. Lưu Ma Trận Phân Bổ Nhân Sự (Tách biệt)
  const handleSaveMatrix = async () => {
    if (!isReportManager) {
      showToast("Bạn không có quyền lưu cấu hình phân bổ.", "error");
      return;
    }
    setIsSavingMatrix(true);
    try {
      const docId = configPeriod.replace(/\//g, '-');
      const docRef = doc(db, 'kpi_configs', docId);
      const docSnap = await getDoc(docRef);

      let existingData: any = {};
      if (docSnap.exists()) {
        existingData = docSnap.data();
      }

      await setDoc(docRef, {
        ...existingData,
        weights,
        allocations,
        allocatedUserIds,
        updatedAt: new Date().toISOString()
      });

      showToast(`Đã lưu riêng Ma trận phân bổ tỷ lệ nhân sự tháng ${configPeriod} thành công!`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(`Lỗi: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // Safe KPI configuration saving (Universal save button helper)
  const handleSaveConfig = async () => {
    if (!isReportManager) {
      showToast("Bạn không có quyền lưu cấu hình phân bổ trọng số tháng.", "error");
      return;
    }
    setIsSavingConfig(true);
    try {
      // 1. Lưu cấu hình mẫu KPI tháng
      await setDoc(doc(db, 'kpi_configs', configPeriod.replace(/\//g, '-')), {
        weights,
        allocations,
        allocatedUserIds,
        kpiItems,
        updatedAt: new Date().toISOString()
      });

      // 2. Đồng bộ tự động danh mục KPI sang collection 'task_categories'
      await syncKpiToTaskCategories(kpiItems);

      showToast(`Đã đồng bộ và lưu toàn bộ cấu hình tháng ${configPeriod} thành công!`, "success");
    } catch (e: any) {
      console.error("Lưu cấu hình thất bại:", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      showToast(`Lưu cấu hình thất bại: ${errMsg}`, "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddKpiItem = () => {
    if (!newKpiLabel.trim()) {
      showToast("Hãy nhập tên chỉ tiêu KPI đầu việc!", "warning");
      return;
    }
    const cleanCode = newKpiCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode || cleanCode.length < 2) {
      showToast("Hãy nhập mã code thích hợp (2-4 chữ)!", "warning");
      return;
    }

    const newId = `custom_${cleanCode}_${Date.now()}`;
    const newItem: KPIItem = {
      id: newId,
      section: newKpiSection,
      stt: newKpiStt,
      label: newKpiLabel.trim(),
      weight: newKpiWeight,
      weightLeader: newKpiWeightLeader !== undefined ? newKpiWeightLeader : newKpiWeight,
      kpis: newKpiMeasure.trim() || "Kịp tiến độ và đạt yêu cầu",
      kpisLeader: newKpiMeasureLeader.trim() || undefined,
      code: cleanCode,
      defaultAlloc: { tan: 0, tu: 0, hung: 0 }
    };

    setKpiItems(prev => sortKpiItems([...prev, newItem]));
    
    // Auto populate weights
    setWeights(prev => ({
      ...prev,
      [newId]: newKpiWeight,
      [`${newId}_leader`]: newKpiWeightLeader !== undefined ? newKpiWeightLeader : newKpiWeight
    }));

    // Auto populate allocations for allocatedUserIds to 0
    setAllocations(prev => {
      const next = { ...prev };
      next[newId] = {};
      allocatedUserIds.forEach(uid => {
        next[newId][uid] = 0;
      });
      return next;
    });

    // Reset inputs
    setNewKpiLabel('');
    setNewKpiCode('');
    setNewKpiMeasure('');
    setNewKpiMeasureLeader('');
    setNewKpiWeightLeader(undefined);
    // Increment default STT for convenience
    setNewKpiStt(prev => prev + 1);
  };

  const handleEditKpiField = (id: string, field: keyof KPIItem, value: any) => {
    setKpiItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      if (field === 'section' || field === 'stt') {
        return reorderKpiStt(updated);
      }
      return updated;
    });
  };

  const handleDeleteKpiItem = (id: string) => {
    const kpi = kpiItems.find(item => item.id === id);
    if (!kpi) return;
    setKpiItems(prev => reorderKpiStt(prev.filter(item => item.id !== id)));
    setWeights(prev => {
      const next = { ...prev };
      delete next[id];
      delete next[`${id}_leader`];
      return next;
    });
    setAllocations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showToast(`Đã xóa thành công chỉ tiêu [${kpi.code}]! Hãy lưu cấu hình tháng để áp dụng thay đổi.`, "success");
  };

  // Tasks grouped and merged smart core
  const getTasksByCategory = (code: string, userId: string) => {
    const [month, year] = reportPeriod.split('/');
    return tasks.filter(t => {
      if (isTaskDeleted(t)) return false;
      const date = new Date(t.issueDate);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = String(date.getFullYear());
      const userMatch = userId === 'ALL' 
        ? allocatedUserIds.includes(t.assigneeId) 
        : t.assigneeId === userId;
      return m === month && y === year && userMatch && t.category === code;
    });
  };

  const getBchCumulativeMetrics = (userId: string) => {
    const [monthStr, yearStr] = reportPeriod.split('/');
    const month = parseInt(monthStr, 10) || 5;
    const year = parseInt(yearStr, 10) || 2026;

    // Get list of active user IDs to calculate
    const targetUserIds = userId === 'ALL' ? allocatedUserIds : [userId];

    // Compute elapsed months since policy started (from May 2026)
    let elapsedMonths = 0;
    if (year > 2026) {
      elapsedMonths = month;
    } else if (year === 2026) {
      elapsedMonths = Math.max(0, month - 4);
    }

    // Compute targets
    let targetCuuHo = 0;
    let targetTnds = 0;
    
    targetUserIds.forEach(uid => {
      const isLd = isLeaderRole(uid, 'BCH');
      if (isLd) {
        // Leader: 1/month each
        targetCuuHo += elapsedMonths * 1;
        targetTnds += elapsedMonths * 1;
      } else {
        // Staff: 0.5/month each (1 policy per 2 months)
        targetCuuHo += elapsedMonths * 0.5;
        targetTnds += elapsedMonths * 0.5;
      }
    });

    const totalTarget = targetCuuHo + targetTnds;

    // Filter BCH tasks from start date (May 2026 for 2026) to selected month of the year
    const bchTasks = tasks.filter(t => {
      if (isTaskDeleted(t)) return false;
      if (t.category !== 'BCH') return false;
      
      const date = new Date(t.issueDate);
      const tMonth = date.getMonth() + 1;
      const tYear = date.getFullYear();

      const userMatch = targetUserIds.includes(t.assigneeId);
      
      let isDateValid = false;
      if (tYear > 2026) {
        isDateValid = tMonth <= month;
      } else if (tYear === 2026) {
        isDateValid = tMonth >= 5 && tMonth <= month;
      }
      return isDateValid && userMatch;
    });

    // Count actuals (Approved or Completed)
    let actualCuuHo = 0;
    let actualTnds = 0;
    let actualKhac = 0;

    bchTasks.forEach(t => {
      const isCompleted = t.status === 'APPROVED' || t.status === 'COMPLETED';
      if (isCompleted) {
        const titleLower = (t.title || '').toLowerCase();
        
        const isCH = titleLower.includes('cứu hộ') || titleLower.includes('cuu ho') || titleLower.includes('ch');
        const isTS = titleLower.includes('tnds') || titleLower.includes('trách nhiệm dân sự') || titleLower.includes('trach nhiem dan su') || titleLower.includes('bắt buộc') || titleLower.includes('bat buoc');

        if (isCH) {
          actualCuuHo += 1;
        } else if (isTS) {
          actualTnds += 1;
        } else {
          actualKhac += 1;
        }
      }
    });

    const totalActual = actualCuuHo + actualTnds + actualKhac;
    const finalRate = totalTarget > 0 ? Math.min(100, Math.round((totalActual / totalTarget) * 100)) : 100;

    return {
      monthStr,
      yearStr,
      month,
      year,
      elapsedMonths,
      targetCuuHo,
      targetTnds,
      totalTarget,
      actualCuuHo,
      actualTnds,
      actualKhac,
      totalActual,
      completionRate: finalRate,
      tasks: bchTasks
    };
  };

  const renderCumulativeInsuranceDashboard = () => {
    const [monthStr, yearStr] = reportPeriod.split('/');
    const month = parseInt(monthStr, 10) || 5;
    const year = parseInt(yearStr, 10) || 2026;
    const elapsedMonths = year > 2026 ? month : (year === 2026 ? Math.max(0, month - 4) : 0);

    return (
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-md space-y-4 print:hidden" id="cumulative-insurance-dashboard">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded text-base">📊</span>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">
                BẢNG THEO DÕI LŨY KẾ BÁN CHÉO BẢO HIỂM (CỨU HỘ & TNDS) NĂM {year}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                Cơ chế cộng dồn lũy kế đến Tháng {monthStr} / Quyết định tập đoàn QLCL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-full uppercase border border-indigo-100 animate-pulse border-dashed">
              Triển khai từ tháng 05/2026 (YTD)
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed text-left">
          <strong className="text-slate-900 font-extrabold flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500 animate-spin-slow" /> Hướng dẫn kiểm soát Chỉ tiêu lũy kế (YTD):
          </strong>
          <span className="block mt-1">
             - <strong>Nhân viên (Staff)</strong>: Cứu Hộ: 1 cái/ 2 tháng (TB 0.5 cái/tháng); TNDS: 1 cái/ 2 tháng (TB 0.5 cái/tháng). Tổng lũy kế cần đạt <strong className="text-blue-700">{elapsedMonths} bảo hiểm</strong> đến tháng {monthStr} là đạt.
          </span>
          <span className="block mt-0.5">
             - <strong>Quản lý (Leader)</strong>: Cứu Hộ: 1 cái/tháng (TB 1.0 cái/tháng); TNDS: 1 cái/tháng (TB 1.0 cái/tháng). Tổng lũy kế cần đạt <strong className="text-purple-700">{elapsedMonths * 2} bảo hiểm</strong> đến tháng {monthStr} là đạt.
          </span>
          <span className="block mt-1 text-[10px] text-rose-600 font-extrabold bg-rose-50 border border-rose-100 p-1.5 rounded inline-block">
             💡 KPI được Tập đoàn triển khai bắt đầu từ tháng 5/2026. Chỉ tiêu trước tháng 5 không tính. Số tháng tích lũy từ tháng 5 tính đến tháng {monthStr}/{year} là <strong className="underline text-rose-700">{elapsedMonths} tháng</strong>.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider border-b border-slate-800">
                <th className="p-3">Họ và tên</th>
                <th className="p-3 text-center">Chức danh</th>
                <th className="p-3 text-center bg-sky-950/20">Mục tiêu C.Hộ YTD</th>
                <th className="p-3 text-center bg-emerald-950/20">Mục tiêu TNDS YTD</th>
                <th className="p-3 text-center bg-slate-950/25">Tổng Chỉ tiêu YTD</th>
                <th className="p-3 text-center bg-sky-50/10 text-sky-400">Đã bán C.Hộ YTD</th>
                <th className="p-3 text-center bg-emerald-50/10 text-emerald-400">Đã bán TNDS YTD</th>
                <th className="p-3 text-center bg-indigo-50/10 text-indigo-400">Đã bán Khác</th>
                <th className="p-3 text-center font-black text-amber-400 bg-yellow-950/25">Tổng đã bán YTD</th>
                <th className="p-3 text-center">Tiến độ lũy kế</th>
                <th className="p-3 text-center">Đánh giá kiểm duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allocatedUserIds.map(uid => {
                const u = users.find(usr => usr.id === uid);
                if (!u) return null;
                
                const isLd = isLeaderRole(uid, 'BCH');
                const roleTitle = isLd ? 'Leader/QL' : 'Staff/NV';
                
                const res = getBchCumulativeMetrics(uid);
                const diff = res.totalTarget - res.totalActual;
                const isPassed = diff <= 0;

                const percentRate = res.totalTarget > 0 ? Math.round((res.totalActual / res.totalTarget) * 100) : 100;

                return (
                  <tr key={uid} className={`hover:bg-slate-50 transition-colors ${selectedStaffId === uid ? 'bg-indigo-50/40 font-semibold' : ''}`}>
                    <td className="p-3 font-bold text-slate-800 notranslate" translate="no">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {u.name}
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-600">{roleTitle}</td>
                    <td className="p-3 text-center font-medium bg-sky-500/5 text-sky-800">{res.targetCuuHo} cái</td>
                    <td className="p-3 text-center font-medium bg-emerald-500/5 text-emerald-800">{res.targetTnds} cái</td>
                    <td className="p-3 text-center font-black bg-slate-100 text-slate-800">{res.totalTarget} cái</td>
                    <td className="p-3 text-center font-bold text-sky-600 bg-sky-50">{res.actualCuuHo} cái</td>
                    <td className="p-3 text-center font-bold text-emerald-600 bg-emerald-50">{res.actualTnds} cái</td>
                    <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50">{res.actualKhac} cái</td>
                    <td className="p-3 text-center font-extrabold text-[#004b87] bg-yellow-50">{res.totalActual} cái</td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-black leading-none ${percentRate >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {percentRate}%
                        </span>
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${percentRate >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(100, percentRate)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded">
                          <CheckCircle2 size={10} className="stroke-[3]" /> Đạt lũy kế
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-200 px-2 py-1 rounded">
                            <AlertCircle size={10} className="stroke-[3]" /> Cần thêm {diff} cái
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold italic">chỉ tiêu TB cuối năm</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Smart Recurrence Aggregator
  const getCategoryMetrics = (code: string, userId: string) => {
    if (code === 'BCH') {
      const bchMetrics = getBchCumulativeMetrics(userId);
      const groups = bchMetrics.tasks.map(t => ({
        title: `${(t.status === 'APPROVED' || t.status === 'COMPLETED') ? '✅ [ĐẠT YTD]' : '❌ [CHƯA ĐẠT]'} ${t.title || 'Công việc không tên'} (${new Date(t.issueDate).toLocaleDateString('vi-VN')})`,
        objective: t.objective || '(Không có mục tiêu)',
        total: 1,
        completed: (t.status === 'APPROVED' || t.status === 'COMPLETED') ? 1 : 0,
        percent: (t.status === 'APPROVED' || t.status === 'COMPLETED') ? 100 : 0
      }));

      return {
        completionRate: bchMetrics.completionRate,
        groupedCount: bchMetrics.tasks.length,
        items: bchMetrics.tasks,
        groups
      };
    }

    if (code === 'AIU') {
      const [month, year] = reportPeriod.split('/');
      const allTasksInPeriod = tasks.filter(t => {
        if (isTaskDeleted(t)) return false;
        const date = new Date(t.issueDate);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = String(date.getFullYear());
        const userMatch = userId === 'ALL' 
          ? allocatedUserIds.includes(t.assigneeId) 
          : t.assigneeId === userId;
        return m === month && y === year && userMatch;
      });

      if (allTasksInPeriod.length === 0) {
        return { completionRate: null, groupedCount: 0, items: [], groups: [] };
      }

      const aiAppliedTasks = allTasksInPeriod.filter(t => t.aiApplied === true);
      const rawRatio = aiAppliedTasks.length / allTasksInPeriod.length;
      const completionRate = Math.min(100, Math.round((rawRatio / 0.6) * 100));

      const groups = allTasksInPeriod.map(t => ({
        title: `${t.aiApplied ? '✅ [ỨNG DỤNG AI]' : '❌ [CHƯA ỨNG DỤNG]'} ${t.title || 'Công việc không tên'}`,
        objective: t.aiAppliedDetails || '(Chưa điền mô tả hoặc không ứng dụng AI ở kỳ cập nhật tiến độ)',
        total: 1,
        completed: t.aiApplied ? 1 : 0,
        percent: t.aiApplied ? 100 : 0
      }));

      return {
        completionRate,
        groupedCount: allTasksInPeriod.length,
        items: allTasksInPeriod,
        groups
      };
    }

    const list = getTasksByCategory(code, userId);
    if (list.length === 0) return { completionRate: null, groupedCount: 0, items: [] };

    // Grouping identical or similar recurring tasks by title to treat as "1 head structure with multiple iterations"
    const groups: Record<string, { total: number; completed: number; items: Task[] }> = {};
    list.forEach(t => {
      const titleKey = (t.title || 'Công việc không tên').trim().toLowerCase();
      const isCompleted = t.status === 'APPROVED' || t.status === 'COMPLETED';
      if (!groups[titleKey]) {
        groups[titleKey] = { total: 0, completed: 0, items: [] };
      }
      groups[titleKey].total += 1;
      groups[titleKey].items.push(t);
      if (isCompleted) {
        groups[titleKey].completed += 1;
      }
    });

    const rates = Object.values(groups).map(g => g.completed / g.total);
    const average = rates.reduce((sum, r) => sum + r, 0) / rates.length;

    return {
      completionRate: Math.round(average * 100),
      groupedCount: Object.keys(groups).length,
      items: list,
      groups: Object.entries(groups).map(([title, val]) => ({
        title: val.items[0].title || 'Công việc không tên',
        objective: val.items[0].objective,
        total: val.total,
        completed: val.completed,
        percent: Math.round((val.completed / val.total) * 100)
      }))
    };
  };

  const isLeaderRole = (userId: string, kpiCode?: string) => {
    if (userId === 'ALL') return false;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;
    const isTan = targetUser.name.toLowerCase().includes('tân') || targetUser.name.toLowerCase().includes('tan');
    if (isTan && kpiCode) {
      const kpiItem = kpiItems.find(k => k.code === kpiCode);
      if (kpiItem && kpiItem.section === 'C') {
        return false;
      }
    }
    if (isTan && kpiCode === 'BCH') {
      return false;
    }
    return targetUser.role !== 'Staff';
  };

  // Calculate scores with full custom override support
  const getItemScoreInfo = (item: KPIItem, userId: string) => {
    const personalAlloc = allocations[item.id]?.[userId] || 0;
    
    const isLd = isLeaderRole(userId, item.code);
    const baseWeight = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
    const weightKey = isLd ? `${item.id}_leader` : item.id;
    const itemDeptWeight = weights[weightKey] !== undefined ? weights[weightKey] : baseWeight;
    
    const personalWeight = (itemDeptWeight * personalAlloc) / 100;
    
    const { completionRate } = getCategoryMetrics(item.code, userId);
    
    // Check manual leader override from saved draft
    const overrideKey = `${userId}_${item.id}`;
    const overriddenScore = itemScores[overrideKey];
    
    let displayScore = 100; // Defaults to perfect 100 if no task was assigned
    let isNA = false;

    const targetUser = users.find(u => u.id === userId);
    const isLNTUser = targetUser?.name === 'Lê Nhật Trường';

    if (overriddenScore !== undefined) {
      displayScore = overriddenScore;
    } else if (isLNTUser && item.coEval) {
      let weightedScoreSum = 0;
      let totalAlloc = 0;
      let hasAnyAllocated = false;

      users.forEach(u => {
        if (u.name !== 'Lê Nhật Trường' && u.id !== userId) {
          const uAlloc = allocations[item.id]?.[u.id] || 0;
          if (uAlloc > 0) {
            hasAnyAllocated = true;
            const otherScoreInfo = getItemScoreInfo(item, u.id);
            const otherScore = otherScoreInfo.isNA ? 100 : otherScoreInfo.displayScore;
            weightedScoreSum += otherScore * uAlloc;
            totalAlloc += uAlloc;
          }
        }
      });

      if (hasAnyAllocated && totalAlloc > 0) {
        displayScore = Math.round(weightedScoreSum / totalAlloc);
        isNA = false;
      } else {
        displayScore = 100;
        isNA = false;
      }
    } else if (completionRate !== null) {
      displayScore = completionRate;
    } else {
      isNA = true;
    }

    return {
      isNA,
      personalWeight,
      displayScore,
      deptWeight: itemDeptWeight,
      alloc: personalAlloc
    };
  };

  // Department aggregate score
  const departmentTotalKPI = useMemo(() => {
    let weightedSum = 0;
    let weightTotal = 0;
    kpiItems.forEach(item => {
      const { displayScore, deptWeight, isNA } = getItemScoreInfo(item, 'ALL');
      if (deptWeight > 0) {
        weightedSum += (isNA ? 100 : displayScore) * deptWeight;
        weightTotal += deptWeight;
      }
    });
    return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  }, [weights, allocations, itemScores, reportPeriod, tasks, kpiItems]);

  // Employee personal aggregate score
  const staffTotalKPI = useMemo(() => {
    if (selectedStaffId === 'ALL') return 0;
    let weightedSum = 0;
    let weightTotal = 0;
    kpiItems.forEach(item => {
      const { displayScore, personalWeight, isNA } = getItemScoreInfo(item, selectedStaffId);
      if (personalWeight > 0) {
        weightedSum += (isNA ? 100 : displayScore) * personalWeight;
        weightTotal += personalWeight;
      }
    });
    return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 100;
  }, [selectedStaffId, weights, allocations, itemScores, reportPeriod, tasks, kpiItems]);

  // Automatic feedback generation utilizing smart task parsing
  const triggerAutoFeedback = (item: KPIItem, userId: string) => {
    const isLntVal = users.find(u => u.id === userId)?.name === 'Lê Nhật Trường';
    const metricsSource = (isLntVal && item.coEval)
      ? getCategoryMetrics(item.code, 'ALL')
      : getCategoryMetrics(item.code, userId);
    const { groups, items } = metricsSource;
    if (!items || items.length === 0) {
      setItemComments(prev => ({
        ...prev,
        [`${userId}_${item.id}`]: "Không phát sinh công việc trong chu kỳ."
      }));
      return;
    }
    
    const feedbackParts = (groups || []).map(g => 
      `Hoàn thành ${g.completed}/${g.total} phiên [${g.title}] (${g.percent}%)`
    );
    const feedbackText = feedbackParts.join("; ") + ". Hoàn thành tốt chỉ tiêu chuyên môn đề ra.";
    setItemComments(prev => ({
      ...prev,
      [`${userId}_${item.id}`]: feedbackText
    }));
  };

  // Export PDF exactly as displayed on the screen!
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      window.print();
      setIsExportingPDF(false);
    }, 150);
  };

  // Export beautiful individual KPI scorecard to Excel conforming to user requests
  const handleExportIndividualExcel = () => {
    const staffUser = users.find(u => u.id === selectedStaffId);
    if (!staffUser) {
      showToast("Vui lòng chọn nhân sự trước khi xuất Excel.", "error");
      return;
    }

    const dataRows = [];

    // Branded Header
    dataRows.push({ A: 'CÔNG TY CP NHỰA TÂN PHÚ', B: 'PHÒNG QUẢN LÝ CHẤT LƯỢNG' });
    dataRows.push({ A: 'BẢNG ĐÁNH GIÁ THỰC HIỆN CHỈ TIÊU KPI CÁ NHÂN', B: '' });
    dataRows.push({ A: `Tháng đánh giá: ${reportPeriod}`, B: '' });
    dataRows.push({ A: `Họ và tên: ${staffUser.name.toUpperCase()}`, B: `Mã Nhân Viên: ${staffUser.code || ''}` });
    dataRows.push({ A: `Chức vụ: ${getUserRoleTitle(staffUser)}`, B: 'Bộ phận: Quản Lý Chất Lượng' });
    dataRows.push({}); // spacing row

    // Table Columns
    dataRows.push({
      A: 'STT',
      B: 'CHỈ TIÊU KPI',
      C: 'TRỌNG SỐ BỘ PHẬN',
      D: 'PHÂN BỔ CÁ NHÂN',
      E: 'TRỌNG SỐ CÁ NHÂN',
      F: 'ĐO LƯỜNG',
      G: 'K.QUẢ THỰC TẾ',
      H: 'ĐIỂM KPI',
      I: 'QLTT ĐÁNH GIÁ',
      J: 'NHẬN XÉT & GHI NHẬN',
      K: 'KQ PHÊ DUYỆT CUỐI CÙNG'
    });

    // SECTION A
    dataRows.push({
      A: 'A',
      B: `KPI CHUYÊN MÔN (${getWeightSum('A', selectedStaffId)}%)`,
      C: '',
      D: '',
      E: '',
      F: '',
      G: '',
      H: '',
      I: '',
      J: '',
      K: ''
    });

    kpiItems.filter(i => i.section === 'A').forEach(item => {
      const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
      if (personalWeight === 0) return;
      const overrideKey = `${selectedStaffId}_${item.id}`;
      const qlttScore = itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : (isNA ? 'N/A' : `${displayScore}%`);
      const commentText = itemComments[overrideKey] || '';
      const kpiVal = (isLntSelected && item.coEval)
        ? getCategoryMetrics(item.code, 'ALL')
        : getCategoryMetrics(item.code, selectedStaffId);
      const actualResultText = kpiVal.items && kpiVal.items.length > 0
        ? `Gộp ${kpiVal.groupedCount} việc (${kpiVal.items.length} lượt)`
        : 'N/A';

      dataRows.push({
        A: item.stt,
        B: item.label,
        C: (() => {
          const isLd = isLeaderRole(selectedStaffId, item.code);
          const wKey = isLd ? `${item.id}_leader` : item.id;
          const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
          return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
        })(),
        D: `${alloc}%`,
        E: `${Math.round(personalWeight)}%`,
        F: isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis,
        G: actualResultText,
        H: isNA ? 'N/A' : `${displayScore}%`,
        I: qlttScore,
        J: commentText,
        K: itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''
      });
    });

    // SECTION B
    dataRows.push({
      A: 'B',
      B: `NHÓM NHIỆM VỤ PHÁT SINH NGOÀI KẾ HOẠCH (${getWeightSum('B', selectedStaffId)}%)`,
      C: '',
      D: '',
      E: '',
      F: '',
      G: '',
      H: '',
      I: '',
      J: '',
      K: ''
    });

    kpiItems.filter(i => i.section === 'B').forEach(item => {
      const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
      if (personalWeight === 0) return;
      const overrideKey = `${selectedStaffId}_${item.id}`;
      const qlttScore = itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : (isNA ? 'N/A' : `${displayScore}%`);
      const commentText = itemComments[overrideKey] || '';
      const kpiVal = (isLntSelected && item.coEval)
        ? getCategoryMetrics(item.code, 'ALL')
        : getCategoryMetrics(item.code, selectedStaffId);
      const actualResultText = kpiVal.items && kpiVal.items.length > 0
        ? `Gộp ${kpiVal.groupedCount} việc (${kpiVal.items.length} lượt)`
        : 'N/A';

      dataRows.push({
        A: item.stt,
        B: item.label,
        C: (() => {
          const isLd = isLeaderRole(selectedStaffId, item.code);
          const wKey = isLd ? `${item.id}_leader` : item.id;
          const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
          return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
        })(),
        D: `${alloc}%`,
        E: `${Math.round(personalWeight)}%`,
        F: isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis,
        G: actualResultText,
        H: isNA ? 'N/A' : `${displayScore}%`,
        I: qlttScore,
        J: commentText,
        K: itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''
      });
    });

    // SECTION C
    dataRows.push({
      A: 'C',
      B: `PHÁT TRIỂN TỔ CHỨC (${getWeightSum('C', selectedStaffId)}%)`,
      C: '',
      D: '',
      E: '',
      F: '',
      G: '',
      H: '',
      I: '',
      J: '',
      K: ''
    });

    kpiItems.filter(i => i.section === 'C').forEach(item => {
      const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
      if (personalWeight === 0) return;
      const overrideKey = `${selectedStaffId}_${item.id}`;
      const qlttScore = itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : (isNA ? 'N/A' : `${displayScore}%`);
      const commentText = itemComments[overrideKey] || '';
      const kpiVal = (isLntSelected && item.coEval)
        ? getCategoryMetrics(item.code, 'ALL')
        : getCategoryMetrics(item.code, selectedStaffId);
      const actualResultText = kpiVal.items && kpiVal.items.length > 0
        ? `Gộp ${kpiVal.groupedCount} việc (${kpiVal.items.length} lượt)`
        : 'N/A';

      dataRows.push({
        A: item.stt,
        B: item.label,
        C: (() => {
          const isLd = isLeaderRole(selectedStaffId, item.code);
          const wKey = isLd ? `${item.id}_leader` : item.id;
          const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
          return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
        })(),
        D: `${alloc}%`,
        E: `${Math.round(personalWeight)}%`,
        F: isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis,
        G: actualResultText,
        H: isNA ? 'N/A' : `${displayScore}%`,
        I: qlttScore,
        J: commentText,
        K: itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''
      });
    });

    // TOTALS Row
    const totalW = getWeightSum('A', selectedStaffId) + getWeightSum('B', selectedStaffId) + getWeightSum('C', selectedStaffId);
    dataRows.push({
      A: 'TỔNG ĐIỂM HOÀN THÀNH',
      B: '',
      C: `${totalW}%`,
      D: '',
      E: '',
      F: '',
      G: '',
      H: `${staffTotalKPI}%`,
      I: `${staffTotalKPI}%`,
      J: '',
      K: `${staffTotalKPI}%`
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows, { skipHeader: true });
    
    // Set column widths for a highly clean Layout
    worksheet['!cols'] = [
      { wch: 6 },   // STT
      { wch: 45 },  // CHỈ TIÊU KPI
      { wch: 18 },  // TRỌNG SỐ BỘ PHẬN
      { wch: 18 },  // PHÂN BỔ CÁ NHÂN
      { wch: 18 },  // TRỌNG SỐ CÁ NHÂN
      { wch: 45 },  // ĐO LƯỜNG
      { wch: 22 },  // K.QUẢ THỰC TẾ
      { wch: 15 },  // ĐIỂM KPI
      { wch: 15 },  // QLTT ĐÁNH GIÁ
      { wch: 40 },  // NHẬN XÉT & GHI NHẬN
      { wch: 22 }   // KQ PHÊ DUYỆT CUỐI CÙNG
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = staffUser.name.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'KPI_Cá_Nhân');

    const fileSuffix = staffUser.name.replace(/\s+/g, '_');
    const finalFileName = `KPI_TANPHU_${reportPeriod.replace(/\//g, '_')}_${fileSuffix}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(dataBlob, finalFileName);

    showToast(`Đã trích xuất file Excel cá nhân thành công cho ${staffUser.name}!`, "success");
  };

  const getWeightSum = (section: 'A' | 'B' | 'C', targetUserId: string = 'ALL') => {
    return kpiItems
      .filter(i => i.section === section)
      .reduce((sum, item) => {
        const isLd = isLeaderRole(targetUserId, item.code);
        const baseWeight = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
        const weightKey = isLd ? `${item.id}_leader` : item.id;
        const itemDeptWeight = weights[weightKey] !== undefined ? weights[weightKey] : baseWeight;
        return sum + itemDeptWeight;
      }, 0);
  };

  const getSectionStats = (section: 'A' | 'B' | 'C', targetUserId: string) => {
    let weightedSum = 0;
    let weightTotal = 0;
    
    kpiItems.filter(i => i.section === section).forEach(item => {
      if (targetUserId === 'ALL') {
        const { displayScore, deptWeight, isNA } = getItemScoreInfo(item, 'ALL');
        if (deptWeight > 0) {
          weightedSum += (isNA ? 100 : displayScore) * deptWeight;
          weightTotal += deptWeight;
        }
      } else {
        const { displayScore, personalWeight, isNA } = getItemScoreInfo(item, targetUserId);
        if (personalWeight > 0) {
          weightedSum += (isNA ? 100 : displayScore) * personalWeight;
          weightTotal += personalWeight;
        }
      }
    });

    const finalScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
    return { sumWeight: weightTotal, finalScore };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500 px-4 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 ${layoutOrient === 'portrait' ? 'portrait' : 'landscape'} !important;
            margin: 0.4cm !important;
          }
          body, html, #root, main, .min-h-screen {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          #root {
            transform: scale(${printScale / 100}) !important;
            transform-origin: top left !important;
            width: ${100 / (printScale / 100)}% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          /* Show actual interactive layout when printing */
          .report-interactive-view {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide non-printable elements cleanly */
          .print\\:hidden,
          button,
          .no-print,
          #sidebar-container,
          .sidebar-container,
          #toggle-sidebar-1,
          header,
          footer,
          .holiday-banner-container,
          iframeKey,
          iframe,
          nav,
          aside {
            display: none !important;
          }
          /* Custom styles to prevent layout compression or table breaks */
          .grid-table-clear {
            min-width: 100% !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      <div className="report-interactive-view space-y-8">
        {/* Tab Navigation header */}
        {activeTab !== 'config' && (
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden px-8 py-6 print:hidden no-print">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg">
                <TrendingUp size={28} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                    BÁO CÁO THÁNG
                  </h1>
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      title="Tháng trước"
                      className="p-1 px-2.5 hover:bg-slate-200 text-slate-600 transition-colors border-r border-slate-200 h-9 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft size={14} strokeWidth={3} />
                    </button>
                    <input 
                      type="text" 
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value)}
                      title="Định dạng MM/YYYY (Ví dụ: 06/2026)"
                      className="bg-transparent text-slate-900 font-extrabold text-sm outline-none w-20 text-center py-1 h-9 border-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      title="Tháng sau"
                      className="p-1 px-2.5 hover:bg-slate-200 text-slate-600 transition-colors border-l border-slate-200 h-9 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-bold">
                  MÔ HÌNH QUẢN TRỊ KPI ĐA CHIỀU PHÒNG QLCL TÂN PHÚ VIỆT NAM
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              {isReportManager && (
                <button
                  onClick={() => { setActiveTab('dept'); setSelectedStaffId('ALL'); }}
                  className={`h-11 px-5 rounded-md text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'dept' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <TrendingUp size={16} />
                  ĐKPI Phòng QLCL
                </button>
              )}
              <button
                onClick={() => setActiveTab('staff')}
                className={`h-11 px-5 rounded-md text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <UserCircle size={16} />
                KPI Cá Nhân
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main interactive tabs view */}
      {activeTab === 'dept' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg flex justify-between items-center relative overflow-hidden print:hidden no-print">
            <div className="relative z-10">
              <h2 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">CHỈ SỐ THỰC HIỆN TOÀN CUỘC</h2>
              <p className="text-4xl font-black">{departmentTotalKPI}%</p>
              <p className="text-xs opacity-90 font-medium mt-1">Trọng số tập hợp từ đóng góp hiệu suất thực tế của toàn phòng QLCL</p>
            </div>
            <TrendingUp size={80} className="absolute right-[-10px] bottom-[-10px] opacity-10" />
            <button 
              onClick={() => setShowPrintModal(true)}
              className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 h-11 px-6 rounded-md font-black text-xs uppercase tracking-wider shadow-md transition-all z-10 flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} strokeWidth={3} />
              <span className="notranslate" translate="no">In PDF</span>
            </button>
          </div>

          <div id="pdf-export-dept" className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            {/* Print-only Header section */}
            <div className="hidden print:block border-b-2 border-slate-300 pb-4 mb-6 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                    CHỈ TIÊU KPI PHÒNG BAN QUẢN LÝ CHẤT LƯỢNG
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    MÔ HÌNH QUẢN TRỊ KPI ĐA CHIỀU PHÒNG QLCL TÂN PHÚ VIỆT NAM
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-500 uppercase">Tháng báo cáo</div>
                  <div className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded mt-0.5">{reportPeriod}</div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center bg-blue-50/50 p-3 rounded-md border border-blue-100 text-[10px] font-black text-left">
                <span className="text-blue-800 uppercase tracking-wider">CHỈ SỐ THỰC HIỆN TOÀN CUỘC (PHÒNG BAN):</span>
                <span className="text-sm text-blue-700 bg-white border border-blue-200 px-3 py-0.5 rounded shadow-sm">{departmentTotalKPI}%</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-700">KPI PHÒNG BAN QUẢN LÝ CHẤT LƯỢNG</h3>
              <p className="text-[10px] bg-blue-100 text-blue-700 font-black px-2.5 py-1 rounded-full uppercase">Tháng {reportPeriod} Template Quy Chuẩn</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse grid-table-clear" style={{ minWidth: '1120px', tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                    <th className="p-3 text-center" style={{ width: '50px' }}>STT</th>
                    <th className="p-3 text-center whitespace-normal" style={{ width: '320px' }}>CHỈ TIÊU KPI CHUYÊN MÔN</th>
                    <th className="p-1.5 text-center whitespace-nowrap" style={{ width: '70px' }}>Trọng số</th>
                    {allocatedUserIds.map(uid => {
                      const u = users.find(usr => usr.id === uid);
                      return (
                        <th key={uid} className="p-1.5 text-center font-black whitespace-normal text-[9px] break-words" style={{ minWidth: '100px', width: '100px' }}>
                          <span translate="no" className="notranslate leading-tight block" title={u?.name}>{u?.name || 'Chưa rõ'}</span>
                        </th>
                      );
                    })}
                    <th className="p-2.5 text-center" style={{ width: '180px' }}>CHỈ SỐ ĐO LƯỜNG SẢN PHẨM</th>
                    <th className="p-3 text-center whitespace-normal" style={{ width: '100px' }}>KẾT QUẢ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {/* Category A */}
                  <tr className="bg-blue-50/50 font-black text-blue-800 border-y border-blue-200/50">
                    <td colSpan={2} className="p-4 uppercase">MỤC A: KPI CHUYÊN MÔN ({getWeightSum('A')}%)</td>
                    <td colSpan={3 + allocatedUserIds.length}></td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'A').map(item => {
                    const metrics = getCategoryMetrics(item.code, 'ALL');
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400" style={{ width: '50px' }}>{item.stt}</td>
                        <td className="p-3 font-semibold text-slate-800 leading-relaxed relative group" style={{ width: '320px' }}>
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span>{item.label}</span>
                            {isReportManager && (
                              <button
                                id={`edit-kpi-btn-dept-A-${item.id}`}
                                onClick={() => handleStartEditKpiItemFull(item)}
                                className="p-1 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded border border-transparent hover:border-blue-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer shadow-sm"
                                title="Chỉnh sửa chỉ tiêu nhanh"
                              >
                                <Edit size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 text-center font-black text-xs" style={{ width: '70px' }}>
                          {item.weightLeader !== undefined && item.weightLeader !== item.weight ? (
                            <div className="flex flex-col gap-0.5 text-[10px] items-center justify-center">
                              <span className="text-slate-500 font-medium whitespace-nowrap">NV: {weights[item.id] !== undefined ? weights[item.id] : item.weight}%</span>
                              <span className="text-blue-600 font-bold whitespace-nowrap">QL: {weights[`${item.id}_leader`] !== undefined ? weights[`${item.id}_leader`] : item.weightLeader}%</span>
                            </div>
                          ) : (
                            <span className="text-blue-600 font-black whitespace-nowrap">{weights[item.id] !== undefined ? weights[item.id] : item.weight}%</span>
                          )}
                        </td>
                        {allocatedUserIds.map(uid => {
                          const val = allocations[item.id]?.[uid] || 0;
                          const isCai = item.code === 'CTI' || item.code === 'BCH';
                          return (
                            <td key={uid} className="p-1.5 text-center font-bold text-slate-500 text-xs" style={{ minWidth: '100px', width: '100px' }}>
                              <span className="whitespace-nowrap">{val}{isCai ? '%' : '%'}</span>
                            </td>
                          );
                        })}
                        <td className="p-4 font-medium text-slate-600" style={{ width: '180px' }}>
                          {item.kpisLeader && item.kpisLeader !== item.kpis ? (
                            <div className="space-y-1 text-[11px] leading-tight">
                              <div className="flex items-start gap-1"><span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase shrink-0">Staff</span> <span>{item.kpis}</span></div>
                              <div className="flex items-start gap-1"><span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-black uppercase shrink-0">Leader</span> <span className="text-blue-900 font-bold">{item.kpisLeader}</span></div>
                            </div>
                          ) : (
                            item.kpis
                          )}
                        </td>
                        <td className="p-4 text-center font-black whitespace-normal break-words" style={{ width: '100px' }}>
                          <span className={metrics.completionRate !== null ? (metrics.completionRate >= 100 ? "text-emerald-600" : "text-amber-600") : "text-slate-400 italic"}>
                            {metrics.completionRate !== null ? `${metrics.completionRate}%` : "100% (Mặc định)"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Category B */}
                  <tr className="bg-amber-50 font-black text-amber-800 border-y border-amber-200">
                    <td colSpan={2} className="p-4 uppercase">MỤC B: NHÓM NHIỆM VỤ PHÁT SINH ({getWeightSum('B')}%)</td>
                    <td colSpan={3 + allocatedUserIds.length}></td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'B').map(item => {
                    const metrics = getCategoryMetrics(item.code, 'ALL');
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400" style={{ width: '50px' }}>{item.stt}</td>
                        <td className="p-3 font-semibold text-slate-800 leading-relaxed relative group" style={{ width: '320px' }}>
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span>{item.label}</span>
                            {isReportManager && (
                              <button
                                id={`edit-kpi-btn-dept-B-${item.id}`}
                                onClick={() => handleStartEditKpiItemFull(item)}
                                className="p-1 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded border border-transparent hover:border-blue-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer shadow-sm"
                                title="Chỉnh sửa chỉ tiêu nhanh"
                              >
                                <Edit size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 text-center font-black text-amber-600 whitespace-nowrap text-xs" style={{ width: '70px' }}>{weights[item.id] !== undefined ? weights[item.id] : item.weight}%</td>
                        <td colSpan={allocatedUserIds.length || 3} className="p-1.5 text-slate-400 text-center italic text-xs">Phát sinh tự do</td>
                        <td className="p-3 font-medium text-slate-600" style={{ width: '180px' }}>{item.kpis}</td>
                        <td className="p-3 text-center font-black whitespace-normal break-words" style={{ width: '100px' }}>
                          <span className="text-slate-400 italic">Đạt</span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Category C */}
                  <tr className="bg-indigo-50 font-black text-indigo-800 border-y border-indigo-200">
                    <td colSpan={2} className="p-4 uppercase">MỤC C: PHÁT TRIỂN TỔ CHỨC ({getWeightSum('C')}%)</td>
                    <td colSpan={3 + allocatedUserIds.length}></td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'C').map(item => {
                    const metrics = getCategoryMetrics(item.code, 'ALL');
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400" style={{ width: '50px' }}>{item.stt}</td>
                        <td className="p-3 font-semibold text-slate-800 leading-relaxed relative group" style={{ width: '320px' }}>
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span>{item.label}</span>
                            {isReportManager && (
                              <button
                                id={`edit-kpi-btn-dept-C-${item.id}`}
                                onClick={() => handleStartEditKpiItemFull(item)}
                                className="p-1 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded border border-transparent hover:border-blue-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer shadow-sm"
                                title="Chỉnh sửa chỉ tiêu nhanh"
                              >
                                <Edit size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 text-center font-black text-indigo-600 text-xs" style={{ width: '70px' }}>
                          {item.weightLeader !== undefined && item.weightLeader !== item.weight ? (
                            <div className="flex flex-col gap-0.5 text-[10px] items-center justify-center">
                              <span className="text-slate-500 font-medium whitespace-nowrap">NV: {weights[item.id] !== undefined ? weights[item.id] : item.weight}%</span>
                              <span className="text-purple-600 font-bold whitespace-nowrap">QL: {weights[`${item.id}_leader`] !== undefined ? weights[`${item.id}_leader`] : item.weightLeader}%</span>
                            </div>
                          ) : (
                            <span className="text-indigo-600 font-black whitespace-nowrap">{weights[item.id] !== undefined ? weights[item.id] : item.weight}%</span>
                          )}
                        </td>
                        {allocatedUserIds.map(uid => {
                          const val = allocations[item.id]?.[uid] || 0;
                          const isCai = item.code === 'CTI' || item.code === 'BCH';
                          return (
                            <td key={uid} className="p-1.5 text-center font-bold text-slate-500 text-xs" style={{ minWidth: '100px', width: '100px' }}>
                              <span className="whitespace-nowrap">{val}{isCai ? '%' : '%'}</span>
                            </td>
                          );
                        })}
                        <td className="p-4 font-medium text-slate-600" style={{ width: '180px' }}>
                          {item.kpisLeader && item.kpisLeader !== item.kpis ? (
                            <div className="space-y-1 text-[11px] leading-tight">
                              <div className="flex items-start gap-1"><span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase shrink-0">Staff</span> <span>{item.kpis}</span></div>
                              <div className="flex items-start gap-1"><span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.5 rounded font-black uppercase shrink-0">Leader</span> <span className="text-purple-900 font-bold">{item.kpisLeader}</span></div>
                            </div>
                          ) : (
                            item.kpis
                          )}
                        </td>
                        <td className="p-4 text-center font-black whitespace-normal break-words" style={{ width: '100px' }}>
                          {item.code === 'BCH' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={metrics.completionRate !== null ? (metrics.completionRate >= 100 ? "text-emerald-600" : "text-amber-600") : "text-slate-400 italic"}>
                                {metrics.completionRate !== null ? `${metrics.completionRate}%` : "100% (Mặc định)"}
                              </span>
                              {(() => {
                                const bchM = getBchCumulativeMetrics('ALL');
                                return (
                                  <span className="text-[9px] text-[#004b87] font-extrabold bg-blue-50 border border-blue-200 px-1 py-0.5 rounded block whitespace-nowrap animate-bounce-short" title={`Cứu Hộ: ${bchM.actualCuuHo}/${bchM.targetCuuHo}, TNDS: ${bchM.actualTnds}/${bchM.targetTnds}`}>
                                    Lũy kế: {bchM.totalActual}/{bchM.totalTarget} BH
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className={metrics.completionRate !== null ? (metrics.completionRate >= 100 ? "text-emerald-600" : "text-amber-600") : "text-slate-400 italic"}>
                              {metrics.completionRate !== null ? `${metrics.completionRate}%` : "100% (Mặc định)"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3-position Signature layout for Department print view - PRINT COMPLIANCE */}
            <div className="border-t border-dashed border-slate-200 mt-8 pt-6 pb-8 px-6 text-[11px]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="h-4 mb-1.5"></div> {/* Spacer to align with Date in col 3 */}
                  <p className="font-extrabold uppercase text-slate-800 tracking-wider">PHÒNG HCNS</p>
                  <p className="text-[9px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                  <div className="h-20"></div> {/* Blank space for actual signature */}
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-4 mb-1.5"></div> {/* Spacer to align with Date in col 3 */}
                  <p className="font-extrabold uppercase text-slate-800 tracking-wider">PHÊ DUYỆT</p>
                  <p className="text-[9px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                  <div className="h-20"></div> {/* Blank space for actual signature */}
                </div>
                <div className="flex flex-col items-center">
                  <p className="italic text-[10px] text-slate-500 font-semibold mb-1.5">Ngày......tháng.......năm 20.....</p>
                  <p className="font-extrabold uppercase text-[#004b87] tracking-wider">PHÒNG QLCL</p>
                  <p className="text-[9px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                  <div className="h-20"></div> {/* Blank space for actual signature */}
                </div>
              </div>
            </div>
          </div>
          {renderCumulativeInsuranceDashboard()}
        </motion.div>
      )}

      {activeTab === 'staff' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-500 uppercase">{isReportManager ? "CHỌN NHÂN SỰ ĐÁNH GIÁ:" : "BÁO CÁO KPI CỦA BẠN:"}</span>
              {isReportManager ? (
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-4 py-2 font-black text-slate-700 text-xs rounded-md shadow-sm outline-none animate-bounce-short"
                >
                  {evaluationStaff.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name.toUpperCase()} ({getUserRoleTitle(u)})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 font-black text-xs rounded-md shadow-sm notranslate" translate="no">
                  {currentUser.name.toUpperCase()} ({getUserRoleTitle(currentUser)})
                </span>
              )}
            </div>
            {selectedStaffId !== 'ALL' && (
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase block">ĐIỂM KPI CÁ NHÂN TÍNH TOÁN</span>
                <span className="text-2xl font-black text-emerald-600">{staffTotalKPI}%</span>
              </div>
            )}
          </div>

          <div id="pdf-export-staff" className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            {/* Print-only Header section */}
            <div className="hidden print:block border-b-2 border-slate-300 pb-4 mb-6 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                    BÁO CÁO THÁNG - KPI CÁ NHÂN
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    MÔ HÌNH QUẢN TRỊ KPI ĐA CHIỀU PHÒNG QLCL TÂN PHÚ VIỆT NAM
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-500 uppercase">Tháng báo cáo</div>
                  <div className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded mt-0.5">{reportPeriod}</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-left">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[9px] block mb-0.5">Họ và tên nhân sự</span>
                  <span className="font-black text-slate-800 uppercase text-xs notranslate" translate="no">
                    {users.find(u => u.id === selectedStaffId)?.name || 'Chưa chọn'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[9px] block mb-0.5">Chức vụ & Phòng ban</span>
                  <span className="font-black text-slate-800 text-xs">
                    {getUserRoleTitle(users.find(u => u.id === selectedStaffId))} / PHÒNG QUẢN LÝ CHẤT LƯỢNG
                  </span>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-md border border-emerald-100 text-[10px] font-black text-left">
                <span className="text-emerald-800 uppercase tracking-wider">ĐIỂM KPI CÁ NHÂN TÍNH TOÁN TOÀN KỲ:</span>
                <span className="text-sm text-emerald-700 bg-white border border-emerald-200 px-3 py-0.5 rounded shadow-sm">{staffTotalKPI}%</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-white">
                BẢNG ĐÁNH GIÁ KPI CHI TIẾT CỦA CÁ NHÂN - {users.find(u => u.id === selectedStaffId)?.name.toUpperCase() || 'CHƯA CHỌN'} (Tháng {reportPeriod})
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="bg-rose-600 hover:bg-rose-700 px-3.5 py-2 rounded text-[10px] font-black uppercase text-white shadow flex items-center gap-1 border border-rose-500 cursor-pointer active:scale-95 transition-all"
                >
                  <Printer size={12} strokeWidth={3} />
                  <span translate="no" className="notranslate">In PDF</span>
                </button>
                <button
                  onClick={handleExportIndividualExcel}
                  className="bg-teal-600 hover:bg-teal-700 px-3.5 py-2 rounded text-[10px] font-black uppercase text-white shadow flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileText size={12} strokeWidth={2.5} />
                  Trích Xuất Excel
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded text-[10px] font-black uppercase text-white shadow transition-colors"
                >
                  Lưu Đánh Giá Tháng
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse grid-table-clear">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 text-center w-12">STT</th>
                    <th className="p-4 text-center whitespace-normal max-w-sm" style={{ width: '306px' }}>KPI</th>
                    <th className="p-4 text-center">Trọng số Bộ phận</th>
                    <th className="p-4 text-center text-blue-700 bg-blue-50/50">Phân bổ cá nhân</th>
                    <th className="p-4 text-center">Trọng số cá nhân</th>
                    <th className="p-4 text-center" style={{ width: '130px' }}>Đo lường</th>
                    <th className="p-4 text-center w-24">K.Quả thực tế</th>
                    <th className="p-4 text-center w-20">Điểm KPI</th>
                    <th className="p-4 text-center w-24">QLTT đánh giá</th>
                    <th className="p-4 text-center w-40">Nhận xét & Ghi nhận</th>
                    <th className="p-4 text-center w-24 text-emerald-700 bg-emerald-50/30 font-black">KQ phê duyệt cuối cùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {/* Category A */}
                  <tr className="bg-blue-50/50 font-black text-blue-800 border-y border-blue-200/50">
                    <td colSpan={11} className="p-4 uppercase">MỤC A: KPI CHUYÊN MÔN ({getWeightSum('A', selectedStaffId)}%)</td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'A').map(item => {
                    const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
                    const kpiVal = (isLntSelected && item.coEval)
                      ? getCategoryMetrics(item.code, 'ALL')
                      : getCategoryMetrics(item.code, selectedStaffId);
                    const overrideKey = `${selectedStaffId}_${item.id}`;
                    const isCai = item.code === 'CTI' || item.code === 'BCH';

                    return (
                      <tr key={item.id} className={personalWeight > 0 ? "hover:bg-slate-50 transition-colors bg-white col-span-1" : "opacity-40 bg-slate-50/20 col-span-1"}>
                        <td className="p-4 text-center font-bold text-slate-400">{item.stt}</td>
                        <td className="p-4 max-w-sm leading-relaxed" style={{ width: '306px' }}>
                          <p className="font-bold text-slate-800">{item.label}</p>
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2.5 py-0.5 rounded mt-1.5 inline-block">Mã: {item.code}</span>
                        </td>
                        <td className="p-4 text-center font-semibold">
                          {(() => {
                            const isLd = isLeaderRole(selectedStaffId, item.code);
                            const wKey = isLd ? `${item.id}_leader` : item.id;
                            const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
                            return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
                          })()}
                        </td>
                        <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30">{alloc}{isCai ? '%' : '%'}</td>
                        <td className="p-4 text-center font-black text-slate-900">{Math.round(personalWeight)}%</td>
                        <td className="p-4 font-medium text-slate-600" style={{ width: '130px' }}>
                          {isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis}
                        </td>
                        <td className="p-4 text-center">
                          {kpiVal.items && kpiVal.items.length > 0 ? (
                            <button
                              onClick={() => setSelectedDetailCategory({ code: item.code, label: item.label })}
                              className="text-[10px] bg-slate-100 font-bold px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700 block mx-auto underline shadow-sm"
                            >
                              Gộp {kpiVal.groupedCount} việc ({kpiVal.items.length} lượt)
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-700">
                          {isNA ? "N/A" : `${displayScore}%`}
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder={isNA ? "N/A" : String(displayScore)}
                            value={itemScores[overrideKey] !== undefined ? itemScores[overrideKey] : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                              setItemScores(prev => {
                                const next = { ...prev };
                                if (val === undefined) {
                                  delete next[overrideKey];
                                } else {
                                  next[overrideKey] = val;
                                }
                                return next;
                              });
                            }}
                            className="w-16 border rounded p-1.5 text-center font-bold border-slate-300 bg-slate-50 focus:bg-white"
                          />
                        </td>
                        <td className="p-4 space-y-1.5">
                          <textarea
                            rows={2}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder="Nhận xét chi tiết..."
                            value={itemComments[overrideKey] || ''}
                            onChange={(e) => setItemComments(prev => ({ ...prev, [overrideKey]: e.target.value }))}
                            className="w-full text-[11px] border rounded p-1 border-slate-200 bg-slate-50 focus:bg-white"
                          />
                          {isReportManager && personalWeight > 0 && (
                            <button
                              onClick={() => triggerAutoFeedback(item, selectedStaffId)}
                              className="text-[9px] text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded font-black uppercase inline-block shadow-sm"
                            >
                              Nhận xét tự động
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-800 bg-emerald-50/10">
                          {itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Category B */}
                  <tr className="bg-amber-50 font-black text-amber-800 border-y border-amber-200">
                    <td colSpan={11} className="p-4 uppercase">MỤC B: NHÓM NHIỆM VỤ PHÁT SINH ({getWeightSum('B', selectedStaffId)}%)</td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'B').map(item => {
                    const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
                    const kpiVal = (isLntSelected && item.coEval)
                      ? getCategoryMetrics(item.code, 'ALL')
                      : getCategoryMetrics(item.code, selectedStaffId);
                    const overrideKey = `${selectedStaffId}_${item.id}`;
                    const isCai = item.code === 'CTI' || item.code === 'BCH';

                    return (
                      <tr key={item.id} className={personalWeight > 0 ? "hover:bg-slate-50 transition-colors bg-white col-span-1" : "opacity-40 bg-slate-50/20 col-span-1"}>
                        <td className="p-4 text-center font-bold text-slate-400">{item.stt}</td>
                        <td className="p-4 max-w-sm leading-relaxed" style={{ width: '306px' }}>
                          <p className="font-bold text-slate-800">{item.label}</p>
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2.5 py-0.5 rounded mt-1.5 inline-block">Mã: {item.code}</span>
                        </td>
                        <td className="p-4 text-center font-semibold">
                          {(() => {
                            const isLd = isLeaderRole(selectedStaffId, item.code);
                            const wKey = isLd ? `${item.id}_leader` : item.id;
                            const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
                            return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
                          })()}
                        </td>
                        <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30">{alloc}{isCai ? '%' : '%'}</td>
                        <td className="p-4 text-center font-black text-slate-900">{Math.round(personalWeight)}%</td>
                        <td className="p-4 font-medium text-slate-600" style={{ width: '130px' }}>
                          {isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis}
                        </td>
                        <td className="p-4 text-center">
                          {kpiVal.items && kpiVal.items.length > 0 ? (
                            <button
                              onClick={() => setSelectedDetailCategory({ code: item.code, label: item.label })}
                              className="text-[10px] bg-slate-100 font-bold px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700 block mx-auto underline shadow-sm"
                            >
                              Gộp {kpiVal.groupedCount} việc ({kpiVal.items.length} lượt)
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-700">
                          {isNA ? "N/A" : `${displayScore}%`}
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder={isNA ? "N/A" : String(displayScore)}
                            value={itemScores[overrideKey] !== undefined ? itemScores[overrideKey] : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                              setItemScores(prev => {
                                const next = { ...prev };
                                if (val === undefined) {
                                  delete next[overrideKey];
                                } else {
                                  next[overrideKey] = val;
                                }
                                return next;
                              });
                            }}
                            className="w-16 border rounded p-1.5 text-center font-bold border-slate-300 bg-slate-50 focus:bg-white"
                          />
                        </td>
                        <td className="p-4 space-y-1.5">
                          <textarea
                            rows={2}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder="Nhận xét chi tiết..."
                            value={itemComments[overrideKey] || ''}
                            onChange={(e) => setItemComments(prev => ({ ...prev, [overrideKey]: e.target.value }))}
                            className="w-full text-[11px] border rounded p-1 border-slate-200 bg-slate-50 focus:bg-white"
                          />
                          {isReportManager && personalWeight > 0 && (
                            <button
                              onClick={() => triggerAutoFeedback(item, selectedStaffId)}
                              className="text-[9px] text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded font-black uppercase inline-block shadow-sm"
                            >
                              Nhận xét tự động
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-800 bg-emerald-50/10">
                          {itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Category C */}
                  <tr className="bg-indigo-50 font-black text-indigo-800 border-y border-indigo-200">
                    <td colSpan={11} className="p-4 uppercase">MỤC C: PHÁT TRIỂN TỔ CHỨC ({getWeightSum('C', selectedStaffId)}%)</td>
                  </tr>
                  {kpiItems.filter(i => i.section === 'C').map(item => {
                    const { personalWeight, displayScore, alloc, isNA } = getItemScoreInfo(item, selectedStaffId);
                    const kpiVal = (isLntSelected && item.coEval)
                      ? getCategoryMetrics(item.code, 'ALL')
                      : getCategoryMetrics(item.code, selectedStaffId);
                    const overrideKey = `${selectedStaffId}_${item.id}`;
                    const isCai = item.code === 'CTI' || item.code === 'BCH';

                    return (
                      <tr key={item.id} className={personalWeight > 0 ? "hover:bg-slate-50 transition-colors bg-white col-span-1" : "opacity-40 bg-slate-50/20 col-span-1"}>
                        <td className="p-4 text-center font-bold text-slate-400">{item.stt}</td>
                        <td className="p-4 max-w-sm leading-relaxed" style={{ width: '306px' }}>
                          <p className="font-bold text-slate-800">{item.label}</p>
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2.5 py-0.5 rounded mt-1.5 inline-block">Mã: {item.code}</span>
                        </td>
                        <td className="p-4 text-center font-semibold">
                          {(() => {
                            const isLd = isLeaderRole(selectedStaffId, item.code);
                            const wKey = isLd ? `${item.id}_leader` : item.id;
                            const defaultW = isLd && item.weightLeader !== undefined ? item.weightLeader : item.weight;
                            return `${weights[wKey] !== undefined ? weights[wKey] : defaultW}%`;
                          })()}
                        </td>
                        <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30">{alloc}{isCai ? '%' : '%'}</td>
                        <td className="p-4 text-center font-black text-slate-900">{Math.round(personalWeight)}%</td>
                        <td className="p-4 font-medium text-slate-600" style={{ width: '130px' }}>
                          {isLeaderRole(selectedStaffId, item.code) && item.kpisLeader ? item.kpisLeader : item.kpis}
                        </td>
                        <td className="p-4 text-center">
                          {item.code === 'BCH' ? (
                            (() => {
                              const bchMetrics = getBchCumulativeMetrics(selectedStaffId);
                              return (
                                <div className="space-y-1 block mx-auto text-left max-w-[150px]">
                                  <button
                                    onClick={() => setSelectedDetailCategory({ code: item.code, label: item.label })}
                                    className="text-[10px] w-full text-center bg-indigo-50 border border-indigo-200 font-extrabold px-2 py-1 rounded hover:bg-indigo-100 text-indigo-700 block underline shadow-sm cursor-pointer"
                                  >
                                    Lũy kế: {bchMetrics.totalActual}/{bchMetrics.totalTarget} BH
                                  </button>
                                  <div className="text-[9px] text-slate-500 font-extrabold flex flex-col gap-0.5 justify-center pl-1 bg-slate-50 border border-slate-200 p-1.5 rounded shadow-inner">
                                    <span className="flex justify-between gap-1.5">
                                      <span>🚑 Cứu Hộ:</span>
                                      <span className="font-black text-slate-700 bg-indigo-50 px-1 py-0.25 rounded">{bchMetrics.actualCuuHo}/{bchMetrics.targetCuuHo}</span>
                                    </span>
                                    <span className="flex justify-between gap-1.5">
                                      <span>🛡️ TNDS:</span>
                                      <span className="font-black text-slate-700 bg-indigo-50 px-1 py-0.25 rounded">{bchMetrics.actualTnds}/{bchMetrics.targetTnds}</span>
                                    </span>
                                    {bchMetrics.actualKhac > 0 && (
                                      <span className="flex justify-between gap-1.5 text-blue-600">
                                        <span>📝 Khác:</span>
                                        <span className="font-black bg-blue-50 px-1 py-0.25 rounded">+{bchMetrics.actualKhac}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            kpiVal.items && kpiVal.items.length > 0 ? (
                              <button
                                onClick={() => setSelectedDetailCategory({ code: item.code, label: item.label })}
                                className="text-[10px] bg-slate-100 font-bold px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700 block mx-auto underline shadow-sm"
                              >
                                Gộp {kpiVal.groupedCount} việc ({kpiVal.items.length} lượt)
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">N/A</span>
                            )
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-700">
                          {isNA ? "N/A" : `${displayScore}%`}
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder={isNA ? "N/A" : String(displayScore)}
                            value={itemScores[overrideKey] !== undefined ? itemScores[overrideKey] : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                              setItemScores(prev => {
                                const next = { ...prev };
                                if (val === undefined) {
                                  delete next[overrideKey];
                                } else {
                                  next[overrideKey] = val;
                                }
                                return next;
                              });
                            }}
                            className="w-16 border rounded p-1.5 text-center font-bold border-slate-300 bg-slate-50 focus:bg-white"
                          />
                        </td>
                        <td className="p-4 space-y-1.5">
                          <textarea
                            rows={2}
                            disabled={!isReportManager || personalWeight === 0}
                            placeholder="Nhận xét chi tiết..."
                            value={itemComments[overrideKey] || ''}
                            onChange={(e) => setItemComments(prev => ({ ...prev, [overrideKey]: e.target.value }))}
                            className="w-full text-[11px] border rounded p-1 border-slate-200 bg-slate-50 focus:bg-white"
                          />
                          {isReportManager && personalWeight > 0 && (
                            <button
                              onClick={() => triggerAutoFeedback(item, selectedStaffId)}
                              className="text-[9px] text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded font-black uppercase inline-block shadow-sm"
                            >
                              Nhận xét tự động
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-slate-800 bg-emerald-50/10">
                          {itemScores[overrideKey] !== undefined ? `${itemScores[overrideKey]}%` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 space-y-4">
              <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCircle size={16} />
                GIẢI TRÌNH CỦA NHÂN VIÊN
              </h4>
              <textarea
                className="w-full border rounded p-4 text-xs h-36 bg-slate-50/50"
                placeholder="Nhập phản hồi tự đánh giá, thuận lợi, khó khăn trong kỳ..."
                value={staffExplanation}
                disabled={!isReportManager && selectedStaffId !== currentUser.id}
                onChange={(e) => setStaffExplanation(e.target.value)}
              />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 space-y-4">
              <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} />
                QLTT CHỈ ĐẠO & ĐÁNH GIÁ TỔNG QUAN
              </h4>
              <textarea
                className="w-full border rounded p-4 text-xs h-36 bg-slate-50/50"
                placeholder="Trưởng phòng cho ý kiến, đánh giá năng lực và thái độ làm việc..."
                value={leaderEvaluation}
                disabled={!isReportManager}
                onChange={(e) => setLeaderEvaluation(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Landscape Footer notes + 3-position signature layout - PRINT COMPLIANCE */}
          <div className="print:block hidden mt-6 border-t border-dashed border-slate-300 pt-5">
            {/* Notes full-width to drop lines nicely and save huge vertical space */}
            <div className="w-full text-[8.5px] leading-relaxed text-[#c00000] font-semibold bg-red-50/40 border border-red-100 p-2.5 rounded-md mb-6 text-left">
              <p className="font-bold text-[#800000] uppercase mb-1 text-[9px] flex items-center gap-1">⚠️ Lưu ý giải trình bổ sung:</p>
              <p className="m-0 leading-tight">- Người phê duyệt cuối là lãnh đạo duyệt trước khi chi thanh toán lương (tổng giám đốc hoặc phó tgđ được ủy quyền sẽ căn cứ vào đánh giá cá nhân, quản lý trực tiếp và ý kiến từ HR)</p>
              <p className="m-0 leading-tight mt-0.5">- Trọng số KPI giao hàng tháng của mục A và B luôn luôn bằng 100%</p>
              <p className="m-0 leading-tight mt-0.5">- Mục B - các nhiệm vụ phát sinh được ghi nhận và đánh giá cuối tháng, tỷ trọng công việc phát sinh không vượt quá 10%</p>
            </div>

            {/* 3-position signature layout */}
            <div className="w-full grid grid-cols-3 gap-6 text-[10px] text-center mt-2">
              <div className="flex flex-col items-center">
                <div className="h-4 mb-1.5"></div> {/* Spacer to align with Date in col 3 */}
                <p className="font-extrabold uppercase text-slate-800 tracking-wider">PHÊ DUYỆT</p>
                <p className="text-[8px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                <div className="h-20"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-4 mb-1.5"></div> {/* Spacer to align with Date in col 3 */}
                <p className="font-extrabold uppercase text-slate-800 tracking-wider">QUẢN LÝ TRỰC TIẾP</p>
                <p className="text-[8px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                <div className="h-20"></div>
              </div>
              <div className="flex flex-col items-center">
                <p className="italic text-[9px] text-slate-500 font-semibold mb-1.5">Ngày......tháng.......năm 20.....</p>
                <p className="font-extrabold uppercase text-slate-800 tracking-wider">NHÂN VIÊN</p>
                <p className="text-[8px] font-normal italic text-slate-400 lowercase mt-1">(ký và ghi rõ họ tên)</p>
                <div className="h-20"></div>
              </div>
            </div>
          </div>
          {renderCumulativeInsuranceDashboard()}
        </motion.div>
      )}

      {activeTab === 'config' && isReportManager && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-lg shadow-lg flex justify-between items-center bg-radial-at-t from-slate-900 via-slate-950 to-slate-900">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                XÁC LẬP MA TRẬN CẤU HÌNH
              </h2>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black uppercase tracking-tight">CƠ CẤU PHÂN BỔ THÁNG</h3>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={handlePrevConfigMonth}
                    title="Tháng trước"
                    className="p-1 px-2 hover:bg-slate-700 text-slate-300 transition-colors border-r border-slate-700 h-8 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft size={14} strokeWidth={3} />
                  </button>
                  <input 
                    type="text" 
                    value={configPeriod}
                    onChange={(e) => setConfigPeriod(e.target.value)}
                    title="Định dạng MM/YYYY (Ví dụ: 06/2026)"
                    className="bg-transparent text-white font-extrabold text-sm outline-none w-20 text-center py-1 h-8 border-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={handleNextConfigMonth}
                    title="Tháng sau"
                    className="p-1 px-2 hover:bg-slate-700 text-slate-300 transition-colors border-l border-slate-700 h-8 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
              <p className="text-xs opacity-70 mt-1.5">Sử dụng để chỉnh sửa trọng số của phòng của từng KPI và chia trực tiếp cho các bạn hàng tháng.</p>
            </div>
            <div className="flex gap-2.5 flex-wrap md:flex-nowrap">
              <button
                type="button"
                onClick={() => { setActiveTab('dept'); setIsEditingKpiList(false); }}
                className="bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white h-11 px-3.5 rounded font-black text-[10px] tracking-wider transition-all flex items-center gap-2 border border-slate-700 cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft size={18} strokeWidth={3} />
                QUAY LẠI
              </button>
              <button
                onClick={() => setIsEditingKpiList(!isEditingKpiList)}
                className={`h-11 px-4 rounded font-black text-[10px] tracking-wider shadow-md transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                  isEditingKpiList 
                    ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Settings size={18} />
                {isEditingKpiList ? 'ĐÓNG KPI' : 'DANH MỤC KPI'}
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className={`text-white h-11 px-4 rounded font-black text-[10px] tracking-wider shadow-md transition-all flex items-center gap-2 select-none cursor-pointer whitespace-nowrap ${
                  isSavingConfig 
                    ? 'bg-blue-800 opacity-80 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                {isSavingConfig ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>ĐANG LƯU...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>LƯU CẤU HÌNH</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed Manage KPI items Panel */}
          {isEditingKpiList && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" />
                  THIẾT LẬP CHI TIẾT DANH MỤC KPI THÁNG {configPeriod}
                </h4>
                <button 
                  onClick={() => setIsEditingKpiList(false)}
                  className="text-xs bg-slate-100 font-bold px-3 py-1.5 rounded text-slate-500 hover:bg-slate-200"
                >
                  Đóng thiết lập
                </button>
              </div>

              {/* Add form */}
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Mục (Phần)</label>
                  <select 
                    value={newKpiSection} 
                    onChange={(e) => setNewKpiSection(e.target.value as any)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white"
                  >
                    <option value="A">Mục A: Chuyên môn</option>
                    <option value="B">Mục B: Phát sinh ngoài</option>
                    <option value="C">Mục C: Tổ chức</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">STT</label>
                  <input 
                    type="number" 
                    value={newKpiStt} 
                    onChange={(e) => setNewKpiStt(parseInt(e.target.value) || 1)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Tên Chỉ tiêu / Nội dung</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Tổ chức rà soát hồ sơ công bố hàng tuần..." 
                    value={newKpiLabel} 
                    onChange={(e) => setNewKpiLabel(e.target.value)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Mã (3-4 Chữ)</label>
                  <input 
                    type="text" 
                    placeholder="Mã (Ví dụ: CBA)" 
                    value={newKpiCode} 
                    onChange={(e) => setNewKpiCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="w-full border rounded p-2 text-xs font-bold bg-white text-center"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1 font-black leading-none">Trọng số NV (%)</label>
                  <input 
                    type="number" 
                    value={newKpiWeight} 
                    onChange={(e) => setNewKpiWeight(parseInt(e.target.value) || 0)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white text-center"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-blue-500 mb-1 font-black leading-none">Trọng QL (%)</label>
                  <input 
                    type="number" 
                    placeholder="Trùng NV"
                    value={newKpiWeightLeader !== undefined ? newKpiWeightLeader : ''} 
                    onChange={(e) => setNewKpiWeightLeader(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white text-center border-blue-200"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Đo lường (Nhân viên)</label>
                  <input 
                    type="text" 
                    placeholder="Kịp tiến độ và đạt yêu cầu [NV]..." 
                    value={newKpiMeasure} 
                    onChange={(e) => setNewKpiMeasure(e.target.value)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] uppercase text-blue-700 font-black mb-1">Đo lường (Leader/Quản lý)</label>
                  <input 
                    type="text" 
                    placeholder="Bỏ trống nếu trùng với Nhân viên..." 
                    value={newKpiMeasureLeader} 
                    onChange={(e) => setNewKpiMeasureLeader(e.target.value)}
                    className="w-full border rounded p-2 text-xs font-bold bg-white border-blue-200 text-blue-800"
                  />
                </div>
                <div className="col-span-1 w-full">
                  <button 
                    onClick={handleAddKpiItem}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs rounded py-2 shadow-sm h-9 flex items-center justify-center gap-1"
                  >
                    <span>Lưu</span>
                  </button>
                </div>
              </div>

              {/* Items List inside Edit panel for fast management */}
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="w-full text-left text-xs border-collapse grid-table-clear">
                  <thead>
                    <tr className="bg-slate-50 border-b font-black text-slate-500 text-[10px] uppercase">
                      <th className="p-3 text-center w-16">MỤC</th>
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3 text-center whitespace-nowrap">TÊN CHỈ TIÊU KPI ĐẦU VIỆC</th>
                      <th className="p-3 text-center w-16">MÃ</th>
                      <th className="p-3 text-center">CHỈ SỐ ĐO LƯỜNG (NV & QL)</th>
                      <th className="p-3 text-center w-28">TRỌNG SỐ (%)</th>
                      <th className="p-3 text-center w-20">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 font-bold">
                    {kpiItems.map(item => {
                      const isEditing = editingKpiId === item.id;
                      const itemWeight = weights[item.id] !== undefined ? weights[item.id] : item.weight;
                      const itemWeightLeader = weights[`${item.id}_leader`] !== undefined ? weights[`${item.id}_leader`] : (item.weightLeader !== undefined ? item.weightLeader : item.weight);

                      return (
                        <tr key={item.id} className={`${isEditing ? 'bg-blue-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="p-3 text-center font-black text-slate-500">
                            {isEditing ? (
                              <select
                                value={item.section}
                                onChange={(e) => handleEditKpiField(item.id, 'section', e.target.value as 'A' | 'B' | 'C')}
                                className="border rounded p-1 text-[10px] font-bold bg-white text-slate-800"
                              >
                                <option value="A">Mục A</option>
                                <option value="B">Mục B</option>
                                <option value="C">Mục C</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded text-[10px] uppercase select-none ${
                                item.section === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                item.section === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>Mục {item.section}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                value={item.stt}
                                onChange={(e) => handleEditKpiField(item.id, 'stt', parseInt(e.target.value) || 1)}
                                className="w-12 border rounded text-center p-1 text-xs font-bold bg-white text-slate-800"
                              />
                            ) : (
                              <span className="text-slate-800">{item.stt}</span>
                            )}
                          </td>
                          <td className={`p-3 font-semibold text-slate-800 ${isEditing ? 'min-w-[400px]' : 'max-w-xs'}`}>
                            {isEditing ? (
                              <textarea 
                                value={item.label}
                                onChange={(e) => handleEditKpiField(item.id, 'label', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 shadow-sm text-xs font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 custom-scrollbar-slim"
                                rows={3}
                              />
                            ) : (
                              <div className="line-clamp-2 text-slate-900 font-semibold">{item.label}</div>
                            )}
                          </td>
                          <td className="p-3 text-center text-blue-800 font-black">
                            {isEditing ? (
                              <input 
                                type="text" 
                                value={item.code}
                                onChange={(e) => handleEditKpiField(item.id, 'code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                className="w-14 bg-white border rounded text-center py-1 shadow-sm text-xs font-black focus:border-blue-500"
                              />
                            ) : (
                              <span>{item.code}</span>
                            )}
                          </td>
                          <td className={`p-3 gap-1.5 space-y-1.5 ${isEditing ? 'min-w-[320px]' : 'w-80'}`}>
                            {isEditing ? (
                              <>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-1 rounded font-black uppercase shrink-0 mt-1 select-none">NV</span>
                                  <textarea 
                                    value={item.kpis}
                                    onChange={(e) => handleEditKpiField(item.id, 'kpis', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 shadow-sm text-xs font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 custom-scrollbar-slim"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-1 rounded font-black uppercase shrink-0 mt-1 select-none">QL</span>
                                  <textarea 
                                    placeholder="Trùng với Nhân viên"
                                    value={item.kpisLeader || ''}
                                    onChange={(e) => handleEditKpiField(item.id, 'kpisLeader', e.target.value || undefined)}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 shadow-sm text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800 custom-scrollbar-slim"
                                    rows={2}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="text-xs space-y-1 text-slate-600 font-medium">
                                <div className="flex items-start gap-1">
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase shrink-0 mt-0.5">NV</span>
                                  <span>{item.kpis}</span>
                                </div>
                                {item.kpisLeader && (
                                  <div className="flex items-start gap-1">
                                    <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-black uppercase shrink-0 mt-0.5">QL</span>
                                    <span>{item.kpisLeader}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-black w-36">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 items-center justify-center">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">NV</span>
                                  <input 
                                    type="number" 
                                    value={itemWeight}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value) || 0;
                                      setWeights(prev => ({ ...prev, [item.id]: v }));
                                      handleEditKpiField(item.id, 'weight', v);
                                    }}
                                    className="w-12 border rounded text-center py-1 text-xs font-black bg-white text-slate-800"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[9px] text-blue-500 font-bold uppercase shrink-0">QL</span>
                                  <input 
                                    type="number" 
                                    value={itemWeightLeader}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value) || 0;
                                      setWeights(prev => ({ ...prev, [`${item.id}_leader`]: v }));
                                      handleEditKpiField(item.id, 'weightLeader', v);
                                    }}
                                    className="w-12 border rounded text-center py-1 text-xs font-black bg-white text-blue-800"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs space-y-0.5 text-center">
                                <div className="text-slate-600 font-black">NV: <span className="text-slate-800">{itemWeight}%</span></div>
                                <div className="text-blue-600 font-black">QL: <span className="text-blue-800">{itemWeightLeader}%</span></div>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {isEditing ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingKpiId(null);
                                      setKpiItemsBackup(null);
                                      showToast(`Đã lưu chỉnh sửa chỉ tiêu [${item.code}]! Hãy lưu cấu hình tháng để áp dụng vĩnh viễn.`, "success");
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-black uppercase text-[10px] w-14 shadow-sm transition-all"
                                  >
                                    Xong
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (kpiItemsBackup) {
                                        setKpiItems(kpiItemsBackup);
                                      }
                                      setEditingKpiId(null);
                                      setKpiItemsBackup(null);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 border px-2.5 py-1 rounded font-black uppercase text-[10px] w-14 transition-all"
                                  >
                                    Hủy
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    onClick={() => {
                                      setEditingKpiId(item.id);
                                      setKpiItemsBackup([...kpiItems]);
                                    }}
                                    title="Sửa"
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded transition-all flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                  >
                                    <Edit size={14} className="stroke-[2.5]" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteKpiItem(item.id)}
                                    title="Xóa"
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded transition-all flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                  >
                                    <Trash2 size={14} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center gap-3">
                <span className="text-xs text-slate-500 font-bold italic">
                  * Thiết lập danh sách KPI chuyên môn cho riêng tháng {configPeriod}.
                </span>
                <button
                  type="button"
                  onClick={handleSaveKpiList}
                  disabled={isSavingKpiList}
                  className={`text-white px-5 py-2.5 rounded font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 select-none ${
                    isSavingKpiList 
                      ? 'bg-blue-800 opacity-85 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isSavingKpiList ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} strokeWidth={2.5} />
                      <span>LƯU RIÊNG DANH MỤC KPI THÁNG {configPeriod}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

                 {/* Personnel selector block to add/remove allocated users */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              QUẢN LÝ NHÂN SỰ PHÂN BỔ CO-EVALUATION ({allocatedUserIds.length} nhân sự)
            </h4>
            
            <p className="text-xs text-slate-500 mb-4 font-bold leading-relaxed">
              * Tích chọn để thêm/bớt nhân sự tham gia trực tiếp vào Phân bổ Trọng số ma trận và Báo cáo đánh giá của tháng {configPeriod}.
            </p>

            <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              {sortUsers(users).map(u => {
                const isSelected = allocatedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (isSelected) {
                        // Keep at least one user
                        if (allocatedUserIds.length <= 1) {
                          showToast("Phải có ít nhất 1 nhân sự tham gia ma trận!", "warning");
                          return;
                        }
                        setAllocatedUserIds(prev => sortUserIds(prev.filter(uid => uid !== u.id)));
                      } else {
                        setAllocatedUserIds(prev => sortUserIds([...prev, u.id]));
                        // Initialize custom allocation to 0 for safety
                        setAllocations(prev => {
                          const next = { ...prev };
                          kpiItems.forEach(item => {
                            if (!next[item.id]) next[item.id] = {};
                            if (next[item.id][u.id] === undefined) {
                              next[item.id][u.id] = 0;
                            }
                          });
                          return next;
                        });
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${isSelected ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                      {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="shrink-0">{u.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded opacity-75 uppercase bg-black/10">
                      {u.role === 'Leader' ? 'Leader' : u.role === 'Admin' ? 'Admin' : u.role === 'Trưởng Phòng' ? 'Trưởng Phòng' : 'Staff'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse grid-table-clear">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                    <th className="px-2 py-4 text-center w-12">STT</th>
                    <th className="p-4 text-center whitespace-normal min-w-[360px] lg:min-w-[420px]">CHỈ TIÊU KPI</th>
                    <th className="px-2 py-4 text-center w-20 text-red-600 bg-red-50/20 font-black">Gánh 100% (Co-Eval)</th>
                    <th className="px-2 py-4 text-center w-24">Trọng số Phòng ban (%)</th>
                    {allocatedUserIds.map(uid => {
                      const u = users.find(usr => usr.id === uid);
                      return (
                        <th key={uid} className="px-1 py-4 text-center text-blue-700 bg-blue-50/50 w-24 text-[9px] leading-tight">
                          <span translate="no" className="notranslate">{u?.name || 'Nhân viên'}</span> (%)
                        </th>
                      );
                    })}
                    <th className="px-2 py-4 text-center w-24">Tự động cân bằng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                  {kpiItems.map(item => {
                    const roomW = weights[item.id] !== undefined ? weights[item.id] : item.weight;
                    const allocMap = allocations[item.id] || {};
                    const sumAlloc = allocatedUserIds.reduce((sum, uid) => sum + (allocMap[uid] || 0), 0);

                    const handleAllocUpdate = (usrId: string, value: number) => {
                      setAllocations(prev => {
                        const next = { ...prev };
                        if (!next[item.id]) next[item.id] = {};
                        next[item.id] = { ...next[item.id], [usrId]: value };
                        return next;
                      });
                    };

                    const autoBalance = () => {
                      const list = allocatedUserIds;
                      if (list.length === 0) return;
                      const size = list.length;
                      const averageVal = Math.floor(100 / size);
                      setAllocations(prev => {
                        const next = { ...prev };
                        const rowAlloc: Record<string, number> = {};
                        list.forEach((id, index) => {
                          rowAlloc[id] = index === size - 1 ? 100 - (averageVal * (size - 1)) : averageVal;
                        });
                        next[item.id] = rowAlloc;
                        return next;
                      });
                    };

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-4 text-center font-bold text-slate-400">{item.stt}</td>
                        <td className="p-4 font-bold text-slate-800 leading-snug min-w-[360px] lg:min-w-[420px] relative group">
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span>{item.label}</span>
                            {isReportManager && (
                              <button
                                id={`edit-kpi-btn-config-${item.id}`}
                                onClick={() => handleStartEditKpiItemFull(item)}
                                className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded border border-transparent hover:border-blue-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 cursor-pointer shadow-sm animate-in fade-in zoom-in-95 duration-100"
                                title="Chỉnh sửa chỉ tiêu nhanh"
                              >
                                <Edit size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <button
                            onClick={() => {
                              setKpiItems(prev => prev.map(k => k.id === item.id ? { ...k, coEval: !k.coEval } : k));
                            }}
                            className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-all ${
                              item.coEval 
                                ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                                : 'bg-slate-50 border-slate-300 hover:border-slate-400 cursor-pointer text-transparent hover:bg-slate-100'
                            }`}
                            title="Tích chọn để Trưởng phòng gánh chung kết quả theo trung bình phân bổ của các nhân viên"
                          >
                            <Check size={14} strokeWidth={3} className={item.coEval ? "text-white" : "text-transparent"} />
                          </button>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase shrink-0">NV</span>
                              <input 
                                type="number"
                                min={0}
                                max={100}
                                value={weights[item.id] !== undefined ? weights[item.id] : item.weight}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setWeights(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-12 border rounded p-0.5 text-center font-black bg-white text-slate-800 text-xs shadow-sm"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-black uppercase shrink-0 font-black">QL</span>
                              <input 
                                type="number"
                                min={0}
                                max={100}
                                value={weights[`${item.id}_leader`] !== undefined ? weights[`${item.id}_leader`] : (item.weightLeader !== undefined ? item.weightLeader : item.weight)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setWeights(prev => ({ ...prev, [`${item.id}_leader`]: val }));
                                }}
                                className="w-12 border rounded p-0.5 text-center font-black bg-white text-blue-800 text-xs shadow-sm"
                              />
                            </div>
                          </div>
                        </td>
                        {allocatedUserIds.map((uid, index) => {
                          const allocationVal = allocMap[uid] || 0;
                          const isCai = item.code === 'CTI' || item.code === 'BCH';
                          return (
                            <td key={uid} className="px-1 py-4 text-center bg-blue-50/10">
                              <input 
                                type="number"
                                min={0}
                                max={100}
                                value={allocationVal}
                                onChange={(e) => handleAllocUpdate(uid, parseInt(e.target.value) || 0)}
                                className="w-14 border rounded p-0.5 text-center font-bold bg-white text-slate-800 text-xs shadow-sm"
                              />
                              {index === allocatedUserIds.length - 1 && (
                                <div className={`text-[10px] font-black mt-1 ${isCai ? "text-emerald-600" : (sumAlloc === 100 ? "text-emerald-600" : "text-amber-500 text-yellow-600 animate-pulse")}`}>
                                  Tổng: {sumAlloc}{isCai ? '%' : '%'}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-4 text-center">
                          <button
                            onClick={autoBalance}
                            className="bg-slate-100 font-bold px-2.5 py-1.5 rounded hover:bg-emerald-50 text-emerald-700 block mx-auto text-[10px]"
                          >
                            Chia Đều
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-b-lg border-x border-b border-slate-200 flex justify-between items-center gap-3">
            <span className="text-xs text-slate-500 font-bold italic">
              * Phân bổ tỷ lệ % gánh chỉ tiêu giữa các thành viên cho ma trận KPI tháng {configPeriod}.
            </span>
            <button
              type="button"
              onClick={handleSaveMatrix}
              disabled={isSavingMatrix}
              className={`text-white px-5 py-2.5 rounded font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 select-none ${
                isSavingMatrix 
                  ? 'bg-blue-800 opacity-85 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer'
              }`}
            >
              {isSavingMatrix ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} strokeWidth={2.5} />
                  <span>LƯU MA TRẬN PHÂN BỔ NHÂN SỰ THÁNG {configPeriod}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Recurrence Tasks Group details drawer */}
      <AnimatePresence>
        {selectedDetailCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            >
              {(() => {
                const drawerKpiItem = kpiItems.find(item => item.code === selectedDetailCategory.code);
                const isCoEvalAndLNT = drawerKpiItem?.coEval && isLntSelected;
                let headerTitle = "GỘP NHÓM TỰ ĐỘNG CHU KỲ (RECURRENCE SUMMARY)";
                if (selectedDetailCategory.code === 'AIU') {
                  headerTitle = "DANH SÁCH KIỂM TRA PHÊ DUYỆT ỨNG DỤNG AI";
                } else if (isCoEvalAndLNT) {
                  headerTitle = "KIỂM TRA & PHÊ DUYỆT CÁC CÔNG VIỆC";
                }
                
                return (
                  <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                    <div className="max-w-[90%]">
                      <span className={`font-black tracking-widest text-[#e2e8f0] uppercase block ${isCoEvalAndLNT ? 'text-[20px] mb-1.5' : 'text-[10px]'}`}>
                        {headerTitle}
                      </span>
                      <p className="text-sm font-bold text-white mt-1 leading-relaxed whitespace-normal break-words">{selectedDetailCategory.label}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDetailCategory(null)}
                      className="p-1 rounded-full hover:bg-white/10 shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>
                );
              })()}

              <div className="p-6 overflow-y-auto space-y-4">
                <p className="text-xs text-slate-500 italic">
                  {selectedDetailCategory.code === 'AIU' 
                    ? "Danh sách tổng hợp toàn bộ các công việc trong kỳ báo cáo hoạt động và nội dung ghi nhận ứng dụng AI chi tiết của nhân sự, dùng để làm cơ sở đánh giá chất lượng và kiểm soát KPI Phòng ban."
                    : "Các nhiệm vụ lặp lại tuần hoàn có chung tiêu đề dự án/mục tiêu được nén gọn thành 1 đầu việc chung, biểu thị tổng số phiên kiểm soát thực tế."}
                </p>

                {(() => {
                  const drawerKpiItem = kpiItems.find(item => item.code === selectedDetailCategory.code);
                  const isCoEvalAndLNT = drawerKpiItem?.coEval && isLntSelected;
                  const metricsSource = isCoEvalAndLNT 
                    ? getCategoryMetrics(selectedDetailCategory.code, 'ALL')
                    : getCategoryMetrics(selectedDetailCategory.code, selectedStaffId);
                  
                  return metricsSource.groups?.map((g, gi) => (
                    <div key={gi} className="border border-slate-200 p-4 rounded bg-slate-50 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="max-w-[80%] text-left">
                          {(() => {
                            const cat = taskCategories.find(c => (c.code || '').toUpperCase().trim() === (selectedDetailCategory?.code || '').toUpperCase().trim());
                            return (
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                                {selectedDetailCategory?.code === 'AIU' ? 'HÌNH THỨC SỬ DỤNG AI' : (cat?.activityName || 'KIỂM SOÁT ĐẦU VIỆC')}
                              </span>
                            );
                          })()}
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">{g.title}</h4>
                          {g.objective && (
                            <div className="mt-1.5 flex items-start gap-1">
                              <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded leading-none uppercase shrink-0 ${selectedDetailCategory?.code === 'AIU' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
                                {selectedDetailCategory?.code === 'AIU' ? 'GHI CHÚ ỨNG DỤNG AI' : 'MỤC TIÊU'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium leading-normal">{g.objective}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {selectedDetailCategory?.code === 'AIU' ? (
                            <span className={`text-[12px] font-extrabold ${g.completed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {g.completed > 0 ? 'Đã áp dụng AI' : 'Không có AI'}
                            </span>
                          ) : (
                            <>
                              <span className="text-[14px] font-black text-blue-700">{g.completed} / {g.total} phiên</span>
                              <span className="text-[10px] font-bold text-slate-400 block mt-1">Hoàn thành: {g.percent}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded overflow-hidden">
                        <div className={`${selectedDetailCategory?.code === 'AIU' ? 'bg-rose-600' : 'bg-blue-600'} h-full`} style={{ width: `${g.percent}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="bg-slate-50 border-t p-4 flex justify-end">
                <button
                  onClick={() => setSelectedDetailCategory(null)}
                  className="bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded shadow hover:bg-slate-900"
                >
                  ĐỐNG Ý & THOÁT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Item Full Edit Modal */}
      <AnimatePresence>
        {editingKpiItemFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-8"
            >
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase block">
                    CHỈNH SỬA THÔNG TIN CHỈ TIÊU KPI
                  </span>
                  <p className="text-sm font-bold text-white mt-1">Mã chỉ tiêu: {editingKpiItemFull.code}</p>
                </div>
                <button
                  onClick={() => setEditingKpiItemFull(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white shrink-0 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh] custom-scrollbar">
                {/* Section selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Mục (Phần)</label>
                    <select
                      value={tempEditSection}
                      onChange={(e) => setTempEditSection(e.target.value as 'A' | 'B' | 'C')}
                      className="w-full border rounded p-2 text-xs font-bold bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="A">Mục A: Chuyên môn</option>
                      <option value="B">Mục B: Phát sinh ngoài</option>
                      <option value="C">Mục C: Tổ chức</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">STT</label>
                    <input
                      type="number"
                      min="1"
                      value={tempEditStt}
                      onChange={(e) => setTempEditStt(parseInt(e.target.value) || 1)}
                      className="w-full border rounded p-2 text-xs font-bold bg-white text-slate-800 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Label (Tên chỉ tiêu) */}
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">CHỈ TIÊU KPI CHUYÊN MÔN / ĐẦU VIỆC</label>
                  <textarea
                    value={tempEditLabel}
                    onChange={(e) => setTempEditLabel(e.target.value)}
                    className="w-full border rounded p-2.5 text-xs font-semibold bg-white text-slate-800 leading-normal focus:ring-1 focus:ring-blue-500 outline-none custom-scrollbar-slim"
                    rows={3}
                    placeholder="Nhập tên nội dung/chuẩn chỉ tiêu..."
                  />
                </div>

                {/* Code & Weights in grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Mã (3-4 chữ)</label>
                    <input
                      type="text"
                      value={tempEditCode}
                      onChange={(e) => setTempEditCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="w-full border rounded p-2 text-xs font-black bg-white text-blue-700 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Mã dự án/KPI"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-slate-600 font-bold mb-1 leading-none">Trọng số NV (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempEditWeight}
                      onChange={(e) => setTempEditWeight(parseInt(e.target.value) || 0)}
                      className="w-full border rounded p-2 text-xs font-bold bg-white text-slate-800 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-blue-700 font-bold mb-1 leading-none">Trọng số QL (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempEditWeightLeader !== undefined ? tempEditWeightLeader : ''}
                      placeholder="Giống NV"
                      onChange={(e) => setTempEditWeightLeader(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full border border-blue-200 rounded p-2 text-xs font-bold bg-white text-blue-800 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Measure descriptors */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Chỉ số đo lường (Nhân viên)</label>
                    <textarea
                      value={tempEditKpis}
                      onChange={(e) => setTempEditKpis(e.target.value)}
                      className="w-full border rounded p-2 text-xs font-medium bg-white text-slate-800 leading-normal focus:ring-1 focus:ring-blue-500 outline-none custom-scrollbar-slim"
                      rows={2}
                      placeholder="Đo lường sản phẩm cho Nhân viên..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-blue-700 font-bold mb-1">Chỉ số đo lường (Leader/Quản lý)</label>
                    <textarea
                      value={tempEditKpisLeader}
                      onChange={(e) => setTempEditKpisLeader(e.target.value)}
                      className="w-full border border-blue-200 rounded p-2 text-xs font-semibold bg-white text-blue-800 leading-normal focus:ring-1 focus:ring-blue-500 outline-none custom-scrollbar-slim"
                      rows={2}
                      placeholder="Để trống nếu áp dụng trùng với Nhân viên..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t p-4 flex justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingKpiItemFull(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[10px] px-3.5 py-2.5 rounded transition-colors uppercase"
                >
                  HỦY BỎ
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEditKpiItemFull(false)}
                    title="Lưu tạm vào giao diện, cần nhấn nút lưu tháng sau đó"
                    className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-extrabold text-[10px] px-3.5 py-2.5 rounded transition-colors uppercase"
                  >
                    LƯU TẠM BỘ NHỚ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEditKpiItemFull(true)}
                    title="Lưu cập nhật và đồng bộ trực tiếp lên Cloud ngay"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-4 py-2.5 rounded shadow hover:shadow-md transition-colors uppercase"
                  >
                    LƯU & ĐỒNG BỘ CLOUD
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      {/* Modern High-End Floating Toast Status Indicator */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border font-bold pointer-events-auto backdrop-blur-md select-none ${
              toast.type === 'success' ? 'bg-emerald-600/95 text-white border-emerald-400' :
              toast.type === 'error' ? 'bg-rose-500/95 text-white border-rose-400' :
              toast.type === 'warning' ? 'bg-amber-500/95 text-black border-amber-400' :
              'bg-blue-600/95 text-white border-blue-500'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full animate-ping shrink-0 ${
              toast.type === 'success' ? 'bg-white' :
              toast.type === 'error' ? 'bg-white' :
              toast.type === 'warning' ? 'bg-black' :
              'bg-white'
            }`} />
            <span className="text-xs leading-none">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="hover:opacity-80 transition-opacity ml-2 font-black text-sm text-current cursor-pointer"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cấu hình IN FILE PDF (Print Settings Dialog) Standardized with other pages */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999999] animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />
              
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                  <Printer size={24} strokeWidth={2.5} />
                </div>

                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2 text-slate-900">
                  CẤU HÌNH IN FILE PDF
                </h3>
                
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4 px-1">
                  Chọn khổ giấy và tỷ lệ để xuất dữ liệu đẹp nhất, không bị lỗi tách đôi hình ảnh biểu đồ:
                </p>

                {/* Print Layout and Orientation Preferences */}
                <div className="w-full text-left space-y-3 mb-5">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">KHỔ GIẤY IN:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalPrintOrient('portrait')}
                        className={`py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${modalPrintOrient === 'portrait' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        Khổ Đứng (Portrait)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalPrintOrient('landscape')}
                        className={`py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${modalPrintOrient === 'landscape' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        Khổ Ngang (Landscape)
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">TỶ LỆ CO GIÃN (CHỐNG TRÀN & LỆCH TRANG):</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[100, 95, 90, 85, 80, 75, 70, 60].map((scaleVal) => (
                        <button
                          key={scaleVal}
                          type="button"
                          onClick={() => setModalPrintScale(scaleVal)}
                          className={`py-1.5 rounded-xl text-[9px] font-black transition-all border ${modalPrintScale === scaleVal ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {scaleVal}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-2 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-left">
                  <div className="flex gap-2 items-start">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                    <span className="text-slate-600 font-medium">Bấm <strong className="text-slate-800">MỞ TRANG IN ↗</strong> bên dưới để mở trang biểu đồ sạch ở tab riêng biệt. Giao diện in sẽ tự động kích hoạt chế độ in chất lượng cao nhất sau khi nạp đủ dữ liệu.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                    <span className="text-slate-600 font-medium">Giao diện in sẽ tự động áp dụng khổ giấy {modalPrintOrient === 'portrait' ? 'Dọc' : 'Ngang'} và tỷ lệ {modalPrintScale}% vô cùng xuất sắc.</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    HỦY
                  </button>
                  <button
                    onClick={handleOpenNewTabToPrint}
                    className="flex-[2] h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-200 hover:shadow active:scale-95 transition-all"
                  >
                    <ExternalLink size={12} strokeWidth={2.5} />
                    MỞ TRANG IN ↗
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
