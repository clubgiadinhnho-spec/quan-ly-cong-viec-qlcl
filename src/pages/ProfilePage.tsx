import React, { useState, useEffect } from 'react';
import { JobAvatar } from '../components/common/JobAvatar';
import { calculateKPI } from '../utils/taskUtils';
import { User, Task, TaskCategory } from '../types';
import { User as UserIcon, FileText, MessageSquare, Shield, HelpCircle, CheckCircle2, Clock, Edit3, Save, Lock, Mail, Phone, UserCircle, Key, Eye, EyeOff, CheckCircle, Camera, Printer, ExternalLink, X } from 'lucide-react';
import { getPerformanceAdvice } from '../lib/gemini';
import { formatDate, getMonthYear } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../components/common/Avatar';
import { getSafeNameProps, isUserTask, isTaskDeleted } from '../utils/userUtils';
import { ChevronDown, Calendar, Users, Target, PieChart as PieChartIcon, BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { generateUniqueKey } from '../utils/stringUtils';
import { updateAuthPassword } from '../lib/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ProfilePageProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  onUpdateProfile: (email: string, updates: Partial<User>) => Promise<void>;
  categories: TaskCategory[];
}

// GIÁ TRỊ BẤT BIẾN - AI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI DANH SÁCH CHỨC DANH NÀY
const getDisplayNameTitle = (user: User) => {
  if (user.title && user.title !== 'CHUYÊN VIÊN QC' && user.title !== 'CHỜ CẬP NHẬT') return user.title.toUpperCase();
  
  const normName = user.name.trim();
  if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên') return 'ADMIN';
  return user.title || 'CHUYÊN VIÊN QC';
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

export const ProfilePage = ({ currentUser, tasks, users, categories, onUpdateProfile }: ProfilePageProps) => {
  const [isClient, setIsMounted] = useState(false);
  useEffect(() => {
    const handle = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const isAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    const adminEmails = [
      "truong.le@tanphuvietnam.vn", 
      "lenhattruong.tpp@gmail.com", 
      "lenhattruong.caphef1@gmail.com",
      "club.nhuatanphu@gmail.com", 
      "tanphuvietnam.tpp@gmail.com", 
      "truongln.tanhongngoc@gmail.com"
    ];
    return currentUser.name === 'Lê Nhật Trường' || 
           currentUser.role === 'Admin' || 
           (currentUser.title || '').toUpperCase().includes('TRƯỞNG PHÒNG') ||
           adminEmails.includes((currentUser.companyEmail || '').toLowerCase()) ||
           adminEmails.includes((currentUser.personalEmail || '').toLowerCase());
  }, [currentUser]);

  const [filterScope, setFilterScope] = useState<'mine' | 'department' | string>('mine');
  
  const initialScopeSet = React.useRef(false);
  useEffect(() => {
    if (currentUser && !initialScopeSet.current) {
      setFilterScope(isAdmin ? 'department' : (currentUser.uniqueKey || 'mine'));
      initialScopeSet.current = true;
    }
  }, [currentUser, isAdmin]);
  
  // Use filterScope to determine who we are viewing
  const userBeingViewed = React.useMemo(() => {
    if (!filterScope || filterScope === 'mine' || filterScope === 'department') return currentUser;
    return users.find(u => u.uniqueKey === filterScope || u.id === filterScope) || currentUser;
  }, [filterScope, currentUser, users]);

  const user = userBeingViewed;
  
  const [isEditing, setIsEditing] = useState(false);
  
  // GIÁ TRỊ MẶC ĐỊNH CHO BỐ CỤC - CỐ ĐỊNH, KHÔNG CÒN TÙY CHỈNH
  const DEFAULT_LAYOUT = [
    { id: 'TYPE_STATS', span: 6, height: 500, order: 0 },
    { id: 'CHART', span: 6, height: 500, order: 1 },
    { id: 'STATUS_CHART', span: 4, height: 370, order: 2 },
    { id: 'RADAR_CHART', span: 4, height: 370, order: 3 },
    { id: 'RANKING_CHART', span: 4, height: 370, order: 4 },
    { id: 'AI', span: 12, height: 0, order: 5 }
  ];

  const layoutConfig = React.useMemo(() => {
    return DEFAULT_LAYOUT.filter(item => {
      // THIẾT QUÂN LUẬT: Nhân viên không được xem bảng xếp hạng tổng
      if (item.id === 'RANKING_CHART' && !isAdmin) return false;
      return true;
    });
  }, [isAdmin]);

  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [topN, setTopN] = useState<number>(0); // 0 means All
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [modalPrintOrient, setModalPrintOrient] = useState<'portrait' | 'landscape'>('portrait');
  const [modalPrintScale, setModalPrintScale] = useState<number>(80);

  const urlParams = React.useMemo(() => {
    return typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  }, []);

  const isPrintMode = React.useMemo(() => {
    return urlParams?.get('print') === 'true';
  }, [urlParams]);

  const layoutOrient = React.useMemo(() => {
    return urlParams?.get('layout_orient') || modalPrintOrient;
  }, [urlParams, modalPrintOrient]);

  const printScale = React.useMemo(() => {
    return Number(urlParams?.get('print_scale')) || modalPrintScale;
  }, [urlParams, modalPrintScale]);

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handleOpenNewTabToPrint = () => {
    const printUrl = new URL(window.location.href);
    printUrl.searchParams.set('print', 'true');
    printUrl.searchParams.set('layout_orient', modalPrintOrient);
    printUrl.searchParams.set('print_scale', modalPrintScale.toString());
    window.open(printUrl.toString(), '_blank');
    setShowPrintModal(false);
  };

  const isSelf = currentUser?.id === user?.id;
  const canEdit = isAdmin || isSelf; 

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    companyEmail: user?.companyEmail || '',
    personalEmail: user?.personalEmail || 'CHỜ CẬP NHẬT',
    title: user?.title || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (!isEditing && user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        companyEmail: user.companyEmail || '',
        personalEmail: user.personalEmail || 'CHỜ CẬP NHẬT',
        title: user.title || '',
        avatar: user.avatar || ''
      });
    }
  }, [user?.id, user?.name, user?.phone, user?.companyEmail, user?.personalEmail, user?.avatar, isEditing]);

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showScoringGuide, setShowScoringGuide] = useState(false);

  const hasDelegatedPermissions = (u: any) => {
    if (!u || !u.delegatedPermissions) return false;
    try {
      return Object.values(u.delegatedPermissions || {}).some(v => !!v);
    } catch (e) {
      return false;
    }
  };

  // LOGIC TÍNH TOÁN DỮ LIỆU ĐƯỢC LỌC
  const getFilteredData = () => {
    // THIẾT QUÂN LUẬT: Nhân viên chỉ được xem dữ liệu của chính mình
    const currentScope = isAdmin ? filterScope : 'mine';

    // THIẾT QUÂN LUẬT: Luôn lọc bỏ công việc đã xóa để khớp với các Board (Metric Integrity)
    // THIẾT QUÂN LUẬT: Master Data Only - Không đếm các bản ghi lịch sử chu kỳ (isCycleRecord)
    // THIẾT QUÂN LUẬT: Chỉ thống kê các việc đã Duyệt (APPROVED) hoặc Hoàn thành (COMPLETED) để khớp với Bảng công việc
    let filtered = tasks.filter(t => 
      !isTaskDeleted(t) && 
      !t.isCycleRecord && 
      (t.status === 'APPROVED' || t.status === 'COMPLETED' || t.status === 'Hoàn thành') &&
      !t.waitingApproval
    );

    // 1. Lọc theo phạm vi (Cá nhân / Cả phòng / Nhân sự cụ thể)
    if (currentScope === 'mine') {
      filtered = filtered.filter(t => isUserTask(t, user));
    } else if (currentScope === 'department') {
      // Giữ nguyên (Cả phòng)
    } else if (currentScope) {
      // THIẾT QUÂN LUẬT: Luôn dùng isUserTask để đảm bảo tính đồng nhất khi lọc theo nhân sự
      filtered = filtered.filter(t => isUserTask(t, user));
    }

    // THIẾT QUÂN LUẬT: Loại bỏ trùng lặp nếu có (Cơ chế bảo vệ dữ liệu)
    const uniqueIds = new Set();
    filtered = filtered.filter(t => {
      if (uniqueIds.has(t.id)) return false;
      uniqueIds.add(t.id);
      return true;
    });

    // 2. Lọc theo tháng - THIẾT QUÂN LUẬT: Lọc theo HẠN HOÀN THÀNH (Deadline)
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(t => {
        // Ưu tiên lọc theo Hạn hoàn thành để biết khối lượng công việc mục tiêu của tháng đó
        const date = t.expectedEndDate || t.actualEndDate || t.issueDate;
        return getMonthYear(date) === selectedMonth;
      });
    }

    const completedTasks = filtered.filter(t => t.status === 'COMPLETED');
    const ongoingTasks = filtered.filter(t => t.status === 'IN_PROGRESS' || t.status === 'APPROVED');
    const pendingTasks = filtered.filter(t => t.status === 'PENDING');
    const eff = filtered.length > 0 ? Math.round((completedTasks.length / filtered.length) * 100) : 0;

    // THỐNG KÊ QCD (QUẢN TRỊ CHẤT LƯỢNG)
    let qcdPass = 0;
    let qcdFail = 0;
    let sumQ = 0, sumC = 0, sumD = 0;
    let countQCD = 0;
    let onTimeCount = 0;

    filtered.forEach(t => {
      if (t.leaderQCD) {
        // THIẾT QUÂN LUẬT QCD MỚI: Đạt khi cả 3 chỉ số >= 3
        const isPass = t.leaderQCD.q >= 3 && t.leaderQCD.c >= 3 && t.leaderQCD.d >= 3;
        if (isPass) qcdPass++;
        else qcdFail++;
        
        // CÁCH TÍNH ĐÚNG HẠN MỚI: Dựa vào điểm D (Delivery) >= 3 theo đúng hướng dẫn chấm điểm
        if (t.leaderQCD.d >= 3) {
          onTimeCount++;
        }

        sumQ += t.leaderQCD.q;
        sumC += t.leaderQCD.c;
        sumD += t.leaderQCD.d;
        countQCD++;
      }
    });

    const qcdTotal = qcdPass + qcdFail;
    const qcdPassRate = qcdTotal > 0 ? Math.round((qcdPass / qcdTotal) * 100) : 0;
    const qcdFailRate = qcdTotal > 0 ? 100 - qcdPassRate : 0;
    const onTimeRate = countQCD > 0 ? Math.round((onTimeCount / countQCD) * 100) : 0;

    const avgQ = countQCD > 0 ? parseFloat((sumQ / countQCD).toFixed(1)) : 0;
    const avgC = countQCD > 0 ? parseFloat((sumC / countQCD).toFixed(1)) : 0;
    const avgD = countQCD > 0 ? parseFloat((sumD / countQCD).toFixed(1)) : 0;

    // 3. DỮ LIỆU BIỂU ĐỒ TRẠNG THÁI (STATUS)
    const statusPieData = [
      { name: 'ĐỀ XUẤT', value: pendingTasks.length, color: '#f59e0b' },
      { name: 'ĐANG LÀM', value: ongoingTasks.length, color: '#2563eb' },
      { name: 'HOÀN THÀNH', value: completedTasks.length, color: '#10b981' }
    ].filter(s => s.value > 0);

    // 4. DỮ LIỆU RADAR (SO SÁNH PHÒNG VS CÁ NHÂN)
    // Tính trung bình toàn phòng cho QCD
    const deptQCDTasks = tasks.filter(t => t.leaderQCD && !isTaskDeleted(t) && !t.isCycleRecord);
    const deptSumQ = deptQCDTasks.reduce((acc, t) => acc + (t.leaderQCD?.q || 0), 0);
    const deptSumC = deptQCDTasks.reduce((acc, t) => acc + (t.leaderQCD?.c || 0), 0);
    const deptSumD = deptQCDTasks.reduce((acc, t) => acc + (t.leaderQCD?.d || 0), 0);
    const deptCount = deptQCDTasks.length || 1;

    const radarData = [
      { subject: 'QUALITY', personal: avgQ, department: isAdmin ? deptSumQ / deptCount : avgQ, fullMark: 5 },
      { subject: 'COST', personal: avgC, department: isAdmin ? deptSumC / deptCount : avgC, fullMark: 5 },
      { subject: 'DELIVERY', personal: avgD, department: isAdmin ? deptSumD / deptCount : avgD, fullMark: 5 }
    ];

    // 5. XẾP HẠNG NHÂN SỰ (CHỈ TÍNH NHÂN SỰ CÓ VIỆC & KHÔNG BỊ XÓA)
    const userRankingRaw: Record<string, { name: string, total: number, count: number, taskDetails: any[] }> = {};
    // THIẾT QUÂN LUẬT: Chỉ dùng filtered đã lọc deletedAt và Scope để xếp hạng
    filtered.forEach(t => {
      if (t.assigneeId && t.leaderQCD) {
        if (!userRankingRaw[t.assigneeId]) {
          const u = users.find(user => user.uniqueKey === t.assigneeId || user.id === t.assigneeId);
          userRankingRaw[t.assigneeId] = { name: u?.name || 'Ẩn danh', total: 0, count: 0, taskDetails: [] };
        }
        const taskAvg = (t.leaderQCD.q + t.leaderQCD.c + t.leaderQCD.d) / 3;
        userRankingRaw[t.assigneeId].total += (t.leaderQCD.q + t.leaderQCD.c + t.leaderQCD.d);
        userRankingRaw[t.assigneeId].count++;
        userRankingRaw[t.assigneeId].taskDetails.push({
          code: t.code,
          title: t.title,
          avg: parseFloat(taskAvg.toFixed(2)),
          qcd: `Q:${t.leaderQCD.q} C:${t.leaderQCD.c} D:${t.leaderQCD.d}`
        });
      }
    });

    const rankingData = Object.entries(userRankingRaw || {})
      .map(([id, u]) => ({ 
        id,
        name: u.name, 
        score: parseFloat((u.total / (u.count * 3)).toFixed(1)),
        details: u.taskDetails
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // THỐNG KÊ THEO LOẠI CÔNG VIỆC
    const typeStatsMap: Record<string, number> = {};
    filtered.forEach(t => {
      const catId = t.category || 'other';
      typeStatsMap[catId] = (typeStatsMap[catId] || 0) + 1;
    });

    const typeData = Object.entries(typeStatsMap || {}).map(([id, count]) => {
      const cat = categories.find(c => c.id === id || c.code === id);
      const categoryTasks = filtered.filter(t => {
        const tCatId = t.category || 'other';
        return tCatId === id || (cat && (t.category === cat.id || t.category === cat.code));
      });
      
      let displayName = (id === 'other' || id === 'KHÁC') ? 'KHÁC' : id;
      let shortCode = (id === 'other' || id === 'KHÁC') ? 'KHÁC' : id;
      if (cat) {
        displayName = `[${cat.code}] ${cat.activityName || cat.name}`;
        shortCode = `[${cat.code}]`;
      }
      return {
        name: displayName,
        code: shortCode,
        description: cat?.name || '',
        tasksList: categoryTasks.map(t => ({ 
          title: t.title, 
          code: t.code, 
          status: t.status,
          isPending: t.status === 'PENDING' || t.status === 'PENDING_APPROVAL' || t.waitingApproval
        })),
        value: count,
        color: id === 'other' || id === 'KHÁC' ? '#94a3b8' : getRandomColor(id)
      };
    }).sort((a, b) => b.value - a.value);

    // Apply Top N filter if active
    const finalTypeData = topN > 0 ? typeData.slice(0, topN) : typeData;

    return {
      total: filtered.length,
      completed: completedTasks.length,
      ongoing: ongoingTasks.length,
      efficiency: eff,
      list: filtered,
      typeData: finalTypeData,
      statusData: statusPieData,
      radarData,
      rankingData,
      metrics: {
        avgQ, avgC, avgD, onTimeRate
      },
      qcd: {
        pass: qcdPass,
        fail: qcdFail,
        total: qcdTotal,
        passRate: qcdPassRate,
        failRate: qcdFailRate
      }
    };
  };

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, fill, code, percent } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    // Tính toán vị trí cho phần trăm bên trong miếng bánh
    const radiusInner = outerRadius * 0.6;
    const xInner = cx + radiusInner * cos;
    const yInner = cy + radiusInner * sin;

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 8} 
          y={ey} 
          textAnchor={textAnchor} 
          fill="#475569" 
          dominantBaseline="central"
          className="text-[12px] font-black notranslate"
          translate="no"
        >
          {code}
        </text>
        {percent > 0.04 && (
          <text
            x={xInner}
            y={yInner}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[12px] font-black pointer-events-none drop-shadow-md"
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        )}
      </g>
    );
  };

  const getRandomColor = (id: string) => {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const stats = getFilteredData();

  // Auto-detect and run print if the URL has ?print=true
  useEffect(() => {
    if (urlParams?.get('print') === 'true') {
      const checkAndPrint = () => {
        const hasData = isClient && stats && stats.typeData && stats.typeData.length > 0;
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
  }, [urlParams, isClient, stats]);

  // Tạo danh sách tháng từ dữ liệu
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    tasks.filter(t => !isTaskDeleted(t) && !t.isCycleRecord).forEach(t => {
      // Nhất quán với logic lọc: Sử dụng Hạn hoàn thành (Deadline) và Ngày tạo
      const d1 = getMonthYear(t.issueDate);
      const d2 = getMonthYear(t.expectedEndDate);
      if (d1) months.add(d1);
      if (d2) months.add(d2);
    });
    return Array.from(months).sort((a, b) => {
      const [m1, y1] = a.split('/').map(Number);
      const [m2, y2] = b.split('/').map(Number);
      return (y2 + 2000) * 12 + m2 - ((y1 + 2000) * 12 + m1);
    });
  }, [tasks]);

  const getAdvice = async () => {
    setLoadingAdvice(true);
    const feedback = await getPerformanceAdvice(user, stats.list, currentUser);
    setAdvice(feedback);
    setLoadingAdvice(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // THIẾT QUÂN LUẬT: Tạo ID định danh thép theo công thức mới
    let profileKey = generateUniqueKey(formData.name, formData.phone);
    
    // ĐẶC LỆNH ADMIN: Lê Nhật Trường luôn dùng ID cố định
    if (user.name === 'Lê Nhật Trường' || user.uniqueKey === 'LeNhatTruong0907767304') {
      profileKey = 'LeNhatTruong0907767304';
    }
    
    if (!profileKey) {
      alert("Không tìm thấy định danh người dùng. Không thể lưu.");
      setSaving(false);
      return;
    }

    try {
      console.log('🚀 [Source of Truth] Bắt đầu lưu profile với ID:', profileKey);
      setSaving(true);

      // 1. Prepare Firestore Updates
      const currentPassword = passwordData.newPassword.trim() || user.password || '';
      const updates: Partial<User> = {
        name: formData.name,
        phone: formData.phone,
        companyEmail: formData.companyEmail,
        personalEmail: formData.personalEmail,
        title: formData.title,
        avatar: formData.avatar,
        password: currentPassword,
        uniqueKey: profileKey, // Đảm bảo ghi lại key
        layoutConfig: layoutConfig, // LƯU BỐ CỤC TÙY CHỈNH
        updatedAt: new Date().toISOString()
      };

      console.log(`📦 [Source of Truth] Pushing data to Firestore...`);
      await onUpdateProfile(profileKey, updates);
      
      // 2. If password is changed, update Auth as well (only works for current user)
      if (passwordData.newPassword.trim()) {
        try {
          await updateAuthPassword(passwordData.newPassword.trim());
          console.log('✅ [ProfilePage] Auth password updated successfully!');
        } catch (authErr: any) {
          console.warn('⚠️ [ProfilePage] Could not update Auth password (possibly needs recent login):', authErr);
          // Don't fail the whole operation, but alert the user if possible
        }
      }

      console.log('✅ [ProfilePage] Lưu Firestore thành công!');
      alert("Đã cập nhật thông tin thành công!");
      setToast("Đã lưu thay đổi!");
      setIsEditing(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setToast(null), 3000);
      
    } catch (error: any) {
      console.error("Lỗi khi lưu Profile:", error);
      alert("Lỗi cập nhật: " + (error.message || "Không xác định"));
    } finally {
      setSaving(false);
    }
  };

  const getRoleBgColor = (user: User) => {
    const normName = user.name.trim();
    const title = getDisplayNameTitle(user);
    if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên' || title === 'ADMIN') return 'bg-[#eff6ff]';
    if (title.includes('TRƯỞNG') || user.role === 'Leader') return 'bg-[#fff7ed]';
    return 'bg-[#f0fdf4]';
  };

  return (
    <div className={`min-h-screen -m-6 p-6 bg-white transition-colors duration-500`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 ${layoutOrient === 'landscape' ? 'landscape' : 'portrait'} !important;
            margin: 0.4cm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, html, #root, #root > div, main, main > div, .min-h-screen, [key="profile"], div[key="profile"] {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
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
          /* Hide non-printable elements cleanly */
          .print\\:hidden, 
          button, 
          header:not(.print-header), 
          .no-print,
          .fixed,
          nav,
          aside {
            display: none !important;
          }
          /* Preserve pristine 12-column layout grid for printing to keep cards side-by-side */
          .profile-layout-grid {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .profile-layout-grid > div {
            min-height: auto !important;
            height: auto !important;
            border-radius: 12px !important;
            margin-bottom: 2px !important;
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          /* Allow AI Card to layout naturally, avoiding breaking inside the card */
          #card-AI {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          .profile-layout-grid > div:not(.p-0) {
            padding: 10px 12px !important;
          }
          .profile-header-card {
            padding: 10px 16px !important;
            border-radius: 16px !important;
            margin-bottom: 6px !important;
          }
          .space-y-6 > * + * {
            margin-top: 8px !important;
          }
          .space-y-4 > * + * {
            margin-top: 4px !important;
          }
          /* Force stats grid to 4-column row and make extremely compact to fit Page 1 */
          .profile-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          /* Replace ink-heavy dark boxes with gorgeous executive cards on white paper */
          .profile-stats-grid > div {
            background: #f8fafc !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            border-bottom: 4px solid currentColor !important;
            box-shadow: none !important;
            text-shadow: none !important;
            min-height: 52px !important;
            padding: 4px 12px !important;
            border-radius: 12px !important;
          }
          .profile-stats-grid > div p,
          .profile-stats-grid > div span {
            color: #475569 !important;
            font-size: 8px !important;
            margin-bottom: 1px !important;
          }
          .profile-stats-grid > div p.text-2xl {
            color: #0f172a !important;
            font-size: 16px !important;
            line-height: none !important;
          }
          .profile-stats-grid > div div.text-[10px] {
            font-size: 8px !important;
          }
          .profile-stats-grid > div div.p-1.5 {
            padding: 4px !important;
          }
          .profile-info-grid {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          /* Ensure SVGs like Recharts scale dynamically inside their containers */
          .recharts-wrapper, svg {
            max-width: 100% !important;
            overflow: visible !important;
          }
          /* Specific page-break protection for key blocks, avoiding generic styles like .bg-white or .rounded-2xl */
          .profile-header-card,
          .profile-stats-grid > div,
          .profile-layout-grid > div,
          #card-TYPE_STATS,
          .recharts-wrapper, 
          .print-avoid-break {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          /* Cho phép danh sách cuộn kéo dài tự nhiên không giới hạn chiều cao khi in, ngăn sụp đổ flex-basis */
          div.custom-scrollbar.overflow-y-auto {
            flex: none !important;
            display: block !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Thu hẹp tối đa các dòng phân loại công việc trong card TYPE_STATS chỉ hiển thị đúng 1 dòng */
          #card-TYPE_STATS .bg-slate-50 {
            padding: 3px 6px !important;
            min-height: auto !important;
            height: auto !important;
            margin-bottom: 2px !important;
            border-radius: 8px !important;
          }
          #card-TYPE_STATS .bg-slate-50 span {
            font-size: 9.5px !important;
          }
          #card-TYPE_STATS .bg-slate-50 .text-\[14px\] {
            font-size: 11px !important;
          }
          #card-TYPE_STATS .bg-slate-50 .text-\[9px\] {
            font-size: 8px !important;
          }
          #card-TYPE_STATS .custom-scrollbar-slim {
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            overflow: hidden !important;
          }
          /* Bảo vệ các ô thông tin cá nhân khoanh tròn không bị tràn chữ khi in zoom */
          .profile-info-grid .bg-white {
            padding: 8px 12px !important;
          }
          .profile-info-grid .bg-white p, 
          .profile-info-grid .bg-white span,
          .profile-info-grid .bg-white select,
          .profile-info-grid .bg-white input {
            font-size: 11px !important;
          }
          .profile-info-grid .bg-white span.uppercase {
            font-size: 8px !important;
          }
          .profile-info-grid .bg-white .break-all {
            font-size: 10.5px !important;
            word-break: break-all !important;
            white-space: normal !important;
          }
        }
      `}} />
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 border border-slate-700"
            >
              <CheckCircle size={18} className="text-emerald-500" strokeWidth={3} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* HỒ SƠ ĐẸP CHO BẢN IN - TRANG CÁ NHÂN */}
          <div className="hidden print:block border-b-2 border-slate-300 pb-2 mb-2">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">
                  HỒ SƠ NĂNG LỰC & HIỆU SUẤT CÁ NHÂN
                </h1>
                <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">
                  MÔ HÌNH QUẢN TRỊ KPI ĐA CHIỀU PHÒNG QLCL TÂN PHÚ VIỆT NAM
                </p>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider leading-none">THÁNG KHẢO SÁT</span>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md mt-0.5 inline-block">
                  {selectedMonth === 'all' ? 'Toàn bộ' : `Tháng ${selectedMonth}`}
                </span>
              </div>
            </div>
            
            <div className="mt-2 flex flex-row gap-8 justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 shrink-0 bg-white">
                  <Avatar src={user.avatar} name={user.name} size="full" className="border-none bg-transparent shadow-none" />
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[7px] block leading-none mb-0.5">Nhân sự đánh giá</span>
                  <span className="font-black text-slate-800 uppercase text-xs leading-none notranslate" translate="no">
                    {user.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[7px] block mb-0.5">Mã nhân sự</span>
                  <span className="font-bold text-slate-700 font-mono tracking-wider">#{user.code}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[7px] block mb-0.5">Chức vụ</span>
                  <span className="font-bold text-slate-700 uppercase text-[10px]">{getUserRoleTitle(user)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[7px] block mb-0.5">Bộ phận</span>
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Phòng QLCL</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${getRoleBgColor(user)} rounded-[32px] shadow-xl relative flex flex-col px-12 py-6 overflow-hidden border-4 border-slate-100 w-full profile-header-card print:hidden`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h1 className="text-[28px] font-black text-slate-900 tracking-tight uppercase leading-none">
                  {!isEditing ? (
                    <span translate="no" className="notranslate">{user.name}</span>
                  ) : (
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-1 outline-none text-[24px] font-black text-blue-800"
                      placeholder="Họ và tên"
                    />
                  )}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-blue-100 rounded-lg border border-blue-200 text-[11px] font-black text-blue-700 uppercase tracking-widest shadow-sm">
                    <span translate="no" className="notranslate">{getDisplayNameTitle(user)}</span>
                  </div>
                  <span className="text-[15px] font-sans font-bold text-slate-400 tracking-widest uppercase">#{user.code}</span>
                </div>
              </div>

              {!isEditing && canEdit && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="h-10 px-6 rounded-xl bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 border border-slate-200"
                  >
                    <Edit3 size={16} strokeWidth={2.5} />
                    <span translate="no" className="notranslate">CHỈNH SỬA</span>
                  </button>
                </div>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} strokeWidth={2.5} />
                    )}
                    <span translate="no" className="notranslate">{saving ? 'ĐANG LƯU' : 'LƯU'}</span>
                  </button>
                  <button onClick={() => setIsEditing(false)} className="h-10 px-6 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors">
                    <span translate="no" className="notranslate">HỦY</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-8 items-stretch">
              <div className="w-32 shrink-0 group/avatar relative">
                <div className="relative aspect-square w-full rounded-full overflow-hidden border-2 border-white shadow-lg bg-slate-50">
                  <Avatar 
                    src={formData.avatar} 
                    name={formData.name} 
                    size="full" 
                    className="border-none bg-transparent shadow-none" 
                  />
                  
                  <label className={`absolute inset-0 flex flex-col items-center justify-center transition-all cursor-pointer ${isEditing ? 'bg-blue-600/40 backdrop-blur-sm opacity-100' : 'bg-black/20 opacity-0 group-hover/avatar:opacity-100'}`}>
                    <Camera size={28} className="text-white mb-1 drop-shadow-md" strokeWidth={2.5} />
                    {isEditing && (
                      <span translate="no" className="notranslate text-[7px] font-black text-white uppercase tracking-widest text-center px-2 leading-tight">
                        KÉO THẢ<br/>ẢNH VÀO ĐÂY
                      </span>
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX_SIZE = 400;
                              let width = img.width;
                              let height = img.height;
                              if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                              else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                              canvas.width = width; canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              ctx?.drawImage(img, 0, 0, width, height);
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                              
                              // GIỚI HẠN CỨNG: Chuỗi Base64 dài quá mức sẽ làm treo Firestore
                              if (dataUrl.length > 800 * 1024) {
                                alert("Ảnh đại diện quá lớn ngay cả khi nén. Vui lòng chọn ảnh khác.");
                                return;
                              }
                              
                              setFormData(prev => ({ ...prev, avatar: dataUrl }));
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-12 gap-4 profile-info-grid">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-2">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Shield size={12} className="text-slate-400" />
                      <span translate="no" className="notranslate text-[10px] font-black text-slate-400 uppercase tracking-widest">CHỨC DANH <span className="text-red-500">*</span></span>
                    </div>
                    {!isEditing ? (
                      <div className="h-5 flex items-center">
                        <p translate="no" className={`notranslate font-sans font-bold tracking-tight leading-none text-slate-900 text-[13px] uppercase break-words`}>
                          {user.title || 'CHƯA XÁC ĐỊNH'}
                        </p>
                      </div>
                    ) : (
                      <select 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full text-xs font-black text-blue-600 outline-none bg-blue-50/30 rounded-lg px-2 py-1"
                      >
                        <option value="Nhân viên">Nhân viên</option>
                        <option value="Trưởng nhóm">Trưởng nhóm</option>
                        <option value="Trưởng phòng">Trưởng phòng</option>
                        <option value="Quản trị viên">Quản trị viên</option>
                        <option value="Chuyên viên QC">Chuyên viên QC</option>
                      </select>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-2">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Phone size={12} className="text-slate-400" />
                      <span translate="no" className="notranslate text-[10px] font-black text-slate-400 uppercase tracking-widest">SỐ ĐIỆN THOẠI <span className="text-red-500">*</span></span>
                    </div>
                    {!isEditing ? (
                      <div className="h-5 flex items-center">
                        <p translate="no" className={`notranslate font-sans font-bold tracking-tight leading-none ${user.phone === 'CHỜ CẬP NHẬT' ? 'text-gray-400 text-[10px] tracking-normal' : 'text-slate-900 text-[13px] break-all'}`}>
                          <span translate="no" className="notranslate">{user.phone}</span>
                        </p>
                      </div>
                    ) : (
                      <input 
                        type="text" value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full text-[16px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded-lg px-2 py-0.5"
                      />
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-5">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Mail size={12} className="text-slate-400" />
                      <span translate="no" className="notranslate text-[10px] font-black text-slate-400 uppercase tracking-widest">EMAIL CÔNG TY <span className="text-red-500">*</span></span>
                    </div>
                    {!isEditing ? (
                      <div translate="no" className="notranslate space-y-1 text-slate-900 w-full">
                        <div className="flex items-start gap-2 text-[13px] font-bold min-w-0 leading-tight">
                          <span className="text-[9px] font-black text-slate-400 w-16 shrink-0 tracking-tighter uppercase pt-0.5">CÔNG TY:</span>
                          <span className="lowercase break-all min-w-0 flex-1 leading-normal select-all">{user.companyEmail || 'CHỜ CẬP NHẬT'}</span>
                        </div>
                        <div className={`flex items-start gap-2 text-[13px] font-bold min-w-0 leading-tight ${user.personalEmail === 'CHỜ CẬP NHẬT' ? 'text-gray-400' : 'text-[#1e3a8a]'}`}>
                          <span className="text-[9px] font-black text-slate-400 w-16 shrink-0 tracking-tighter uppercase pt-0.5">CÁ NHÂN:</span>
                          <span className="lowercase break-all min-w-0 flex-1 leading-normal select-all">{user.personalEmail || 'CHỜ CẬP NHẬT'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-slate-400 w-10 shrink-0 uppercase">Công ty:</span>
                          <input 
                            type="email" value={formData.companyEmail}
                            onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                            className="flex-1 text-[13px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-1 py-0.5 lowercase"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-slate-400 w-10 shrink-0 uppercase">Cá nhân:</span>
                          <input 
                            type="email" value={formData.personalEmail}
                            onChange={e => setFormData({...formData, personalEmail: e.target.value})}
                            className="flex-1 text-[13px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-1 py-0.5 lowercase"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-3">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Lock size={12} className="text-blue-500" />
                      <span translate="no" className="notranslate text-[10px] font-black text-slate-400 uppercase tracking-widest">{!isEditing ? 'MẬT KHẨU' : 'CẬP NHẬT MẬT KHẨU'} <span className="text-red-500">*</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      {!isEditing ? (
                        <div className="flex items-center justify-between w-full h-8">
                          <p translate="no" className={`notranslate font-mono font-black leading-none break-all ${user.password === 'CHỜ CẬP NHẬT' ? 'text-gray-400 text-[10px] tracking-normal' : 'text-slate-900 text-[13px] tracking-[0.05em] sm:tracking-[0.1em]'}`}>
                            {showPassword ? (user.password || 'CHỜ CẬP NHẬT') : '••••••••••••'}
                          </p>
                          <button onClick={() => setShowPassword(!showPassword)} className="text-slate-300 hover:text-slate-600 transition-colors">
                            {showPassword ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 w-full">
                           <input 
                             type="password" placeholder="Mật khẩu mới" value={passwordData.newPassword}
                             onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                             className="w-full text-[12px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-2 py-0.5 placeholder:notranslate"
                             translate="no"
                           />
                           <input 
                             type="password" placeholder="Xác nhận" value={passwordData.confirmPassword}
                             onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                             className="w-full text-[12px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-2 py-0.5 placeholder:notranslate"
                             translate="no"
                           />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BỘ LỌC THỐNG KÊ LINH HOẠT - THIẾT QUÂN LUẬT */}
          <div className="bg-slate-50/50 p-2 rounded-[24px] border border-slate-100 flex items-center gap-4 shadow-inner print:hidden">
            {isAdmin && (
              <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm shrink-0">
                <button 
                  onClick={() => setFilterScope('mine')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterScope === 'mine' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  <Target size={12} /> CÁ NHÂN
                </button>
                <button 
                  onClick={() => setFilterScope('department')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterScope === 'department' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  <Users size={12} /> CẢ PHÒNG
                </button>
                <div className="relative group ml-2">
                  <select 
                    value={(filterScope || '').length > 15 ? filterScope : ''} 
                    onChange={(e) => setFilterScope(e.target.value)}
                    className="appearance-none bg-slate-100 border-none rounded-lg px-4 pr-10 py-1.5 text-[10px] font-black text-slate-700 uppercase outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                  >
                    <option value="">CHỌN NHÂN SỰ</option>
                    {users.filter(u => u.id !== user?.id).map(u => (
                      <option key={u.uniqueKey} value={u.uniqueKey}>{(u.name || '').toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex-1"></div>

            <button
              onClick={handlePrintClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 rounded-xl text-[10px] font-black tracking-wider shadow-sm hover:shadow active:scale-95 transition-all uppercase flex-shrink-0 print:hidden"
              title="In/Xuất trang cá nhân ra PDF"
            >
              <Printer size={12} strokeWidth={3} />
              <span translate="no" className="notranslate">In PDF</span>
            </button>

            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-2 shadow-sm shrink-0">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">THÁNG LỌC:</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none outline-none text-[12px] font-bold text-slate-900 cursor-pointer"
              >
                <option value="all">TẤT CẢ</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 px-0 profile-stats-grid">
             <StatCard icon={<FileText size={14} strokeWidth={3} />} label="Tổng dự án" value={stats.total} color="bg-amber-500" borderColor="border-amber-600" />
             <StatCard icon={<CheckCircle2 size={14} strokeWidth={3} />} label="Hiệu suất" value={`${stats.efficiency}%`} color="bg-emerald-500" borderColor="border-emerald-600" />
             <StatCard icon={<Clock size={14} strokeWidth={3} />} label="Đang xử lý" value={stats.ongoing} color="bg-red-500" borderColor="border-red-600" />
             <StatCard icon={<CheckCircle size={14} strokeWidth={3} />} label="Hoàn thành" value={stats.completed} color="bg-blue-600" borderColor="border-blue-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 profile-layout-grid">
          {layoutConfig.sort((a,b) => (a.order || 0) - (b.order || 0)).map((item, index) => {
            const isPersonalView = filterScope !== 'department';
            const contextLabel = isPersonalView ? 'CÁ NHÂN' : 'HỆ THỐNG';
            const activeProfileKey = filterScope === 'mine' ? currentUser?.uniqueKey : filterScope;

            const hasRanking = layoutConfig.some(x => x.id === 'RANKING_CHART');
            const calculatedSpan = isPrintMode
              ? ((item.id === 'STATUS_CHART' || item.id === 'RADAR_CHART') 
                  ? (hasRanking ? 4 : 6) 
                  : (item.span || 4))
              : (item.span || 4);

            if (item.id === 'TYPE_STATS') {
              return (
                <div id="card-TYPE_STATS" key={item.id} style={{ gridColumn: `span ${calculatedSpan} / span ${calculatedSpan}`, minHeight: isPrintMode ? '340px' : `${item.height || 350}px` }} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <div className="flex items-center justify-between px-2 pt-2">
                    <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-[0.1em]">
                      <BarChart3 size={16} className="text-blue-600" />
                      LOẠI CÔNG VIỆC
                    </h3>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase leading-none">TOP:</span>
                      <select 
                        value={topN}
                        onChange={(e) => setTopN(Number(e.target.value))}
                        className="bg-transparent border-none outline-none text-[9px] font-black text-blue-600 cursor-pointer"
                      >
                        <option value={0}>TẤT CẢ</option>
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar" style={{ maxHeight: `${(item.height || 350) - 100}px` }}>
                    {stats.typeData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 opacity-30">
                        <PieChartIcon size={40} />
                        <p className="text-[10px] font-bold mt-2">CHƯA CÓ DỮ LIỆU</p>
                      </div>
                    ) : (
                      stats.typeData.map((type, idx) => (
                        <div key={idx} className="flex flex-col p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group shadow-sm overflow-hidden min-h-[52px] justify-center">
                          <div className="flex items-start justify-between w-full gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: type.color }}></div>
                              <span translate="no" className="notranslate text-[11px] font-bold text-slate-700 uppercase whitespace-normal break-words leading-tight">{type.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <span className="text-[14px] font-black text-slate-900">{type.value}</span>
                              <span className="text-[9px] font-bold text-slate-400">({Math.round((type.value / stats.total) * 100)}%)</span>
                            </div>
                          </div>
                          {type.tasksList && type.tasksList.length > 0 && (
                            <div className="max-h-0 opacity-0 group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 overflow-y-auto custom-scrollbar-slim">
                              <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
                                {type.tasksList.slice(0, 15).map((t: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 bg-white/50 p-1.5 rounded-xl border border-slate-100/50 shadow-sm">
                                    <div className="flex flex-col items-center shrink-0 min-w-[36px]">
                                      <span className="text-[8px] text-blue-600 font-black leading-none">{t.code}</span>
                                      <span className={`text-[6px] font-black uppercase mt-1 px-1 py-0.5 rounded-md ${
                                        t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 
                                        t.isPending ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                      }`}>
                                        {t.status === 'COMPLETED' ? 'DONE' : t.isPending ? 'WAIT' : 'DOING'}
                                      </span>
                                    </div>
                                    <p translate="no" className="notranslate text-[9px] font-bold text-slate-600 leading-tight py-0.5">
                                      {t.title}
                                    </p>
                                  </div>
                                ))}
                                {type.tasksList.length > 15 && (
                                  <p className="text-[9px] text-blue-500 font-black italic px-2 pt-1 uppercase tracking-tighter">...và {type.tasksList.length - 15} công việc khác</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            }

            if (item.id === 'CHART') {
              return (
                <div id="card-CHART" key={item.id} style={{ gridColumn: `span ${calculatedSpan} / span ${calculatedSpan}`, minHeight: isPrintMode ? '340px' : `${item.height || 350}px` }} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-[0.1em] px-2 pt-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    CƠ CẤU CÔNG VIỆC
                  </h3>
                  <div className="flex-1 w-full" style={{ width: '100%', height: isPrintMode ? '250px' : '350px', minHeight: isPrintMode ? '250px' : '350px', position: 'relative' }}>
                    {isClient && stats.typeData.length > 0 ? (
                      isPrintMode ? (
                        <div className="flex justify-center items-center h-full w-full" style={{ width: '100%', height: '250px', margin: '0 auto' }}>
                          <PieChart width={350} height={250}>
                            <Pie
                              data={stats.typeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                              label={renderCustomizedLabel}
                              labelLine={false}
                              isAnimationActive={false}
                            >
                              {stats.typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                          </PieChart>
                        </div>
                      ) : (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={50} id="chart-type" key={isClient ? 'ready' : 'loading'}>
                          <PieChart>
                            <Pie
                              data={stats.typeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={0}
                              outerRadius={Math.min((item.height || 450) / 2.8, 160)}
                              paddingAngle={2}
                              dataKey="value"
                              label={renderCustomizedLabel}
                              labelLine={false}
                              isAnimationActive={false}
                            >
                              {stats.typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <div className="w-32 h-32 rounded-full border-8 border-dashed border-slate-300"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (item.id === 'STATUS_CHART') {
              return (
                <div id="card-STATUS_CHART" key={item.id} style={{ gridColumn: `span ${calculatedSpan} / span ${calculatedSpan}`, minHeight: isPrintMode ? '250px' : `${item.height || 350}px` }} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-[0.1em] px-2 pt-2">
                    <PieChartIcon size={16} className="text-amber-500" />
                    TRẠNG THÁI {contextLabel}
                    <span className="text-[8px] text-slate-400 font-bold ml-auto">(DỮ LIỆU LÃNH ĐẠO)</span>
                  </h3>
                  <div className="flex-1 w-full" style={{ width: '100%', height: isPrintMode ? '190px' : '250px', minHeight: isPrintMode ? '190px' : '250px', position: 'relative' }}>
                    {isClient && stats.statusData.length > 0 ? (
                      isPrintMode ? (
                        <div className="flex justify-center items-center h-full w-full" style={{ width: '100%', height: '190px', margin: '0 auto' }}>
                          <PieChart width={240} height={190}>
                            <Pie
                              data={stats.statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={55}
                              paddingAngle={5}
                              dataKey="value"
                              labelLine={false}
                              isAnimationActive={false}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text 
                                    x={x} 
                                    y={y} 
                                    fill="white" 
                                    textAnchor="middle" 
                                    dominantBaseline="central"
                                    className="text-[11px] font-black notranslate pointer-events-none drop-shadow-md" 
                                    translate="no"
                                  >
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                            >
                              {stats.statusData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend 
                              verticalAlign="bottom" 
                              height={20} 
                              formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{value}</span>}
                            />
                          </PieChart>
                        </div>
                      ) : (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={50} id="chart-status" key={isClient ? 'ready' : 'loading'}>
                          <PieChart>
                            <Pie
                              data={stats.statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={Math.min((item.height || 450) / 5, 80)}
                              outerRadius={Math.min((item.height || 450) / 2.8, 160)}
                              paddingAngle={5}
                              dataKey="value"
                              labelLine={false}
                              isAnimationActive={false}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text 
                                    x={x} 
                                    y={y} 
                                    fill="white" 
                                    textAnchor="middle" 
                                    dominantBaseline="central"
                                    className="text-[11px] font-black notranslate pointer-events-none drop-shadow-md" 
                                    translate="no"
                                  >
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                            >
                              {stats.statusData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend 
                              verticalAlign="bottom" 
                              height={25} 
                              formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                         <p className="text-[10px] font-black">CHƯA CÓ DỮ LIỆU</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (item.id === 'RADAR_CHART') {
              return (
                <div id="card-RADAR_CHART" key={item.id} style={{ gridColumn: `span ${calculatedSpan} / span ${calculatedSpan}`, minHeight: isPrintMode ? '250px' : `${item.height || 350}px` }} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-[0.1em] px-2 pt-2">
                    <Target size={16} className="text-purple-600" />
                    NĂNG LỰC QCD
                    <span className="text-[8px] text-slate-400 font-bold ml-auto">(TỪ LÃNH ĐẠO)</span>
                  </h3>
                  <div className="flex-1 w-full" style={{ width: '100%', height: isPrintMode ? '190px' : '250px', minHeight: isPrintMode ? '190px' : '250px', position: 'relative' }}>
                    {isClient && (
                      isPrintMode ? (
                        <div className="flex justify-center items-center h-full w-full" style={{ width: '100%', height: '190px', margin: '0 auto' }}>
                          <RadarChart cx="50%" cy="50%" outerRadius="55%" data={stats.radarData} width={240} height={190}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'black', fill: '#64748b' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 8 }} />
                            <Radar name="Phòng" dataKey="department" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.5} isAnimationActive={false} />
                            <Radar name="Cá nhân" dataKey="personal" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} isAnimationActive={false} />
                            <Tooltip />
                            <Legend 
                              verticalAlign="bottom" 
                              height={20} 
                              formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{value}</span>}
                            />
                          </RadarChart>
                        </div>
                      ) : (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={50} id="chart-qcd" key={isClient ? 'ready' : 'loading'}>
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'black', fill: '#64748b' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                            <Radar name="Phòng" dataKey="department" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.5} isAnimationActive={false} />
                            <Radar name="Cá nhân" dataKey="personal" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} isAnimationActive={false} />
                            <Tooltip />
                            <Legend 
                              verticalAlign="bottom" 
                              height={25} 
                              formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{value}</span>}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      )
                    )}
                  </div>
                </div>
              );
            }

            if (item.id === 'RANKING_CHART') {
              return (
                <div id="card-RANKING_CHART" key={item.id} style={{ gridColumn: `span ${calculatedSpan} / span ${calculatedSpan}`, minHeight: isPrintMode ? '250px' : `${item.height || 350}px` }} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-[0.1em] px-2 pt-2">
                    <BarChart3 size={16} className="text-blue-600" />
                    XẾP HẠNG PHÒNG
                    <span className="text-[8px] text-blue-400 font-bold ml-auto">(ĐIỂM LÃNH ĐẠO CHẤM)</span>
                  </h3>
                  <div className="flex-1 w-full" style={{ width: '100%', height: isPrintMode ? '190px' : '250px', minHeight: isPrintMode ? '190px' : '250px', position: 'relative' }}>
                    {isClient && (
                      isPrintMode ? (
                        <div className="flex justify-center items-center h-full w-full" style={{ width: '100%', height: '190px', margin: '0 auto' }}>
                          <BarChart data={stats.rankingData} layout="vertical" margin={{ left: 5, right: 35, top: 10, bottom: 0 }} width={240} height={190}>
                            <XAxis type="number" hide domain={[0, 5]} />
                            <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                            <Tooltip 
                               contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '16px' }}
                               cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                               content={({ active, payload }) => {
                                 if (active && payload && payload.length && payload[0].payload) {
                                   const data = payload[0].payload;
                                   return (
                                     <div className="bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-2xl border border-slate-100 flex flex-col gap-3 min-w-[220px]">
                                       <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                         <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{data.name || 'ẨN DANH'}</span>
                                         <span className="text-sm font-black text-blue-600">{data.score || 0}</span>
                                       </div>
                                       <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar-slim pr-1">
                                         {data.details && Array.isArray(data.details) && data.details.map((d: any, idx: number) => (
                                           <div key={idx} className="flex flex-col gap-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                             <div className="flex items-center justify-between">
                                               <span className="text-[9px] font-black text-blue-600">{d.code || 'N/A'}</span>
                                               <span className="text-[9px] font-black text-slate-400">TB: {d.avg || 0}</span>
                                             </div>
                                             <p translate="no" className="notranslate text-[9px] font-bold text-slate-600 leading-tight border-l-2 border-blue-200 pl-2">
                                               {d.title || 'Không có tiêu đề'}
                                             </p>
                                             <span translate="no" className="notranslate text-[8px] font-black text-slate-500 uppercase tracking-tighter bg-white/50 self-start px-1.5 py-0.5 rounded border border-slate-100">
                                               {d.qcd || 'Q:0 C:0 D:0'}
                                             </span>
                                           </div>
                                         ))}
                                       </div>
                                       <div className="pt-1 text-center">
                                         <span className="text-[8px] text-slate-400 font-bold uppercase">TỔNG: {Array.isArray(data.details) ? data.details.length : 0} CÔNG VIỆC</span>
                                       </div>
                                     </div>
                                   );
                                 }
                                 return null;
                               }}
                            />
                            <Bar 
                              dataKey="score" 
                              radius={[0, 10, 10, 0]} 
                              label={{ position: 'right', fontSize: 10, fontWeight: 'black', fill: '#64748b' }}
                              isAnimationActive={false}
                            >
                              {stats.rankingData.map((entry: any, index: number) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.id === activeProfileKey ? '#f59e0b' : '#2563eb'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </div>
                      ) : (
                        <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={50} id="chart-ranking" key={isClient ? 'ready' : 'loading'}>
                          <BarChart data={stats.rankingData} layout="vertical" margin={{ left: 0, right: 35, top: 10, bottom: 0 }}>
                          <XAxis type="number" hide domain={[0, 5]} />
                          <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                          <Tooltip 
                             contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '16px' }}
                             cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                             content={({ active, payload }) => {
                               if (active && payload && payload.length && payload[0].payload) {
                                 const data = payload[0].payload;
                                 return (
                                   <div className="bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-2xl border border-slate-100 flex flex-col gap-3 min-w-[220px]">
                                     <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                       <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{data.name || 'ẨN DANH'}</span>
                                       <span className="text-sm font-black text-blue-600">{data.score || 0}</span>
                                     </div>
                                     <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar-slim pr-1">
                                       {data.details && Array.isArray(data.details) && data.details.map((d: any, idx: number) => (
                                         <div key={idx} className="flex flex-col gap-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                           <div className="flex items-center justify-between">
                                             <span className="text-[9px] font-black text-blue-600">{d.code || 'N/A'}</span>
                                             <span className="text-[9px] font-black text-slate-400">TB: {d.avg || 0}</span>
                                           </div>
                                           <p translate="no" className="notranslate text-[9px] font-bold text-slate-600 leading-tight border-l-2 border-blue-200 pl-2">
                                             {d.title || 'Không có tiêu đề'}
                                           </p>
                                           <span translate="no" className="notranslate text-[8px] font-black text-slate-500 uppercase tracking-tighter bg-white/50 self-start px-1.5 py-0.5 rounded border border-slate-100">
                                             {d.qcd || 'Q:0 C:0 D:0'}
                                           </span>
                                         </div>
                                       ))}
                                     </div>
                                     <div className="pt-1 text-center">
                                       <span className="text-[8px] text-slate-400 font-bold uppercase">TỔNG: {Array.isArray(data.details) ? data.details.length : 0} CÔNG VIỆC</span>
                                     </div>
                                   </div>
                                 );
                               }
                               return null;
                             }}
                          />
                          <Bar 
                            dataKey="score" 
                            radius={[0, 10, 10, 0]} 
                            label={{ position: 'right', fontSize: 10, fontWeight: 'black', fill: '#64748b' }}
                            isAnimationActive={false}
                          >
                            {stats.rankingData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.id === activeProfileKey ? '#f59e0b' : '#2563eb'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      )
                    )}
                  </div>
                </div>
              );
            }

            if (item.id === 'AI') {
              return (
                <div id="card-AI" key={item.id} style={{ gridColumn: 'span 12 / span 12', minHeight: 'auto' }} className="bg-white p-0 rounded-[28px] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                  
                  <div className="flex flex-col w-full h-full">
                    {/* Header với Icon - Cực kỳ gọn gàng */}
                     <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-md z-10 sticky top-0 border-b border-slate-50">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-md relative shrink-0">
                           <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping opacity-20"></div>
                           <JobAvatar size={18} animate />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                           <h3 translate="no" className="notranslate text-[12px] font-black text-slate-800 uppercase tracking-[0.2em] whitespace-nowrap">
                             KẾT QUẢ AI PHÂN TÍCH
                           </h3>
                           <div className="h-0.5 w-6 bg-blue-600/20 rounded-full"></div>
                        </div>

                        {/* Button Hướng dẫn QCD */}
                        <div className="flex-1 flex justify-end px-2 print:hidden">
                           <button 
                             onClick={() => setShowScoringGuide(!showScoringGuide)}
                             className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-2 group shrink-0 shadow-sm"
                           >
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                                <HelpCircle size={12} className="text-white" />
                              </div>
                              <span translate="no" className="notranslate text-[10px] font-black text-blue-700 uppercase tracking-widest hidden sm:inline">
                                HƯỚNG DẪN CHẤM ĐIỂM QCD (NHẤN ĐỂ XEM)
                              </span>
                              <span translate="no" className="notranslate text-[10px] font-black text-blue-700 uppercase tracking-widest sm:hidden">
                                HƯỚNG DẪN QCD
                              </span>
                              <ChevronDown size={14} className={`text-blue-600 transition-transform duration-300 ${showScoringGuide ? 'rotate-180' : ''}`} />
                           </button>
                        </div>
                     </div>

                     {/* Bảng Hướng dẫn Collapsible */}
                     <AnimatePresence>
                       {showScoringGuide && (
                         <motion.div 
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden bg-white border-b border-slate-50"
                         >
                           <div className="px-4 py-4 flex flex-col gap-6">
                             {/* BỘ KHUNG 5 MỨC ĐỘ */}
                             <div>
                                <div className="flex items-center gap-2 mb-4">
                                   <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                                   <h4 translate="no" className="notranslate text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                     BỘ KHUNG 5 MỨC ĐỘ
                                   </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                   {[
                                     { l: 'MỨC 5 (XUẤT SẮC)', c: 'Hoàn thành tốt nhiệm vụ; Có ứng dụng AI hoặc Sáng kiến giúp việc nhanh hơn, nhàn hơn; Được cấp trên khen ngợi.', bg: 'bg-indigo-50/50', txt: 'text-indigo-700', border: 'border-indigo-100' },
                                     { l: 'MỨC 4 (TỐT)', c: 'Hoàn thành đúng hạn; Kết quả sạch sẽ, ít sai sót; Sắp xếp công việc khoa học.', bg: 'bg-blue-50/50', txt: 'text-blue-700', border: 'border-blue-100' },
                                     { l: 'MỨC 3 (ĐẠT - 100% KPI)', c: 'Hoàn thành đầy đủ việc được giao; Đúng tiến độ; Đạt yêu cầu chất lượng cơ bản của công ty.', bg: 'bg-emerald-50/50', txt: 'text-emerald-700', border: 'border-emerald-100' },
                                     { l: 'MỨC 2 (CẦN CỐ GẮNG)', c: 'Còn sai sót nhỏ phải nhắc nhở; Trễ hạn nhẹ.', bg: 'bg-amber-50/50', txt: 'text-amber-700', border: 'border-amber-100' },
                                     { l: 'MỨC 1 (KÉM)', c: 'Không hoàn thành việc; Sai sót gây hậu quả; Thiếu trách nhiệm.', bg: 'bg-rose-50/50', txt: 'text-rose-700', border: 'border-rose-100' }
                                   ].map((m, i) => (
                                     <div key={i} className={`${m.bg} p-3 rounded-2xl border ${m.border} flex flex-col gap-2 transition-transform hover:scale-[1.02]`}>
                                       <span translate="no" className={`notranslate text-[10px] font-black ${m.txt} uppercase tracking-tighter`}>
                                         {m.l}
                                       </span>
                                       <span translate="no" className="notranslate text-[11px] text-slate-600 leading-relaxed font-medium">
                                         {m.c}
                                       </span>
                                     </div>
                                   ))}
                                </div>
                             </div>

                             {/* GỢI Ý TÁC CHIẾN */}
                             <div>
                                <div className="flex items-center gap-2 mb-4">
                                   <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                   <h4 translate="no" className="notranslate text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                     GỢI Ý TÁC CHIẾN (MẸO ĐẠT ĐIỂM 4-5)
                                   </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                   <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                       <span translate="no" className="notranslate font-black text-blue-600 text-sm">Q</span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                       <span translate="no" className="notranslate text-[10px] font-black text-blue-600 uppercase tracking-widest">QUALITY</span>
                                       <span translate="no" className="notranslate text-[11px] text-slate-600 leading-tight">
                                         Hồ sơ chuẩn 100%, không lỗi chính tả/số liệu, không cần sửa lại.
                                       </span>
                                     </div>
                                   </div>

                                   <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                                     <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                       <span translate="no" className="notranslate font-black text-emerald-600 text-sm">C</span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                       <span translate="no" className="notranslate text-[10px] font-black text-emerald-600 uppercase tracking-widest">COST</span>
                                       <span translate="no" className="notranslate text-[11px] text-slate-600 leading-tight">
                                         Dùng AI hoặc sáng kiến giảm &gt;30% thời gian làm việc.
                                       </span>
                                     </div>
                                   </div>

                                   <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                       <span translate="no" className="notranslate font-black text-indigo-600 text-sm">D</span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                       <span translate="no" className="notranslate text-[10px] font-black text-indigo-600 uppercase tracking-widest">DELIVERY</span>
                                       <span translate="no" className="notranslate text-[11px] text-slate-600 leading-tight">
                                         Gửi báo cáo sớm hơn hạn định hoặc xử lý việc khẩn siêu tốc.
                                       </span>
                                     </div>
                                   </div>
                                </div>
                             </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                    {/* Content Area - Bung sát viền tối đa, giảm padding dọc */}
                    <div className="flex-1 w-full p-1 flex flex-col gap-1">
                      {/* THỐNG KÊ CHI TIẾT (TOP TILES GỌN) */}
                      <div className="px-3 pt-2 grid grid-cols-4 gap-2">
                        <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ĐIỂM Q (TB)</span>
                           <span className="text-xl font-black text-blue-600">{stats.metrics.avgQ}</span>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ĐIỂM C (TB)</span>
                           <span className="text-xl font-black text-emerald-600">{stats.metrics.avgC}</span>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ĐIỂM D (TB)</span>
                           <span className="text-xl font-black text-amber-600">{stats.metrics.avgD}</span>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ĐÚNG HẠN (%)</span>
                           <span className="text-xl font-black text-indigo-600">{stats.metrics.onTimeRate}%</span>
                        </div>
                      </div>

                      {/* THỐNG KÊ QCD - THEO MÔ HÌNH TRÊN PHÂN TÍCH, DƯỚI NHẬN XÉT */}
                      <div className="px-3 pt-2 pb-1 grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-black text-emerald-600 uppercase tracking-widest">ĐẠT QCD</span>
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle size={10} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-emerald-900">{stats.qcd.pass}</span>
                            <span className="text-[10px] font-bold text-emerald-500">việc</span>
                          </div>
                          <div className="w-full h-1 bg-emerald-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.qcd.passRate}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 mt-0.5">Tỷ lệ: {stats.qcd.passRate}%</span>
                        </div>

                        <div className="bg-rose-50 rounded-2xl p-3 border border-rose-100 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-black text-rose-600 uppercase tracking-widest">KHÔNG ĐẠT</span>
                            <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                              <Clock size={10} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-rose-900">{stats.qcd.fail}</span>
                            <span className="text-[10px] font-bold text-rose-500">việc</span>
                          </div>
                          <div className="w-full h-1 bg-rose-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.qcd.failRate}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-rose-600 mt-0.5">Tỷ lệ: {stats.qcd.failRate}%</span>
                        </div>
                      </div>

                      {advice ? (
                        <div className="bg-slate-50/40 rounded-[22px] p-4 lg:p-5 h-full border border-slate-100 flex flex-col animate-in fade-in duration-500 flex-1">
                          <div 
                            className={`prose prose-sm prose-blue text-[13.5px] leading-relaxed text-slate-700 whitespace-pre-wrap font-medium notranslate translate-no flex-1 ${
                              isPrintMode ? 'max-h-none overflow-y-visible' : 'max-h-[120px] overflow-y-auto custom-scrollbar-slim pr-1'
                            }`} 
                            translate="no"
                          >
                            {advice}
                          </div>
                          {!isPrintMode && (
                            <div className="mt-2 flex justify-end">
                              <button onClick={getAdvice} className="text-[9px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest flex items-center gap-2 group">
                                <span translate="no" className="notranslate underline underline-offset-4 decoration-blue-200">LÀM MỚI PHÂN TÍCH</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : isPrintMode ? (
                        <div className="w-full flex items-center justify-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CHƯA KÍCH HOẠT PHÂN TÍCH HIỆU SUẤT AI</span>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center p-4 min-h-[80px]">
                          <button 
                            onClick={getAdvice} 
                            disabled={loadingAdvice} 
                            className="w-full max-w-sm bg-blue-600 text-white font-black py-3 px-8 rounded-xl flex items-center justify-center gap-4 transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 text-[10px] uppercase tracking-[0.2em] shadow-md shadow-blue-100 active:scale-95 group"
                          >
                            {loadingAdvice ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Sparkles size={14} className="text-amber-400 group-hover:rotate-12 transition-transform" />
                                <span translate="no" className="notranslate">KÍCH HOẠT PHÂN TÍCH AI</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
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

                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">
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

const StatCard = ({ icon, label, value, color, borderColor }: any) => (
  <div className={`${color} p-3 px-6 rounded-[24px] border-b-4 ${borderColor} shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[80px]`}>
    <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">{icon}</div>
    <div className="flex items-center gap-2 mb-1 relative z-10">
      <div className="p-1.5 bg-white/20 rounded-lg">{icon}</div>
      <p translate="no" className="notranslate text-[11px] font-black uppercase tracking-widest leading-none">{label}</p>
    </div>
    <p className="text-2xl font-black leading-none relative z-10 text-right">{value}</p>
  </div>
);
