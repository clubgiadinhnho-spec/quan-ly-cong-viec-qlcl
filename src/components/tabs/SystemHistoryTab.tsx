import React from 'react';
import { motion } from 'motion/react';
import { User, LogEntry, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { SystemHistoryPage } from '../../pages/SystemHistoryPage';

interface SystemHistoryTabProps {
  effectiveUser: User;
  presence: any[];
  logs: LogEntry[];
  allUsers: User[];
  tasks: Task[];
  resetSystem: () => Promise<void>;
  deleteLogsBulk: (logIds: string[]) => Promise<boolean>;
  setConfirmModal: (m: any) => void;
}

export const SystemHistoryTab: React.FC<SystemHistoryTabProps> = ({
  effectiveUser, presence, logs, allUsers, tasks, resetSystem,
  deleteLogsBulk, setConfirmModal
}) => {
  return (
    <motion.div key="system_history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <Header title={<span translate="no" className="notranslate">LỊCH SỬ HỆ THỐNG</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
      <div className="p-4">
        <SystemHistoryPage 
          logs={logs} 
          allUsers={allUsers} 
          currentUser={effectiveUser!} 
          tasks={tasks}
          onResetSystem={() => resetSystem()}
          onDeleteLogsBulk={deleteLogsBulk}
          setConfirmModal={setConfirmModal}
        />
      </div>
    </motion.div>
  );
};
