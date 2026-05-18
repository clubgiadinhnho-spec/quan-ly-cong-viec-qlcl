import React from 'react';
import { motion } from 'motion/react';
import { User, DiscussionTopic } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { StaffListPage } from '../../pages/StaffListPage';

interface StaffListTabProps {
  effectiveUser: User;
  currentUser: User | null;
  presence: any[];
  unreadCounts: Record<string, number>;
  groupUnreadCount: number;
  allUsers: User[];
  setSimulatedUser: (u: User | null) => void;
  firebaseSendPrivateMsg: any;
  discussionTopics: DiscussionTopic[];
  sendDiscussionMessage: any;
  updateProfile: any;
  deleteProfile: any;
  setConfirmModal: (m: any) => void;
  setActiveTab: (tab: string) => void;
  setShowDirectChat: (u: User | null) => void;
}

export const StaffListTab: React.FC<StaffListTabProps> = ({
  effectiveUser, currentUser, presence, unreadCounts, groupUnreadCount,
  allUsers, setSimulatedUser, firebaseSendPrivateMsg, discussionTopics,
  sendDiscussionMessage, updateProfile, deleteProfile, setConfirmModal, setActiveTab, setShowDirectChat
}) => {
  return (
    <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <Header title={<span translate="no" className="notranslate">QUẢN LÝ NHÂN SỰ</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
      <div className="p-8">
        <StaffListPage
          onNavigate={setActiveTab} onOpenDirectChat={setShowDirectChat}
          unreadCount={(Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0) + (groupUnreadCount as number)}
          users={allUsers} currentUser={effectiveUser} originalUser={currentUser} onSimulateStaff={setSimulatedUser}
          onSendToUser={async (msg, targetId, attachments) => {
            await firebaseSendPrivateMsg(msg, effectiveUser.id, targetId, attachments);
          }}
          onSendToGroup={async (msg, attachments) => {
            const topic = discussionTopics.find(t => t.status === 'OPEN');
            if (topic) await sendDiscussionMessage(topic.id, msg, effectiveUser.id, attachments);
          }}
          onAddStaff={(user) => updateProfile(user.uniqueKey, user)}
          onUpdateStaff={(userId, updates) => {
            const staff = allUsers.find(u => u.id === userId || u.uniqueKey === userId);
            if (staff) updateProfile(staff.uniqueKey, updates);
            else updateProfile(userId, updates);
          }}
          onDeleteStaff={(userId) => {
            const staff = allUsers.find(u => u.id === userId);
            if (staff) {
              setConfirmModal({
                show: true,
                title: "XÁC NHẬN XÓA NHÂN VIÊN",
                message: `Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ của nhân viên [${staff.name}] không? Hành động này không thể hoàn tác.`,
                onConfirm: async () => {
                  await deleteProfile(staff.uniqueKey);
                  setConfirmModal((p: any) => p ? { ...p, show: false } : p);
                }
              });
            }
          }}
        />
      </div>
    </motion.div>
  );
};
