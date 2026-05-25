import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Task, OfficialReport } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { ReportPage } from '../../pages/ReportPage';
import { Settings } from 'lucide-react';

interface ReportsTabProps {
  effectiveUser: User;
  tasks: Task[];
  allUsers: User[];
  updateTask: any;
  officialReports: OfficialReport[];
  firebaseSaveReportDraft: any;
  firebaseSaveOfficialReport: any;
  presence: any[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  effectiveUser, tasks, allUsers, updateTask, officialReports,
  firebaseSaveReportDraft, firebaseSaveOfficialReport, presence
}) => {
  const [activeTab, setActiveTab ] = useState<'dept' | 'staff' | 'config'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('report_tab');
      if (urlTab === 'dept' || urlTab === 'staff' || urlTab === 'config') {
        return urlTab as 'dept' | 'staff' | 'config';
      }
    }
    return 'dept';
  });

  const isLNT = effectiveUser.name === 'Lê Nhật Trường';
  const isReportManager = effectiveUser.role === 'Admin' || 
                          isLNT || 
                          (effectiveUser.title || '').toUpperCase().includes('TRƯỞNG PHÒNG') ||
                          effectiveUser.personalEmail === 'lenhattruong.tpp@gmail.com' ||
                          effectiveUser.personalEmail === 'lenhattruong.caphef1@gmail.com';

  return (
    <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <Header title={<span translate="no" className="notranslate">BÁO CÁO THÁNG</span>} onlineUsers={presence} currentUserId={effectiveUser.id}>
        {isReportManager && (
          <button
            onClick={() => setActiveTab(activeTab === 'config' ? 'dept' : 'config')}
            className={`h-10 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border shadow-sm ${
              activeTab === 'config'
                ? 'bg-amber-600 border-amber-500 text-white hover:bg-amber-700'
                : 'bg-slate-900 border-slate-800 text-white hover:bg-black'
            }`}
          >
            <Settings size={14} strokeWidth={2.5} />
            Cấu hình phân bổ
          </button>
        )}
      </Header>
      <ReportPage 
        tasks={tasks}
        users={allUsers}
        onUpdateTask={updateTask}
        currentUser={effectiveUser}
        officialReports={officialReports}
        onSaveDraft={firebaseSaveReportDraft}
        onSaveOfficialReport={firebaseSaveOfficialReport}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </motion.div>
  );
};
