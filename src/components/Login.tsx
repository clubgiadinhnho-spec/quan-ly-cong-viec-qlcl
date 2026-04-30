import React, { useState } from 'react';
import { User } from '../types';
import { SECURITY_QUESTIONS } from '../constants';
import { LogIn, Phone, User as UserIcon, UserPlus, ArrowLeft, Mail, Shield, Hash, Type, CheckCircle2, HelpCircle, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, loginWithGoogle, loginAnonymously } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

import { Avatar } from './common/Avatar';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function Login({ users, onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('qc_remember_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('qc_remember_phone') || '');
  const [securityAnswer, setSecurityAnswer] = useState(() => localStorage.getItem('qc_remember_sec_answer') || '');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('qc_remember_me') === 'true');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration states
  const [regData, setRegData] = useState<Partial<User>>({
    role: 'Nhân Viên',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}&mouth=smile`,
    securityQuestion: SECURITY_QUESTIONS[0]
  });

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const fbUser = await loginWithGoogle();
      if (!fbUser) return;

      // Find staff in our list by email
      const staffMember = users.find(u => 
        u.companyEmail.toLowerCase() === fbUser.email?.toLowerCase() ||
        u.personalEmail.toLowerCase() === fbUser.email?.toLowerCase()
      );

      if (staffMember) {
        // Sync the staff member with the Firebase UID for rules to work perfectly
        const updatedStaff = { ...staffMember, id: fbUser.uid };
        await setDoc(doc(db, 'users', fbUser.uid), updatedStaff);
        onLogin(updatedStaff);
      } else {
        // Create a new staff record for this Google user if not found
        const newUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Thành viên mới',
          phone: '',
          zalo: '',
          companyEmail: fbUser.email || '',
          personalEmail: fbUser.email || '',
          role: 'Nhân Viên',
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
          code: 'G-' + fbUser.uid.substring(0, 4).toUpperCase(),
          abbreviation: (fbUser.displayName || 'NEW').substring(0, 3).toUpperCase(),
          status: 'ACTIVE',
        };
        await setDoc(doc(db, 'users', fbUser.uid), newUser);
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error("Google Login error:", err);
      setError('Đăng nhập Google thất bại: ' + (err.message || 'Lỗi kết nối.'));
    } finally {
      setLoading(false);
    }
  };

  const handleInitialLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(
      u => (u.name.toLowerCase() === name.toLowerCase() && u.phone === phone) ||
           (u.companyEmail.toLowerCase() === name.toLowerCase() && u.phone === phone)
    );

    if (user) {
      if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
        setError('Tài khoản của bạn đã bị vô hiệu hóa.');
        return;
      }
      // User found, now show security question
      setFoundUser(user);
    } else {
      setError('Thông tin đăng nhập không chính xác (Họ tên/Email & Số điện thoại).');
    }
  };

  const handleFinalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) return;

    if (foundUser.securityAnswer?.toLowerCase().trim() === securityAnswer.toLowerCase().trim()) {
      if (foundUser.status === 'ACTIVE') {
        setLoading(true);
        try {
          // Attempt sign in anonymously to get a UID for Firebase Rules
          const fbUser = await loginAnonymously();
          
          let userToLogin = foundUser;

          if (fbUser) {
            // Sync the user record with the UID
            userToLogin = { ...foundUser, id: fbUser.uid };
            await setDoc(doc(db, 'users', fbUser.uid), userToLogin);
          } else {
            console.warn("Login proceeded WITHOUT Firebase Authentication. Real-time chat may be limited.");
          }
          
          if (rememberMe) {
            localStorage.setItem('qc_remember_me', 'true');
            localStorage.setItem('qc_remember_name', name);
            localStorage.setItem('qc_remember_phone', phone);
            localStorage.setItem('qc_remember_sec_answer', securityAnswer);
          } else {
            localStorage.removeItem('qc_remember_me');
            localStorage.removeItem('qc_remember_name');
            localStorage.removeItem('qc_remember_phone');
            localStorage.removeItem('qc_remember_sec_answer');
          }
          onLogin(userToLogin);
        } catch (err: any) {
          console.error("Auth error during regular login:", err);
          if (err.code === 'auth/admin-restricted-operation') {
            setError('Lỗi: Tính năng "Anonymous Auth" chưa được bật trên Firebase Console. Vui lòng liên hệ Admin.');
          } else {
            setError('Lỗi xác thực hệ thống: ' + err.message);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setError('Tài khoản của bạn đang chờ quản trị viên phê duyệt.');
        setFoundUser(null);
        setSecurityAnswer('');
      }
    } else {
      setError('Câu trả lời bảo mật không đúng.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!regData.name || !regData.phone || !regData.companyEmail || !regData.code || !regData.abbreviation || !regData.securityAnswer) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      // Check if user already exists
      const existingUser = users.find(u => 
        u.companyEmail.toLowerCase() === regData.companyEmail?.toLowerCase() || 
        u.phone === regData.phone ||
        u.code === regData.code
      );

      if (existingUser) {
        setError('Nhân viên này đã tồn tại trên hệ thống (Email/SĐT/Mã NV trùng).');
        setLoading(false);
        return;
      }

      const newUser: User = {
        id: `user_${Date.now()}`,
        name: regData.name!,
        phone: regData.phone!,
        zalo: regData.zalo || regData.phone!,
        companyEmail: regData.companyEmail!,
        personalEmail: regData.personalEmail || regData.companyEmail!,
        role: regData.role as any || 'Nhân Viên',
        avatar: regData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(regData.name!)}&background=random`,
        code: regData.code!,
        abbreviation: regData.abbreviation!,
        personalNote: '',
        status: 'PENDING',
        securityQuestion: regData.securityQuestion,
        securityAnswer: regData.securityAnswer
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      
      setRegSuccess(true);
      setIsRegistering(false);
      setName(newUser.companyEmail); 
      setPhone(newUser.phone);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError('Có lỗi xảy ra khi xử lý đăng ký: ' + (err.message || 'Lỗi kết nối Firebase.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden"
      >
        {regSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Đăng ký thành công!</h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Thông tin của bạn đã được gửi lên hệ thống.<br/>
              Vui lòng liên hệ <strong>Quản trị viên</strong> để được phê duyệt tài khoản.
            </p>
            <button 
              onClick={() => {
                setRegSuccess(false);
                setIsRegistering(false);
              }}
              className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-black transition-all"
            >
              Quay lại Đăng nhập
            </button>
          </motion.div>
        ) : (
          <>
            <div className="p-8 border-b border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg shadow-blue-100 transform -rotate-3">Q</div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
            {isRegistering ? 'Đăng ký nhân sự mới' : 'Hệ Thống Quản Lý QC'}
          </h1>
          <p className="text-gray-400 mt-1 text-xs font-medium tracking-tight">
            {isRegistering ? 'Vui lòng cung cấp thông tin chính xác' : 'Theo dõi hiệu suất & Báo cáo chất lượng'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {!isRegistering ? (
              <motion.div 
                key={foundUser ? "sec-form" : "login-form"}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {!foundUser ? (
                  <form onSubmit={handleInitialLoginAttempt} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={12} /> Tên nhân viên / Email
                      </label>
                      <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        placeholder="Họ tên hoặc Email..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Phone size={12} /> Số điện thoại
                      </label>
                      <input
                        type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        placeholder="Số điện thoại..."
                      />
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <input 
                        id="remember-me"
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="remember-me" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none">
                        Ghi nhớ đăng nhập
                      </label>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center">{error}</div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-50 uppercase tracking-widest text-xs"
                    >
                      TIẾP TỤC <LogIn size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-gray-50 shadow-sm uppercase tracking-widest text-[10px]"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                      {loading ? 'Đang xử lý...' : 'Đăng nhập Google (Dành cho Quản trị)'}
                    </button>
                    
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                      <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest text-gray-300"><span className="bg-white px-4">HOẶC</span></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setIsRegistering(true); setError(''); }}
                      className="w-full py-3.5 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:border-gray-200 uppercase tracking-widest text-xs"
                    >
                      <UserPlus size={16} /> Đăng ký nhân sự
                    </button>
                  </form>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={handleFinalLogin} 
                    className="space-y-6"
                  >
                    <div className="flex flex-col items-center gap-4 py-2">
                       <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                          <Lock size={28} className="animate-pulse" />
                       </div>
                       <div className="text-center">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Xác thực lớp 2</h3>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Lớp bảo vệ bổ sung cho {foundUser.name}</p>
                       </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                         <HelpCircle size={40} />
                      </div>
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShieldCheck size={12} /> Câu hỏi bảo mật của bạn
                      </p>
                      <p className="text-sm font-bold text-gray-800 leading-relaxed">
                        {foundUser.securityQuestion || 'Vui lòng trả lời câu hỏi bảo mật để tiếp tục:'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Câu trả lời
                      </label>
                      <div className="relative">
                        <input
                          type="text" required autoFocus
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold shadow-inner"
                          placeholder="Nhập câu trả lời của bạn..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <input 
                        id="remember-me-final"
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="remember-me-final" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none">
                        Ghi nhớ cho lần sau
                      </label>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-xl text-center flex items-center justify-center gap-2"
                      >
                         <span className="w-1 h-1 bg-red-600 rounded-full animate-ping" /> {error}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => { setFoundUser(null); setSecurityAnswer(''); setError(''); }}
                        className="px-6 py-3.5 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={14} /> Quay lại
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                      >
                        ĐĂNG NHẬP <LogIn size={14} />
                      </button>
                    </div>
                  </motion.form>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                       <UserPlus size={18} />
                    </div>
                    <div className="text-left">
                       <h3 className="text-xs font-black text-gray-900 uppercase">Thông tin cơ bản</h3>
                       <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cung cấp dữ liệu nhân sự chính xác</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="relative">
                      <Avatar 
                        src={regData.avatar} 
                        name={regData.name || 'new'} 
                        size="xl"
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="w-full space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                        Dán link ảnh đại diện (URL)
                      </label>
                      <input
                        type="text"
                        value={regData.avatar || ''}
                        onChange={(e) => setRegData({...regData, avatar: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <UserIcon size={10} /> Họ tên
                      </label>
                      <input
                        type="text" required value={regData.name || ''} 
                        onChange={(e) => setRegData({...regData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Phone size={10} /> SĐT
                      </label>
                      <input
                        type="tel" required value={regData.phone || ''} 
                        onChange={(e) => setRegData({...regData, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="09xxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail size={10} /> Email Công ty
                    </label>
                    <input
                      type="email" required value={regData.companyEmail || ''} 
                      onChange={(e) => setRegData({...regData, companyEmail: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                      placeholder="email@tanphu.vn"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> Mã NV
                      </label>
                      <input
                        type="text" required value={regData.code || ''} 
                        onChange={(e) => setRegData({...regData, code: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="QC-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Type size={10} /> Tên viết tắt
                      </label>
                      <input
                        type="text" required value={regData.abbreviation || ''} 
                        onChange={(e) => setRegData({...regData, abbreviation: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="NVA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield size={10} /> Chức vụ
                    </label>
                    <select 
                      value={regData.role}
                      onChange={(e) => setRegData({...regData, role: e.target.value as any})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Nhân Viên">Nhân Viên</option>
                      <option value="Trưởng Nhóm">Trưởng Nhóm</option>
                      <option value="Trưởng Phòng">Trưởng Phòng</option>
                    </select>
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <HelpCircle size={10} /> Chọn câu hỏi bảo mật
                      </label>
                      <select 
                        className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-[10px] font-bold outline-none"
                        value={regData.securityQuestion}
                        onChange={(e) => setRegData({...regData, securityQuestion: e.target.value})}
                      >
                        {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Lock size={10} /> Câu trả lời (Để đăng nhập)
                      </label>
                      <input
                        type="text" required value={regData.securityAnswer || ''} 
                        onChange={(e) => setRegData({...regData, securityAnswer: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-xs font-medium"
                        placeholder="Câu trả lời của bạn..."
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center">{error}</div>
                  )}

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-50 disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                      <UserPlus size={16} /> {loading ? 'ĐANG XỬ LÝ...' : 'HOÀN TẤT ĐĂNG KÝ'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setError(''); }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest shadow-sm"
                    >
                      <ArrowLeft size={12} /> Quay lại đăng nhập
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
        )}
        
        <div className="px-8 pb-6 text-center text-[10px] text-gray-300 font-medium border-t border-gray-100 mt-auto pt-4">
          Hệ thống bảo mật bởi QC TanPhu © 2026
        </div>
      </motion.div>
    </div>
  );
}

