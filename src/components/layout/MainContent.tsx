import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, Task, LogEntry, OfficialReport, DiscussionTopic, DiscussionMessage } from '../../types';
import { TasksTab } from '../tabs/TasksTab';
import { NewProposalsTab } from '../tabs/NewProposalsTab';
import { PendingApprovalTab } from '../tabs/PendingApprovalTab';
import { CompletedTasksTab } from '../tabs/CompletedTasksTab';
import { GroupChatTab } from '../tabs/GroupChatTab';
import { ProfileTab } from '../tabs/ProfileTab';
import { ReportsTab } from '../tabs/ReportsTab';
import { TrashTab } from '../tabs/TrashTab';
import { StaffListTab } from '../tabs/StaffListTab';
import { SystemHistoryTab } from '../tabs/SystemHistoryTab';
import { CategoryManagement } from '../tasks/CategoryManagement';

import { useAuthContext } from '../../contexts/AuthContext';
import { useTaskContext } from '../../contexts/TaskContext';

export const MainContent: React.FC = () => {
  const { 
    effectiveUser, currentUser, allUsers, 
    setSimulatedUser, updateProfile, deleteProfile 
  } = useAuthContext();

  const {
    activeTab, sortedTasks, tasks, viewScope, setViewScope, 
    search, setSearch, counts, setShowTaskModal,
    handleExportExcel, handleImportExcel, updateTask, deleteTask, 
    approveTaskCompletion, setShowHistoryModal, setShowChatModal,
    showChatModal, addTaskComment, updateTaskCommentReactions, 
    setEditingTask, setConfirmModal, highlightedTaskId, 
    discussionTopics, discussionMessages, sendDiscussionMessage,
    updateDiscussionMessageReactions, createTopic, updateTopic, 
    deleteTopic, deleteTopicsBulk, deleteDiscussionMessage,
    officialReports, saveReportDraft, saveOfficialReport,
    permanentDeleteTask, restoreTask, setActiveTab, unreadCounts, 
    groupUnreadCount, deleteTasksBulk, trashTasksBulk, 
    approveTasksBulk, logs, markAsRead, lastReadChatTimestamps,
    adminUnreadCount, onOpenNotifications, createNotification,
    selectedMonth, onMonthChange, sendAiMessage, triggerAiNudge, 
    resetTaskAIStatus, aiMessages, presence,
    showDirectChat, setShowDirectChat
  } = useTaskContext();

  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);
  
  const myActiveCount = counts.mine;
  const allActiveCount = counts.allActive;
  const filteredTasks = sortedTasks;
  const firebaseSaveReportDraft = saveReportDraft;
  const firebaseSaveOfficialReport = saveOfficialReport;
  const firebaseSendPrivateMsg = (recId: string, msg: string) => {}; // TODO: Add to TaskActions/Context
  const resetSystem = async () => {};
  const deleteLogsBulk = async (ids: string[]) => true;

  // Clear selection when changing tabs to prevent stale data
  React.useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTab]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const setBulkSelection = (ids: string[], select: boolean) => {
    if (select) {
      setSelectedTaskIds(prev => {
        const newIds = [...prev];
        ids.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    } else {
      setSelectedTaskIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  // Helper to map UI IDs to real Firestore Document IDs
  const getRealDocIds = (ids: string[]) => {
    const realIds = ids.map(id => {
      if (id.includes('_cycle_')) {
        return id.split('_cycle_')[0];
      }
      return id;
    });
    return Array.from(new Set(realIds));
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    const realIds = getRealDocIds(selectedTaskIds);
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">XÁC NHẬN XÓA NHIỀU</span>,
      message: (
        <span translate="no" className="notranslate">
          Bạn đang chọn XÓA {realIds.length} công việc. Hành động này sẽ chuyển các công việc vào THÙNG RÁC. Bạn có chắc chắn không?
        </span>
      ),
      onConfirm: async () => {
        try {
          await trashTasksBulk(realIds, effectiveUser.name);
          setSelectedTaskIds([]);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa.");
        } finally {
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      }
    });
  };

  const handlePermanentBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    const realIds = getRealDocIds(selectedTaskIds);
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">XÁC NHẬN XÓA VĨNH VIỄN NHIỀU</span>,
      message: (
        <span translate="no" className="notranslate">
          Bạn đang chọn XÓA VĨNH VIỄN {realIds.length} công việc. Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn không?
        </span>
      ),
      onConfirm: async () => {
        try {
          await deleteTasksBulk(realIds, effectiveUser.name);
          setSelectedTaskIds([]);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa.");
        } finally {
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      }
    });
  };

  const commonProps = {
    effectiveUser, presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
    selectedTaskIds, handleBulkDelete, handlePermanentBulkDelete, allUsers,
    updateTask, deleteTask, setShowHistoryModal, setShowChatModal, showChatModal,
    addTaskComment, updateTaskCommentReactions, setEditingTask, setConfirmModal,
    createNotification, toggleTaskSelection, setBulkSelection, setActiveTab,
    highlightedTaskId, search, setSearch,
    markAsRead, lastReadChatTimestamps,
    selectedMonth, onMonthChange, tasks,
    sendAiMessage, triggerAiNudge, resetTaskAIStatus, aiMessages
  };

  return (
    <AnimatePresence mode="wait">
      {activeTab === "pending_confirmation" && (
        <NewProposalsTab 
          {...commonProps}
          tasks={tasks}
          approveTasksBulk={approveTasksBulk}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "tasks" && (
        <TasksTab 
          {...commonProps}
          filteredTasks={filteredTasks}
          viewScope={viewScope}
          setViewScope={setViewScope}
          myActiveCount={myActiveCount}
          allActiveCount={allActiveCount}
          sortedTasks={sortedTasks}
          search={search}
          setSearch={setSearch}
          handleExportExcel={handleExportExcel}
          handleImportExcel={handleImportExcel}
          approveTaskCompletion={approveTaskCompletion}
        />
      )}

      {activeTab === "pending_approval" && (
        <PendingApprovalTab 
          {...commonProps}
          sortedTasks={sortedTasks}
          approveTaskCompletion={approveTaskCompletion}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "completed_tasks" && (
        <CompletedTasksTab 
          {...commonProps}
          viewScope={viewScope}
          setViewScope={setViewScope}
          tasks={tasks}
          filteredTasks={filteredTasks}
          approveTaskCompletion={approveTaskCompletion}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "group_chat" && (
        <GroupChatTab 
          effectiveUser={effectiveUser}
          allUsers={allUsers}
          discussionTopics={discussionTopics}
          discussionMessages={discussionMessages}
          sendDiscussionMessage={sendDiscussionMessage}
          updateDiscussionMessageReactions={updateDiscussionMessageReactions}
          createTopic={createTopic}
          updateTopic={updateTopic}
          deleteTopic={deleteTopic}
          deleteTopicsBulk={deleteTopicsBulk}
          deleteDiscussionMessage={deleteDiscussionMessage}
          presence={presence}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
        />
      )}

      {activeTab === "profile" && (
        <ProfileTab 
          effectiveUser={effectiveUser}
          tasks={tasks}
          allUsers={allUsers}
          updateProfile={updateProfile}
          presence={presence}
        />
      )}

      {activeTab === "reports" && (
        <ReportsTab 
          effectiveUser={effectiveUser}
          tasks={tasks}
          allUsers={allUsers}
          updateTask={updateTask}
          officialReports={officialReports}
          firebaseSaveReportDraft={firebaseSaveReportDraft}
          firebaseSaveOfficialReport={firebaseSaveOfficialReport}
          presence={presence}
        />
      )}

      {activeTab === "category_management" && effectiveUser?.role === "Admin" && (
        <motion.div key="category_management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <CategoryManagement tasks={tasks} />
        </motion.div>
      )}

      {activeTab === "trash" && (effectiveUser?.role === "Admin" || effectiveUser?.role === "Staff") && (
        <TrashTab 
          {...commonProps}
          sortedTasks={sortedTasks}
          permanentDeleteTask={permanentDeleteTask}
          restoreTask={restoreTask}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "staff_list" && (effectiveUser?.role === "Admin") && (
        <StaffListTab 
          effectiveUser={effectiveUser}
          currentUser={currentUser}
          presence={presence}
          unreadCounts={unreadCounts}
          groupUnreadCount={groupUnreadCount}
          allUsers={allUsers}
          setSimulatedUser={setSimulatedUser}
          firebaseSendPrivateMsg={firebaseSendPrivateMsg}
          discussionTopics={discussionTopics}
          sendDiscussionMessage={sendDiscussionMessage}
          updateProfile={updateProfile}
          deleteProfile={deleteProfile}
          setActiveTab={setActiveTab}
          setShowDirectChat={setShowDirectChat}
        />
      )}

      {activeTab === "system_history" && effectiveUser?.role === "Admin" && (
        <SystemHistoryTab 
          effectiveUser={effectiveUser}
          presence={presence}
          logs={logs}
          allUsers={allUsers}
          tasks={tasks}
          resetSystem={resetSystem}
          deleteLogsBulk={deleteLogsBulk}
          setConfirmModal={setConfirmModal}
        />
      )}
    </AnimatePresence>
  );
};

