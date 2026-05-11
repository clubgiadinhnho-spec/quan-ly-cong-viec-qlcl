import React from 'react';
import { motion } from 'motion/react';
import { User, Task, OfficialReport } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { ReportPage } from '../../pages/ReportPage';

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
  return (
    <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <Header title={<span translate="no" className="notranslate">BÁO CÁO THÁNG</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
      <div className="p-4">
        <ReportPage
          tasks={tasks} users={allUsers} onUpdateTask={updateTask} currentUser={effectiveUser!}
          officialReports={officialReports} onSaveDraft={firebaseSaveReportDraft} onSaveOfficialReport={firebaseSaveOfficialReport}
        />
      </div>
    </motion.div>
  );
};
