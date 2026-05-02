import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { User as UserIcon, FileText, MessageSquare, Shield, HelpCircle, CheckCircle2, Clock, Edit3, Save, Lock, Mail, Phone, UserCircle, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';
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
                  currentUser?.email === 'truong.le@tanphu.vn' ||
                  currentUser?.email === 'lenhattruong.tpp@gmail.com'; 

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
  }, [user.id, user.name, user.phone, user.companyEmail, user.personalEmail, user.avatar, user.password]);

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
    setSaving(true);
    try {
      // 1. Update Password if provided
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
        try {
          await updateAuthPassword(passwordData.newPassword);
        } catch (authErr: any) {
          if (authErr.code === 'auth/requires-recent-login') {
             alert("Để bảo mật, bạn cần Đăng xuất và Đăng nhập lại trước khi có thể đổi mật khẩu.");
             setSaving(false);
             return;
          }
          throw authErr;
        }
      }

      // 2. Update Firestore Profile
      const updates: Partial<User> = {
        ...formData,
        // CẤP BẬC ƯU TIÊN: Lưu mật khẩu mới hoặc giữ mật khẩu hiện tại vào Firestore
        password: passwordData.newPassword || user.password || '123456'
      };

      await onUpdateProfile(user.personalEmail, updates);
      
      alert("Đã cập nhật thông tin thành công!");
      setToast("Cập nhật thành công!");
      setIsEditing(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error(error);
      alert("Lỗi cập nhật: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-3 rounded-2xl shadow-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border-2 border-emerald-400"
          >
            <CheckCircle size={18} strokeWidth={3} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-bl-[100px] -z-0" />
        
        <div className="relative group z-10">
          <Avatar src={formData.avatar} name={formData.name} size="xl" className="w-40 h-40 rounded-3xl border-4 border-white shadow-2xl bg-gray-50 object-cover" />
          {isEditing && (
             <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <p className="text-white text-[10px] font-black uppercase tracking-widest">Đổi Ảnh</p>
             </div>
          )}
          {user.lastActive && (Date.now() - user.lastActive < 120000) && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-[8px] font-black rounded-lg shadow-lg uppercase tracking-widest border-2 border-white">
              Online
            </div>
          )}
        </div>

        <div className="text-center md:text-left flex-1 space-y-6 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                {!isEditing ? (
                  <h1 {...getSafeNameProps()} className="text-3xl font-black text-gray-800 tracking-tight notranslate">
                    <span translate="no" className="notranslate">{user.name}</span>
                  </h1>
                ) : (
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="text-3xl font-black text-blue-700 tracking-tight bg-blue-50/50 border-2 border-blue-500 rounded-xl outline-none w-full md:w-[400px] px-4 py-2 uppercase shadow-inner"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.role === 'Admin' ? 'bg-red-100 text-red-600 border border-red-200' : 
                    user.role === 'Leader' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-blue-100 text-blue-600 border border-blue-200'
                  }`}>
                    <span translate="no" className="notranslate">{getHardcodedTitle(user.name)}</span> {hasDelegatedPermissions(user) && '(QUYỀN TRƯỞNG PHÒNG)'}
                  </span>
                </div>
              </div>

              <p className="text-gray-500 font-bold flex items-center justify-center md:justify-start gap-2">
                <UserIcon size={16} />
                <span translate="no" className="notranslate uppercase tracking-tighter">MÃ NV: {user.code}</span>
              </p>
            </div>

            {!isEditing && canEdit && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[12px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all shadow-blue-100 border-b-2 border-blue-800"
              >
                <Edit3 size={16} strokeWidth={3} />
                CHỈNH SỬA HỒ SƠ
              </button>
            )}
            
            {isEditing && (
                <div className="flex items-center gap-3">
                   <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} strokeWidth={3} />}
                    LƯU THÔNG TIN
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all hover:bg-gray-200"
                  >
                    HỦY
                  </button>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} /> Thông tin liên hệ
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Phone size={10} /> <span translate="no" className="notranslate">SỐ ĐIỆN THOẠI / ZALO</span></label>
                  {!isEditing ? (
                    <p className="text-sm font-bold text-gray-700">{user.phone}</p>
                  ) : (
                    <input 
                      type="text" value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-blue-50/30 border-2 border-blue-500 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 outline-none shadow-inner"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Mail size={10} /> EMAIL CT</label>
                  {!isEditing ? (
                    <p className="text-sm font-bold text-gray-700">{user.companyEmail}</p>
                  ) : (
                    <input 
                      type="email" value={formData.companyEmail}
                      onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                      className="w-full bg-blue-50/30 border-2 border-blue-500 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 outline-none shadow-inner"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Mail size={10} /> EMAIL CN</label>
                  {!isEditing ? (
                    <p className="text-sm font-bold text-gray-700">{user.personalEmail}</p>
                  ) : (
                    <input 
                      type="email" value={formData.personalEmail}
                      onChange={e => setFormData({...formData, personalEmail: e.target.value})}
                      className="w-full bg-blue-50/30 border-2 border-blue-500 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 outline-none shadow-inner"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} /> Vị trí & Chức danh
              </h4>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1"><UserCircle size={10} /> CHỨC DANH NIÊM YẾT</label>
                {!isEditing ? (
                  <p className="text-sm font-bold text-gray-700">
                    <span translate="no" className="notranslate">{getHardcodedTitle(user.name)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-blue-600 italic">
                    Chức danh này được hệ thống quản lý tự động.
                  </p>
                )}
              </div>

              {canEdit && isEditing && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Key size={14} /> <span translate="no" className="notranslate">CẬP NHẬT MẬT KHẨU</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1 relative">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><span translate="no" className="notranslate">MẬT KHẨU MỚI</span></label>
                       <input 
                        type={showPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full bg-blue-50/30 border-2 border-blue-500 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 outline-none shadow-inner pr-12"
                        placeholder="Nhập mật khóa bảo mật mới"
                       />
                       <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-9 text-blue-400 hover:text-blue-600">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                       </button>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><span translate="no" className="notranslate">XÁC NHẬN MẬT KHẨU</span></label>
                       <input 
                        type={showPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className={`w-full bg-blue-50/30 border-2 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 outline-none shadow-inner ${
                          passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword ? 'border-red-500' : 'border-blue-500'
                        }`}
                        placeholder="Nhập lại chính xác mật khẩu"
                       />
                       {passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword && (
                         <p className="text-[8px] text-red-500 font-bold uppercase mt-1">Mật khẩu xác nhận không khớp!</p>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <div>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Hiệu suất</span>
                <span className="text-xl font-black text-emerald-700">{efficiency}%</span>
              </div>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3">
              <Clock className="text-blue-500" size={20} />
              <div>
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block">Xử lý (đang mở)</span>
                <span className="text-xl font-black text-blue-700">{ongoing}</span>
              </div>
            </div>
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
  );
};
