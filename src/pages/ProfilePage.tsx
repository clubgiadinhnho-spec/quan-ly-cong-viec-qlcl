import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { User as UserIcon, FileText, MessageSquare, Shield, HelpCircle, CheckCircle2, Clock, Edit3, Save, Lock, Mail, Phone, UserCircle, Key, Eye, EyeOff, CheckCircle, Camera } from 'lucide-react';
import { getPerformanceAdvice } from '../lib/gemini';
import { formatDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../components/common/Avatar';
import { getSafeNameProps, isUserTask } from '../utils/userUtils';
import { updateAuthPassword } from '../lib/firebase';

interface ProfilePageProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  onUpdateProfile: (email: string, updates: Partial<User>) => Promise<void>;
}

// GIÁ TRỊ BẤT BIẾN - AI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI DANH SÁCH CHỨC DANH NÀY
const getHardcodedTitle = (name: string) => {
  const normName = name.trim();
  if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên') return 'ADMIN';
  if (normName === 'Võ Thị Mỹ Tân') return 'TRƯỞNG NHÓM (LEADER)';
  if (normName === 'Nguyễn Kiều Phan Tú' || normName === 'Bành Nhựt Hùng') return 'NHÂN VIÊN (STAFF)';
  return 'CHUYÊN VIÊN QC';
};

export const ProfilePage = ({ currentUser, tasks, users, onUpdateProfile }: ProfilePageProps) => {
  console.log('Email hiện tại:', currentUser?.email);
  const [viewedUserId, setViewedUserId] = useState(currentUser.id);
  const [isEditing, setIsEditing] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const user = users.find(u => u.id === viewedUserId) || currentUser;
  const canEdit = currentUser?.email?.toLowerCase().trim() === user?.personalEmail?.toLowerCase().trim() || 
                  currentUser?.companyEmail?.toLowerCase().trim() === user?.companyEmail?.toLowerCase().trim() ||
                  currentUser?.email === 'truong.le@tanphuvietnam.vn' ||
                  currentUser?.email === 'lenhattruong.tpp@gmail.com' ||
                  currentUser?.role === 'Admin'; 

  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone,
    companyEmail: user.companyEmail,
    personalEmail: user.personalEmail,
    title: user.title || '',
    avatar: user.avatar || ''
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      phone: user.phone,
      companyEmail: user.companyEmail,
      personalEmail: user.personalEmail,
      title: user.title || '',
      avatar: user.avatar || ''
    });
  }, [user.id, user.name, user.phone, user.companyEmail, user.personalEmail, user.avatar, user.password, isEditing]);

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const hasDelegatedPermissions = (u: User) => u.delegatedPermissions && Object.values(u.delegatedPermissions).some(v => v);

  const myTasks = tasks.filter((t) => isUserTask(t, user));
  const completed = myTasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const efficiency = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  const getAdvice = async () => {
    setLoadingAdvice(true);
    const feedback = await getPerformanceAdvice(user, tasks);
    setAdvice(feedback);
    setLoadingAdvice(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Identify the best key for the Firestore document
    // We prioritize personalEmail as it's the identifier used in useStaff
    const profileKey = user.personalEmail || user.companyEmail || user.email;
    
    if (!profileKey) {
      alert("Không tìm thấy định danh người dùng (Email). Không thể lưu.");
      setSaving(false);
      return;
    }

    try {
      // 1. Update Password in Firebase Auth if provided (only for self)
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          alert("Mật khẩu xác nhận không khớp!");
          setSaving(false);
          return;
        }
        if (passwordData.newPassword.length < 6) {
          alert("Mật khẩu phải từ 6 ký tự trở lên!");
          setSaving(false);
          return;
        }
        
        // Only attempt auth password update if updating own profile
        const isSelf = currentUser?.email?.toLowerCase() === user.personalEmail?.toLowerCase() || 
                       currentUser?.email?.toLowerCase() === user.companyEmail?.toLowerCase();
                       
        if (isSelf) {
          try {
            await updateAuthPassword(passwordData.newPassword);
          } catch (authErr: any) {
            console.warn("Auth password update failed (possibly not own account or session expired):", authErr);
            if (authErr.code === 'auth/requires-recent-login') {
               alert("Để bảo mật, bạn cần Đăng xuất và Đăng nhập lại trước khi có thể đổi mật khẩu.");
               setSaving(false);
               return;
            }
          }
        }
      }

      // 2. Update Firestore Profile
      const updates: Partial<User> = {
        ...formData,
        id: user.id, // Include stable ID
        code: user.code, // Include stable Code
        uniqueKey: user.uniqueKey, // Include stable UniqueKey
        // CẬP BẬC ƯU TIÊN: Lưu mật khẩu mới hoặc giữ mật khẩu hiện tại vào Firestore
        password: passwordData.newPassword || user.password || '123456',
        updatedAt: new Date().toISOString()
      };

      console.log('Đang cập nhật hồ sơ cho:', profileKey, updates);
      await onUpdateProfile(profileKey, updates);
      
      alert("Đã cập nhật thông tin thành công!");
      setToast("Cập nhật thành công!");
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

  const getRoleBgColor = (name: string) => {
    const normName = name.trim();
    const title = getHardcodedTitle(name);
    // New light blue theme based on user request
    if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên' || title === 'ADMIN') return 'bg-[#eff6ff]';
    if (title === 'TRƯỞNG NHÓM (LEADER)') return 'bg-[#fff7ed]';
    return 'bg-[#f0fdf4]';
  };

  const getRolePageBg = (name: string) => {
    return 'bg-white';
  };

  const isOnline = user.lastActive && (Date.now() - user.lastActive < 120000);

  return (
    <div className={`min-h-screen -m-6 p-6 ${getRolePageBg(user.name)} transition-colors duration-500`}>
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

        {/* PROFILE CARD & STATS ROW - FULL WIDTH (max-w-6xl) */}
        <div className="space-y-4">
          {/* NUTIFOOD STAFF CARD - ULTRA WIDE & LIGHT THEME */}
          <div className={`${getRoleBgColor(user.name)} rounded-[32px] shadow-xl transition-all duration-300 relative flex flex-col px-12 py-6 overflow-hidden border-4 border-slate-100 w-full`}>
            {/* Header row - Contrast colored text for light background */}
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
                    {getHardcodedTitle(user.name)}
                  </div>
                  <span className="text-[15px] font-mono font-black text-slate-400 uppercase tracking-widest">#{user.code}</span>
                </div>
              </div>

              {!isEditing && canEdit && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="h-10 px-6 rounded-xl bg-white text-slate-800 text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 border border-slate-200"
                >
                  <Edit3 size={16} strokeWidth={2.5} />
                  CHỈNH SỬA
                </button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <button onClick={handleSave} className="h-10 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-700">
                    <Save size={16} strokeWidth={2.5} /> LƯU
                  </button>
                  <button onClick={() => setIsEditing(false)} className="h-10 px-6 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors">
                    HỦY
                  </button>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex gap-8 items-stretch">
              {/* Left: Avatar */}
              <div className="w-32 shrink-0 group/avatar relative">
                <div className="relative aspect-square w-full rounded-[24px] overflow-hidden border-2 border-white shadow-lg bg-white flex items-center justify-center">
                  <Avatar 
                    src={formData.avatar} 
                    name={formData.name} 
                    size="full" 
                    className="w-full h-full object-cover transition-opacity duration-300 group-hover/avatar:opacity-0" 
                  />
                  
                  {/* Camera Overlay on Hover / Edit mode */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity bg-white/20 backdrop-blur-sm ${isEditing ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'}`}>
                    <Camera size={32} className="text-blue-600 mb-1" strokeWidth={2.5} />
                    {isEditing && (
                      <input 
                        type="text"
                        placeholder="URL Ảnh"
                        value={formData.avatar}
                        onChange={e => setFormData({...formData, avatar: e.target.value})}
                        className="text-[8px] font-black bg-white/80 border border-blue-200 rounded px-1 w-[90%] outline-none"
                      />
                    )}
                  </div>

                  {isOnline && !isEditing && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded shadow-lg uppercase tracking-widest border border-white flex items-center gap-1">
                      ON
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Info boxes */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-12 gap-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-3">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Phone size={12} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ĐIỆN THOẠI</span>
                    </div>
                    {!isEditing ? (
                      <p className="text-[20px] font-black text-slate-900 font-mono tracking-tighter leading-none">{user.phone}</p>
                    ) : (
                      <input 
                        type="text" value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full text-[18px] font-black text-blue-600 font-mono outline-none bg-blue-50/30 rounded-lg px-2 py-0.5"
                      />
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-6">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Mail size={12} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HỆ THỐNG EMAIL</span>
                    </div>
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                          <span className="text-[9px] font-black text-slate-400 w-8 shrink-0 tracking-tighter">CTY:</span>{user.companyEmail}
                        </div>
                        {user.personalEmail && (
                          <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#1e3a8a]">
                            <span className="text-[9px] font-black text-slate-400 w-8 shrink-0 tracking-tighter">C/N:</span>{user.personalEmail}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-slate-400 w-6 shrink-0">CTY:</span>
                          <input 
                            type="email" value={formData.companyEmail}
                            onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                            className="flex-1 text-[11px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-1 py-0.5"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-slate-400 w-6 shrink-0">C/N:</span>
                          <input 
                            type="email" value={formData.personalEmail}
                            onChange={e => setFormData({...formData, personalEmail: e.target.value})}
                            className="flex-1 text-[11px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-1 py-0.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center min-h-[85px] col-span-3">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <Lock size={12} className="text-blue-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{!isEditing ? 'TRUY CẬP' : 'CẬP NHẬT MẬT KHẨU'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {!isEditing ? (
                        <>
                          <p className="text-[18px] font-black text-slate-900 font-mono tracking-[0.1em] leading-none">
                            {showPassword ? (user.password || '123456') : '••••••••••••'}
                          </p>
                          <button onClick={() => setShowPassword(!showPassword)} className="text-slate-300 hover:text-slate-600 transition-colors">
                            <Eye size={16} strokeWidth={2.5} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1 w-full">
                           <input 
                             type="password"
                             placeholder="Mật khẩu mới"
                             value={passwordData.newPassword}
                             onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                             className="w-full text-[12px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-2 py-0.5"
                           />
                           <input 
                             type="password"
                             placeholder="Xác nhận"
                             value={passwordData.confirmPassword}
                             onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                             className="w-full text-[12px] font-bold text-blue-600 outline-none bg-blue-50/30 rounded px-2 py-0.5"
                           />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STATISTICS Row - 4 items scaled horizontally */}
          <div className="grid grid-cols-4 gap-4 px-0">
            <div className="bg-amber-500 p-3 px-6 rounded-[24px] border-b-4 border-amber-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[80px]">
              <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
                <FileText size={50} />
              </div>
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <FileText size={14} strokeWidth={3} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">Tổng dự án</p>
              </div>
              <p className="text-2xl font-black leading-none relative z-10 text-right">0</p>
            </div>

            <div className="bg-emerald-500 p-3 px-6 rounded-[24px] border-b-4 border-emerald-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[80px]">
              <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={50} />
              </div>
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <CheckCircle2 size={14} strokeWidth={3} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">Hiệu suất</p>
              </div>
              <p className="text-2xl font-black leading-none relative z-10 text-right">{efficiency}%</p>
            </div>

            <div className="bg-red-500 p-3 px-6 rounded-[24px] border-b-4 border-red-600 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[80px]">
              <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
                <Clock size={50} />
              </div>
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Clock size={14} strokeWidth={3} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap leading-none">Đang xử lý</p>
              </div>
              <p className="text-2xl font-black leading-none relative z-10 text-right">{ongoing}</p>
            </div>

            <div className="bg-blue-600 p-3 px-6 rounded-[24px] border-b-4 border-blue-700 shadow-lg relative overflow-hidden group text-white flex flex-col justify-center min-h-[80px]">
              <div className="absolute right-[-2px] bottom-[-5px] opacity-10 group-hover:scale-110 transition-transform">
                <CheckCircle size={50} />
              </div>
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <CheckCircle size={14} strokeWidth={3} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">Hoàn thành</p>
              </div>
              <p className="text-2xl font-black leading-none relative z-10 text-right">{completed}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[12px] font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                    <FileText className="text-blue-600" />
                    LỊCH SỬ CÔNG VIỆC CHI TIẾT (GẦN NHẤT)
                  </h3>
                </div>
                <div className="space-y-4">
                  {myTasks.length === 0 ? (
                    <p className="text-center text-gray-400 py-10 italic">Chưa có dữ liệu công việc.</p>
                  ) : (
                    myTasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors uppercase">{t.title}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-blue-500/60 uppercase">MÃ: {t.code}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> HẠN: {formatDate(t.expectedEndDate)}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                          t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {t.status === 'COMPLETED' ? 'HOÀN THÀNH' : 'ĐANG THỰC HIỆN'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 h-fit flex flex-col gap-6">
            <div>
              <h3 className="text-[12px] font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                <MessageSquare className="text-blue-600" />
                AI PERFORMANCE ADVISOR
              </h3>
              <p className="text-[11px] text-gray-500 mb-6 leading-relaxed font-medium">
                Sử dụng mô hình Gemini để phân tích dữ liệu hiệu suất và đưa ra các đề xuất cải thiện năng lực làm việc.
              </p>
            </div>
            
            {advice ? (
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 animate-in zoom-in-95 duration-300 shadow-inner">
                 <div className="prose prose-sm prose-blue text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                   {advice}
                 </div>
                 <button 
                  onClick={getAdvice}
                  className="mt-6 text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                >
                  LÀM MỚI PHÂN TÍCH
                </button>
              </div>
            ) : (
              <button 
                onClick={getAdvice}
                disabled={loadingAdvice}
                className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                {loadingAdvice ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ĐANG PHÂN TÍCH...
                  </>
                ) : 'BẮT ĐẦU PHÂN TÍCH AI'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
