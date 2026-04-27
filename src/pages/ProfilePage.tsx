import React, { useState } from 'react';
import { User, Task } from '../types';
import { User as UserIcon, FileText, MessageSquare, Users, Send } from 'lucide-react';
import { getPerformanceAdvice } from '../lib/gemini';
import { formatDate } from '../lib/dateUtils';

interface ProfilePageProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
  onUpdateNote: (userId: string, note: string) => void;
}

export const ProfilePage = ({ currentUser, tasks, users, onUpdateNote }: ProfilePageProps) => {
  const [viewedUserId, setViewedUserId] = useState(currentUser.id);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  
  const user = users.find(u => u.id === viewedUserId) || currentUser;
  const myTasks = tasks.filter((t) => t.assigneeId === user.id);
  const completed = myTasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const efficiency = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng' || currentUser.role === 'Trưởng Nhóm';

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

  const startEditing = () => {
    setTempNote(user.personalNote || '');
    setIsEditingNote(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <img src={user.avatar} alt="avatar" className="w-32 h-32 rounded-3xl border-4 border-gray-50 shadow-lg object-cover" />
        <div className="text-center md:text-left flex-1 space-y-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">{user.name}</h1>
              <div className="flex items-center gap-2">
                <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  user.role === 'Admin' ? 'bg-red-100 text-red-600' : 
                  user.role === 'Trưởng Phòng' ? 'bg-indigo-100 text-indigo-600' : 
                  user.role === 'Trưởng Nhóm' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {user.role}
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {/* Manager's Note Section */}
           <div className={`p-6 rounded-2xl border transition-all ${user.personalNote ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                  <MessageSquare size={18} className="text-amber-500" />
                  LỜI NHẮC - GÓP Ý TỪ TRƯỞNG PHÒNG
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
            Hệ thống AI sẽ phân tích toàn bộ dữ liệu công việc của <span className="font-bold text-gray-700">{user.name}</span> để đưa ra đánh giá khách quan.
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
