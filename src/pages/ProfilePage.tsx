import React, { useState, useRef } from 'react';
import { User, Task } from '../types';
import { User as UserIcon, FileText, MessageSquare, Send, Shield, Lock, Save, HelpCircle, CheckCircle2, ShieldCheck, Camera, Edit2, Clock, Upload, Scissors, RefreshCw, X } from 'lucide-react';
import { SECURITY_QUESTIONS } from '../constants';
import { getPerformanceAdvice } from '../lib/gemini';
import { formatDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Avatar } from '../components/common/Avatar';

import { getSafeNameProps } from '../utils/userUtils';
import { FIXED_STAFF } from '../constants/staff';

interface ProfilePageProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  onUpdateNote: (userId: string, note: string) => void;
  onUpdateUser?: (user: User) => void;
}

export const ProfilePage = ({ currentUser, tasks, users, onUpdateNote, onUpdateUser }: ProfilePageProps) => {
  const [viewedUserId, setViewedUserId] = useState(currentUser.id);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Security editing states
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  // Avatar editing states
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState(currentUser.avatar || '');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgRef, setImgRef] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [secData, setSecData] = useState({
    question: currentUser.securityQuestion || SECURITY_QUESTIONS[0],
    answer: currentUser.securityAnswer || ''
  });
  
  // Health Reminder settings
  const [remData, setRemData] = useState(currentUser.reminderSettings || {
    enabled: true,
    intervalMinutes: 30,
    message: 'Đã 30 phút rồi! Hãy uống một ngụm nước nhé.',
    autoCloseSeconds: 25,
    configName: 'Cấu hình mặc định (Đức Mu)'
  });
  const [isEditingReminder, setIsEditingReminder] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const user = users.find(u => u.id === viewedUserId) || currentUser;
  const hasDelegatedPermissions = (u: User) => u.delegatedPermissions && Object.values(u.delegatedPermissions).some(v => v);

  const handleUpdateReminder = () => {
    if (!onUpdateUser) return;
    onUpdateUser({ ...currentUser, reminderSettings: remData });
    setIsEditingReminder(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const isFixedStaff = FIXED_STAFF.some(fs => fs.id === user.id);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedFile(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImgRef(e.currentTarget);
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1 / 1,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const getCroppedImg = async () => {
    if (!imgRef || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.naturalWidth / imgRef.width;
    const scaleY = imgRef.naturalHeight / imgRef.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set preview canvas size to desired final size (e.g., 256x256)
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      imgRef,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      size,
      size
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    setTempAvatar(base64Image);
    setSelectedFile(null);
  };

  const handleUpdateAvatar = () => {
    if (!onUpdateUser) return;
    onUpdateUser({ ...currentUser, avatar: tempAvatar });
    setIsEditingAvatar(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };
  const myTasks = tasks.filter((t) => t.assigneeId === user.id);
  const completed = myTasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const efficiency = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Leader' || !!currentUser.delegatedPermissions?.canApproveTask;

  const getAdvice = async () => {
    setLoadingAdvice(true);
    const feedback = await getPerformanceAdvice(user, tasks);
    setAdvice(feedback);
    setLoadingAdvice(false);
  };

  const handleUpdateNote = () => {
    onUpdateNote(user.id, tempNote);
    setIsEditingNote(false);
  };

  const handleUpdateSecurity = () => {
    if (!onUpdateUser) return;
    const updatedUser = {
      ...currentUser,
      securityQuestion: secData.question,
      securityAnswer: secData.answer
    };
    onUpdateUser(updatedUser);
    setIsEditingSecurity(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const startEditingSecurity = () => {
    setSecData({
      question: user.securityQuestion || SECURITY_QUESTIONS[0],
      answer: user.securityAnswer || ''
    });
    setIsEditingSecurity(true);
  };

  const startEditing = () => {
    setTempNote(user.personalNote || '');
    setIsEditingNote(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative group">
          <Avatar src={user.avatar} name={user.name} size="xl" className="w-32 h-32 rounded-3xl border-4 border-gray-100 shadow-xl bg-gray-50 object-cover" />
          {viewedUserId === currentUser.id && (
            <button 
              onClick={() => {
                setTempAvatar(currentUser.avatar || '');
                setIsEditingAvatar(true);
              }}
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"
              title="Đổi ảnh đại diện"
            >
              <Camera size={16} />
            </button>
          )}
          {user.lastActive && (Date.now() - user.lastActive < 120000) && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-[8px] font-black rounded-lg shadow-lg uppercase tracking-widest border-2 border-white animate-pulse">
              Online
            </div>
          )}
        </div>
        <div className="text-center md:text-left flex-1 space-y-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 {...getSafeNameProps()} className="text-3xl font-black text-gray-800 tracking-tight notranslate">{user.name}</h1>
              <div className="flex items-center gap-2">
                <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  user.role === 'Admin' ? 'bg-red-100 text-red-600' : 
                  user.role === 'Leader' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {user.role} {hasDelegatedPermissions(user) && '(QUYỀN TP)'}
                </span>
                <span className="text-[10px] font-black text-blue-400 px-2 py-1 bg-blue-50 rounded-lg italic border border-blue-100">
                  {user.abbreviation}
                </span>
              </div>
            </div>
            <p className="text-gray-500 font-bold flex items-center justify-center md:justify-start gap-2 mt-1">
              <UserIcon size={16} />
              Mã NV: {user.code}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8 pb-4 border-b border-gray-50">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">SĐT / Zalo</p>
              <p className="text-xs font-bold text-gray-700">{user.phone} {user.zalo ? `/ ${user.zalo}` : ''}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">Email Công Ty</p>
              <p className="text-xs font-bold text-gray-700">{user.companyEmail}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">Email Cá Nhân</p>
              <p className="text-xs font-bold text-gray-700">{user.personalEmail}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100">
              <span className="text-[8px] font-black text-green-600 uppercase tracking-widest block">Đã Xong</span>
              <span className="text-xl font-black text-green-700">{completed}</span>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block">Đang Chờ</span>
              <span className="text-xl font-black text-blue-700">{ongoing}</span>
            </div>
            
            {viewedUserId === currentUser.id && (
              <div className="flex-1 md:flex-none md:ml-auto flex flex-wrap gap-2">
                 <button 
                  onClick={() => setIsEditingReminder(true)}
                  className="w-full md:w-auto px-4 py-2 bg-blue-50 text-blue-700 text-[10px] font-black rounded-xl flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-100 uppercase tracking-widest"
                 >
                   <Clock size={14} />
                   Cài đặt nhắc nhở
                 </button>
                 <button 
                  onClick={startEditingSecurity}
                  className="w-full md:w-auto px-4 py-2 bg-gray-900 text-white text-[10px] font-black rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-200 uppercase tracking-widest"
                 >
                   <Shield size={14} className="text-blue-400" />
                   Cài đặt bảo mật
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingAvatar && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Camera size={20} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase">Cập nhật ảnh đại diện</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tải lên hình ảnh từ máy tính và cắt gọn chuẩn khung hình</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Upload size={12} /> Chọn tập tin ảnh
                    </label>
                    <input 
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={onSelectFile}
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-100 transition-all">
                        <Upload size={20} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-700">Nhấn để tải ảnh lên</p>
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">PNG, JPG tối đa 2MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       Hoặc dùng Link (URL)
                    </label>
                    <input 
                      type="text"
                      value={tempAvatar}
                      onChange={(e) => setTempAvatar(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-100 relative">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest absolute top-4 left-4">Xem trước</div>
                  <div className="w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                    <img 
                      src={tempAvatar} 
                      alt="preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback')} 
                    />
                  </div>
                  <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ảnh hiển thị trên hệ thống</p>
                </div>
              </div>

              {selectedFile && (
                <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-6 rounded-3xl shadow-2xl max-w-2xl w-full space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                        <Scissors size={16} className="text-blue-600" /> Cắt ảnh đại diện
                      </h4>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="max-h-[60vh] overflow-auto rounded-xl border border-gray-100 bg-gray-50 flex justify-center">
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop
                      >
                        <img src={selectedFile} onLoad={onImageLoad} alt="To crop" className="max-w-full" />
                      </ReactCrop>
                    </div>

                    <div className="flex justify-between items-center gap-4 pt-2">
                      <p className="text-[10px] text-gray-400 font-medium italic">Kéo thả khung để căn chỉnh chân dung của bạn</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedFile(null)}
                          className="px-6 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-xl transition-all"
                        >
                          Hủy
                        </button>
                        <button 
                          onClick={getCroppedImg}
                          className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                        >
                          <CheckCircle2 size={14} /> Xong
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => {
                    setIsEditingAvatar(false);
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all"
                >
                  Đóng
                </button>
                <button 
                  onClick={handleUpdateAvatar}
                  disabled={!!selectedFile}
                  className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={14} /> Lưu thay đổi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingSecurity && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Lock size={20} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase">Thiết lập câu hỏi bảo mật</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cần thiết để khôi phục mật khẩu hoặc xác thực lớp 2</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle size={12} /> Chọn câu hỏi
                  </label>
                  <select 
                    value={secData.question}
                    onChange={(e) => setSecData({...secData, question: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  >
                    {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} /> Câu trả lời bí mật
                  </label>
                  <input 
                    type="text"
                    value={secData.answer}
                    onChange={(e) => setSecData({...secData, answer: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Nhập câu trả lời..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsEditingSecurity(false)}
                  className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleUpdateSecurity}
                  className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                  <Save size={14} /> Lưu cài đặt
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingReminder && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock size={20} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase">Cấu hình nhắc nhở sức khỏe</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hệ thống sẽ nhắc nhở bạn sau mỗi khoảng thời gian nhất định</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative w-12 h-6 flex items-center">
                      <input 
                        type="checkbox" 
                        checked={remData.enabled}
                        onChange={(e) => setRemData({...remData, enabled: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-full h-full bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                      <div className="absolute left-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6"></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{remData.enabled ? 'Đang bật' : 'Đang tắt'}</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Khoảng cách nhắc (Phút)</label>
                  <input 
                    type="number"
                    value={remData.intervalMinutes}
                    onChange={(e) => setRemData({...remData, intervalMinutes: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên cấu hình hiển thị</label>
                   <input 
                    type="text"
                    value={remData.configName}
                    onChange={(e) => setRemData({...remData, configName: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Ví dụ: Đức Mu"
                  />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian tự đóng (Giây)</label>
                   <input 
                    type="number"
                    value={remData.autoCloseSeconds}
                    onChange={(e) => setRemData({...remData, autoCloseSeconds: parseInt(e.target.value) || 5})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nội dung nhắc nhở</label>
                   <textarea 
                    value={remData.message}
                    onChange={(e) => setRemData({...remData, message: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 h-20 resize-none"
                    placeholder="Nhập nội dung nhắc nhở..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsEditingReminder(false)}
                  className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleUpdateReminder}
                  className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                  <Save size={14} /> Lưu cấu hình
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-24 right-8 z-50"
          >
            <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
               <CheckCircle2 size={18} />
               <span className="text-xs font-black uppercase tracking-widest">Đã cập nhật bảo mật thành công!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Manager's Note Section */}
           <div className={`p-6 rounded-2xl border transition-all ${user.personalNote ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                  <MessageSquare size={18} className="text-amber-500" />
                  LỜI NHẮC - GÓP Ý TỪ QUẢN LÝ
                </h3>
                {isManagerOrAdmin && !isEditingNote && (
                  <button 
                    onClick={startEditing}
                    className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
                  >
                    {user.personalNote ? 'CHỈNH SỬA' : 'TẠO GÓP Ý'}
                  </button>
                )}
              </div>
              
              {isEditingNote ? (
                <div className="space-y-3">
                  <textarea 
                    className="w-full p-4 bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 text-sm h-32 resize-none leading-relaxed italic"
                    placeholder="Nhập lời nhắc hoặc góp ý cho nhân viên này..."
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditingNote(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">HỦY</button>
                    <button onClick={handleUpdateNote} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-100">
                      <Send size={14} />
                      GỬI LỜI NHẮC
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/50 p-4 rounded-xl min-h-[80px] flex items-center justify-center">
                  {user.personalNote ? (
                    <p className="text-sm text-gray-700 italic leading-relaxed text-center w-full">
                      "{user.personalNote}"
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Chưa có lời nhắc nào cho nhân sự này.</p>
                  )}
                </div>
              )}
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                <FileText className="text-blue-600" />
                DỮ LIỆU CÔNG VIỆC {viewedUserId === currentUser.id ? 'CỦA TÔI' : 'CHI TIẾT'}
              </h3>
              <div className="space-y-4">
                {myTasks.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">Chưa có dữ liệu công việc.</p>
                ) : (
                  myTasks.map((t) => (
                    <div key={t.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between group hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{t.title}</p>
                        <p className="text-[10px] text-gray-500">Mã: {t.code} | Hạn: {formatDate(t.expectedEndDate)}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {t.status === 'COMPLETED' ? 'HOÀN THÀNH' : 'ĐANG LÀM'}
                      </span>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
            <MessageSquare className="text-blue-600" />
            AI PERFORMANCE ADVISOR
          </h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed italic">
            Hệ thống AI sẽ phân tích toàn bộ dữ liệu công việc của <span {...getSafeNameProps()} className="font-bold text-gray-700 notranslate">{user.name}</span> để đưa ra đánh giá khách quan.
          </p>
          
          {advice ? (
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 animate-in zoom-in-95 duration-300">
               <div className="prose prose-sm prose-blue text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
                 {advice}
               </div>
               <button 
                onClick={getAdvice}
                className="mt-6 text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
              >
                CẬP NHẬT PHÂN TÍCH MỚI
              </button>
            </div>
          ) : (
            <button 
              onClick={getAdvice}
              disabled={loadingAdvice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loadingAdvice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ĐANG PHÂN TÍCH...
                </>
              ) : 'NHẬN ĐÁNH GIÁ TỪ AI'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
