import React from 'react';
import { motion } from 'motion/react';
import { User, Task, TaskCategory } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { ProfilePage } from '../../pages/ProfilePage';

interface ProfileTabProps {
  effectiveUser: User;
  tasks: Task[];
  allUsers: User[];
  updateProfile: any;
  presence: any[];
  categories: TaskCategory[];
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  effectiveUser, tasks, allUsers, updateProfile, presence, categories
}) => {
  return (
    <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <Header title={<span translate="no" className="notranslate">TRANG CÁ NHÂN</span>} badge={effectiveUser.code} onlineUsers={presence} currentUserId={effectiveUser.id} />
      <div className="p-4">
        <ProfilePage currentUser={effectiveUser} tasks={tasks} users={allUsers} categories={categories} onUpdateProfile={(uniqueKey, updates) => updateProfile(uniqueKey, updates)} />
      </div>
    </motion.div>
  );
};
