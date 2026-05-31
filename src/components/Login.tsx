import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, logout, db, findProfileByEmail, syncProfileUid, auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { generateUniqueKey } from '../utils/stringUtils';
import { doc, getDoc, enableNetwork } from 'firebase/firestore';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onAddStaff: (u: User) => Promise<void>;
}

export default function Login({ users, onLogin, onAddStaff }: LoginProps) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [email, setEmail] = useState(() => localStorage.getItem('qc_remember_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newRole, setNewRole] = useState<User['role']>('Staff');
  const [newTitle, setNewTitle] = useState('Nhân viên');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isPasswordMatch = (mode === 'REGISTER') ? (password === confirmPassword && password.length >= 6) : true;

  const validateEmail = (emailStr: string) => {
    const user = users.find(u => 
      (u.companyEmail || '').toLowerCase() === emailStr.toLowerCase() ||
      (u.personalEmail || '').toLowerCase() === emailStr.toLowerCase()
    );
    return user;
  };

  const isSystemAdmin = (emailStr: string) => [
    "truong.le@tanphuvietnam.vn", 
    "lenhattruong.tpp@gmail.com", 
    "lenhattruong.caphef1@gmail.com",
    "club.nhuatanphu@gmail.com", 
    "tanphuvietnam.tpp@gmail.com", 
    "truongln.tanhongngoc@gmail.com"
  ].includes(emailStr.toLowerCase());

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(<span translate="no" className="notranslate">VUI LÒNG NHẬP EMAIL ĐỂ KHÔI PHỤC MẬT KHẨU.</span> as any);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setError(<span translate="no" className="notranslate" style={{ color: '#10b981' }}>LIÊN KẾT ĐẶT LẠI MẬT KHẨU ĐÃ ĐƯỢC GỬI VÀO EMAIL CỦA BẠN.</span> as any);
      setTimeout(() => setMode('LOGIN'), 3000);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(<span translate="no" className="notranslate">LỖI: {err.message}</span> as any);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // ÉP BUỘC MẠNG ONLINE
    try { await enableNetwork(db); } catch (e) {}

    setLoading(true);
    try {
      const fbUser = await loginWithEmail(email, password);
      if (fbUser) {
        // THIẾT QUÂN LUẬT: TÌM HỒ SƠ THEO MỌI CÁCH (UID HOẶC EMAIL)
        let staffMember = users.find(u => u.id === fbUser.uid || (u as any).uid === fbUser.uid);
        let profileDocId = '';

        if (!staffMember) {
          // NẾU KHÔNG THẤY THEO UID, TÌM THEO EMAIL
          const emailMatch = await findProfileByEmail(email);
          if (emailMatch) {
            staffMember = emailMatch.data as User;
            profileDocId = emailMatch.docId;
            // TỰ ĐỘNG ĐỒNG BỘ UID MỚI VÀO HỒ SƠ FIRESTORE
            await syncProfileUid(profileDocId, fbUser.uid);
            // Cập nhật lại model cục bộ
            staffMember.id = fbUser.uid;
          }
        }

        const systemAdmin = isSystemAdmin(email);

        if (!staffMember && !systemAdmin) {
          // Bất đắc dĩ không thấy hồ sơ ở cả 2 nơi (Auth OK nhưng Firestore trắng trơn)
          setError(
            <span translate="no" className="notranslate">Xác thực thành công nhưng hệ thống chưa có hồ sơ nhân sự của bạn. Vui lòng liên hệ Admin.</span> as any
          );
          setLoading(false);
          await logout();
          return;
        }

        if (staffMember && staffMember.status !== 'ACTIVE' && !systemAdmin) {
          setError(
            <span translate="no" className="notranslate">Tài khoản của bạn đang chờ phê duyệt (Trạng thái: {staffMember.status}).</span> as any
          );
          setLoading(false);
          await logout();
          return;
        }

        localStorage.setItem('qc_remember_email', email);
        
        const userToLogin = staffMember 
          ? { ...staffMember, id: fbUser.uid, lastActive: Date.now() } as User
          : {
              id: fbUser.uid,
              name: "System Admin",
              role: "Admin",
              companyEmail: email,
              personalEmail: email,
              status: "ACTIVE",
              uniqueKey: `ADMIN_${fbUser.uid}`,
              lastActive: Date.now()
            } as User;

        onLogin(userToLogin);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = err.message || String(err);
      
      const isInvalidAuth = 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/invalid-login-credentials' ||
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/invalid-login-credentials');

      if (isInvalidAuth) {
        msg = "Email hoặc mật khẩu không chính xác.";
      } else {
        msg = "Lỗi đăng nhập: " + msg;
      }

      setError(
        <span translate="no" className="notranslate">{msg}</span> as any
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      if (fbUser) {
        const staffMember = validateEmail(fbUser.email || '');
        if (!staffMember) {
           setError(
             <span translate="no" className="notranslate">Email Google này không có trong danh sách nhân sự được cấp phép.</span> as any
           );
           await logout();
           return;
        }

        if (staffMember.status !== 'ACTIVE') {
          setError(
            <span translate="no" className="notranslate">Tài khoản của bạn đang chờ quản trị viên phê duyệt.</span> as any
          );
          await logout();
          return;
        }

        const userToLogin = { ...staffMember, id: fbUser.uid, lastActive: Date.now() } as User;
        onLogin(userToLogin);
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(
        <span translate="no" className="notranslate">Lỗi đăng nhập Google: {err.message}</span> as any
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // CLEAR ERROR AT START

    if (password !== confirmPassword) {
      setError(
        <span translate="no" className="notranslate">MẬT KHẨU XÁC NHẬN KHÔNG KHỚP.</span> as any
      );
      return;
    }

    if (password.length < 6) {
      setError(
        <span translate="no" className="notranslate">MẬT KHẨU PHẢI CÓ ÍT NHẤT 6 KÝ TỰ.</span> as any
      );
      return;
    }

    setLoading(true);
    try {
      const uniqueKey = generateUniqueKey(newName, newPhone);
      
      // LỆNH KHÓA ĐỊNH DANH NHÂN SỰ: Kiểm tra trước khi tạo
      const docRef = doc(db, 'user_profiles', uniqueKey);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setError(
          <span translate="no" className="notranslate">NHÂN VIÊN NÀY ĐÃ CÓ TRÊN HỆ THỐNG</span> as any
        );
        setLoading(false);
        return;
      }
      
      const existingInList = users.find(u => 
        (u.personalEmail || '').toLowerCase() === email.toLowerCase() ||
        (u.companyEmail || '').toLowerCase() === email.toLowerCase() ||
        u.uniqueKey === uniqueKey ||
        u.phone === newPhone
      );

      // Create Auth Account first
      let fbUser;
      try {
        fbUser = await registerWithEmail(email, password, newName);
      } catch (authErr: any) {
        // LỆNH SỬA LỖI ĐĂNG KÝ: Nếu email đã tồn tại trong Auth, chuyển sang Login để lấy thông tin Auth
        if (authErr.code === 'auth/email-already-in-use') {
          console.log("Email existed in Auth, attempting to proceed with profile creation...");
          fbUser = await loginWithEmail(email, password);
        } else {
          throw authErr;
        }
      }
      
    if (fbUser) {
        // CHỜ MỘT CHÚT ĐỂ AUTH STATE ĐƯỢC ĐỒNG BỘ
        await new Promise(resolve => setTimeout(resolve, 800));

        // Prepare profile data
        const userToLogin: User = {
          id: fbUser.uid,
          name: newName,
          phone: newPhone,
          companyEmail: newCompanyEmail,
          personalEmail: email,
          password: password,
          uniqueKey: uniqueKey, 
          role: newRole,
          title: newTitle,
          status: 'PENDING',
          code: `QC-${Math.floor(100+Math.random()*900)}`,
          abbreviation: newName.substring(0, 3).toUpperCase(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uniqueKey}`,
          lastActive: Date.now()
        };

        // LỆNH SỬA LỖI ĐĂNG KÝ: Luôn lưu vào Firestore với ID là uniqueKey
        await onAddStaff(userToLogin);

        localStorage.setItem('qc_remember_email', email);
        
        // Show success message as requested
        setError(
          <span translate="no" className="notranslate" style={{ color: '#10b981' }}>
            ĐĂNG KÝ THÀNH CÔNG! CHÀO MỪNG BẠN.
          </span> as any
        );
        
        // Logout immediately for normal users to wait for approval
        if (!isSystemAdmin(email)) {
          await logout();
          setTimeout(() => {
            setMode('LOGIN');
            setError('');
          }, 3000);
        } else {
          // If admin happens to register, let them in
          onLogin(userToLogin);
        }
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      
      let errorMessage = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {}

      if (err.code === 'auth/email-already-in-use') {
        setError(
          <span translate="no" className="notranslate">Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc dùng email khác.</span> as any
        );
      } else if (err.code === 'auth/wrong-password') {
        setError(
          <span translate="no" className="notranslate">Email đã tồn tại nhưng sai mật khẩu. Vui lòng nhập đúng mật khẩu để tiếp tục.</span> as any
        );
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(
          <span translate="no" className="notranslate">Phương thức Đăng ký bằng Email chưa được bật trong Firebase Console.</span> as any
        );
      } else {
        setError(
          <span translate="no" className="notranslate">Lỗi đăng ký: {errorMessage}</span> as any
        );
      }
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
        <div className="p-8 border-b border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg shadow-blue-100 transform -rotate-3">Q</div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
            <span translate="no" className="notranslate">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG</span>
          </h1>
          <p className="text-gray-500 mt-2 text-[10px] font-bold tracking-widest uppercase">
            <span translate="no" className="notranslate">PHÒNG QUẢN LÝ CHẤT LƯỢNG TÂN PHÚ VIỆT NAM</span>
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => { setMode('LOGIN'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <span translate="no" className="notranslate">Đăng nhập</span>
            </button>
            <button 
              onClick={() => { setMode('REGISTER'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'REGISTER' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <span translate="no" className="notranslate">Đăng ký mới</span>
            </button>
          </div>

          <form onSubmit={mode === 'LOGIN' ? handleLogin : (mode === 'FORGOT' ? handleForgotPassword : handleRegister)} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span translate="no" className="notranslate">Họ và Tên</span>
                  </label>
                  <input
                    type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span translate="no" className="notranslate">Số điện thoại</span>
                  </label>
                  <input
                    type="tel" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="090..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span translate="no" className="notranslate">Email Công ty</span>
                  </label>
                  <input
                    type="email" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="xyz@tanphu.vn"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span translate="no" className="notranslate">Vai trò hệ thống</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setNewRole(val);
                      if (!newTitle || newTitle === 'Nhân viên' || newTitle === 'Trưởng nhóm' || newTitle === 'Quản trị viên') {
                        setNewTitle(val === 'Leader' ? 'Trưởng nhóm' : (val === 'Admin' ? 'Quản trị viên' : 'Nhân viên'));
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-bold"
                  >
                    <option value="Staff">Nhân viên (Staff)</option>
                    <option value="Leader">Trưởng nhóm/Phòng (Leader)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span translate="no" className="notranslate">Chức danh cụ thể</span>
                  </label>
                  <input
                    type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="VD: Trưởng phòng QC, Chuyên viên..."
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> <span translate="no" className="notranslate">{mode === 'FORGOT' ? 'NHẬP EMAIL ĐÃ ĐĂNG KÝ' : 'Email đăng nhập (Cá nhân)'}</span>
              </label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                placeholder="abc@gmail.com"
              />
            </div>

            {mode !== 'FORGOT' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> <span translate="no" className="notranslate">MẬT KHẨU</span> {mode === 'REGISTER' && '(Ít nhất 6 ký tự)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium pr-10"
                    placeholder="Nhập mật khẩu"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'LOGIN' && (
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setMode('FORGOT'); 
                        setError(<span translate="no" className="notranslate" style={{ color: '#2563eb' }}>Lê Nhật Trường, Điện thoại/ Zalo: 0907767304</span> as any); 
                      }}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:underline mt-1"
                    >
                      <span translate="no" className="notranslate">Quên mật khẩu?</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'REGISTER' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={12} /> <span translate="no" className="notranslate">Xác nhận mật khẩu</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-1 outline-none transition-all text-sm font-medium ${
                    confirmPassword && !isPasswordMatch ? 'border-red-300 focus:ring-red-500' : 'border-gray-100 focus:ring-blue-500'
                  }`}
                  placeholder="Nhập lại mật khẩu"
                />
                {confirmPassword && !isPasswordMatch && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase italic">Mật khẩu xác nhận không khớp!</p>
                )}
              </div>
            )}

            {mode === 'FORGOT' && (
              <div className="flex justify-start">
                <button 
                  type="button" 
                  onClick={() => { setMode('LOGIN'); setError(''); }}
                  className="text-[10px] font-black text-gray-500 uppercase tracking-tighter hover:text-blue-600"
                >
                  <span translate="no" className="notranslate">← Quay lại đăng nhập</span>
                </button>
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 border text-[10px] font-black rounded-lg text-center uppercase tracking-tight ${
                  (error.toString().includes('THÀNH CÔNG')) || 
                  (error.toString().includes('ĐÃ ĐƯỢC GỬI')) ||
                  (React.isValidElement(error) && (JSON.stringify(error).includes('THÀNH CÔNG') || JSON.stringify(error).includes('ĐÃ ĐƯỢC GỬI')))
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : (error.toString().includes('0907767304') || (React.isValidElement(error) && JSON.stringify(error).includes('0907767304')))
                      ? 'bg-blue-50 border-blue-100 text-blue-600'
                      : 'bg-red-50 border-red-100 text-red-600'
                }`}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'REGISTER' && !isPasswordMatch)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'LOGIN' ? (
                <><span translate="no" className="notranslate">ĐĂNG NHẬP</span> <LogIn size={16} /></>
              ) : mode === 'FORGOT' ? (
                <><span translate="no" className="notranslate">GỬI YÊU CẦU</span> <KeyRound size={16} /></>
              ) : (
                <><span translate="no" className="notranslate">XÁC NHẬN ĐĂNG KÝ</span> <UserPlus size={16} /></>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 pb-6 text-center text-[10px] text-gray-300 font-medium border-t border-gray-100 mt-auto pt-4 uppercase tracking-tighter">
          <span translate="no" className="notranslate">PHÒNG QUẢN LÝ CHẤT LƯỢNG TÂN PHÚ VIỆT NAM</span>
        </div>
      </motion.div>
    </div>
  );
}

