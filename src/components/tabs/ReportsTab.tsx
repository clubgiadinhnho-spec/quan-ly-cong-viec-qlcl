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
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
           <span className="text-4xl text-blue-600">🔄</span>
        </div>
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-4">
          <span translate="no" className="notranslate">HỆ THỐNG ĐANG CẬP NHẬT BỘ MÃ 2026...</span>
        </h2>
        <p className="max-w-md text-gray-500 font-medium leading-relaxed">
          <span translate="no" className="notranslate">
            Vui lòng quay lại sau khi "Chiến dịch tái cấu trúc" hoàn tất. Anh Trường đang gộp mã để tối ưu hóa hiệu suất báo cáo.
          </span>
        </p>
      </div>
    </motion.div>
  );
};
