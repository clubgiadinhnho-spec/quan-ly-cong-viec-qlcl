import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, Task, LogEntry, OfficialReport, DiscussionTopic, DiscussionMessage, TaskCategory } from '../../types';
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
import { PermissionMatrixTab } from '../tabs/PermissionMatrixTab';
import { CategoryManagement } from '../tasks/CategoryManagement';
import { OfficeUtilitiesTab } from '../tabs/OfficeUtilitiesTab';

import { useAuthContext } from '../../contexts/AuthContext';
import { useTaskContext } from '../../contexts/TaskContext';

export const MainContent: React.FC = () => {
  const { 
    effectiveUser, currentUser, allUsers, 
    setSimulatedUser, updateProfile, deleteProfile 
  } = useAuthContext();

  const {
    activeTab, sortedTasks, tasks, viewScope, setViewScope, 
    search, setSearch, counts, setShowTaskModal, categories,
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
    rawTrashTasksBulk, rawDeleteTasksBulk,
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

  const isAdminUser = effectiveUser?.role === 'Admin' || 
    effectiveUser?.email === 'truong.le@tanphuvietnam.vn' || 
    effectiveUser?.email === 'lenhattruong.tpp@gmail.com' ||
    effectiveUser?.id === 'lenhattruong.tpp@gmail.com';

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    
    if (selectedTaskIds.length > 5) {
      setConfirmModal({
        show: true,
        title: <span translate="no" className="notranslate font-black uppercase text-red-600">LỖI THAO TÁC</span>,
        message: (
          <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <p className="text-white font-black text-lg uppercase leading-tight">
              <span translate="no" className="notranslate">CHỈ ĐƯỢC PHÉP CHỌN TỐI ĐA 5 CÔNG VIỆC ĐỂ XÓA MỖI LẦN!</span>
            </p>
          </div>
        ) as any,
        confirmText: <span translate="no" className="notranslate text-white font-black">ĐÃ HIỂU</span>,
        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
        isAlert: true
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black uppercase">XÁC NHẬN XÓA NHÓM</span>,
      message: <span translate="no" className="notranslate">{`Bạn có chắc chắn muốn CHUYỂN ${selectedTaskIds.length} công việc đã chọn VÀO THÙNG RÁC không?`}</span>,
      onConfirm: async () => {
        const realIds = getRealDocIds(selectedTaskIds);
        try {
          await rawTrashTasksBulk(realIds, effectiveUser?.name);
          setSelectedTaskIds([]);
          setConfirmModal((p: any) => p ? { ...p, show: false } : p);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa.");
        }
      }
    });
  };

  const handlePermanentBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    
    if (selectedTaskIds.length > 5) {
      setConfirmModal({
        show: true,
        title: <span translate="no" className="notranslate font-black uppercase text-red-600">LỖI THAO TÁC</span>,
        message: (
          <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <p className="text-white font-black text-lg uppercase leading-tight">
              <span translate="no" className="notranslate">CHỈ ĐƯỢC PHÉP CHỌN TỐI ĐA 5 CÔNG VIỆC ĐỂ XÓA VĨNH VIỄN!</span>
            </p>
          </div>
        ) as any,
        confirmText: <span translate="no" className="notranslate text-white font-black">ĐÃ HIỂU</span>,
        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
        isAlert: true
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black uppercase text-red-600">XÁC NHẬN XÓA VĨNH VIỄN</span>,
      message: (
         <div className="text-center space-y-2">
            <p className="notranslate font-bold text-red-700 uppercase">CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN {selectedTaskIds.length} mục và KHÔNG THỂ KHÔI PHỤC!</p>
            <p className="notranslate">Bạn có chắc chắn muốn tiếp tục?</p>
         </div>
      ) as any,
      onConfirm: async () => {
        const realIds = getRealDocIds(selectedTaskIds);
        try {
          await rawDeleteTasksBulk(realIds, effectiveUser?.name);
          setSelectedTaskIds([]);
          setConfirmModal((p: any) => p ? { ...p, show: false } : p);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa vĩnh viễn.");
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
    sendAiMessage, triggerAiNudge, resetTaskAIStatus, aiMessages,
    handleImportExcel
  };

  return (
    <AnimatePresence mode="wait">
      {activeTab === "pending_confirmation" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.newProposals_view !== false) && (
        <NewProposalsTab 
          {...commonProps}
          tasks={tasks}
          approveTasksBulk={approveTasksBulk}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "tasks" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.tasks_view !== false) && (
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

      {activeTab === "pending_approval" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.pendingApproval_view !== false) && (
        <PendingApprovalTab 
          {...commonProps}
          sortedTasks={sortedTasks}
          approveTaskCompletion={approveTaskCompletion}
          handleExportExcel={handleExportExcel}
        />
      )}

      {activeTab === "completed_tasks" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.completedTasks_view !== false) && (
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
          categories={categories}
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

      {activeTab === "category_management" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.canManageCategories) && (
        <motion.div key="category_management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <CategoryManagement tasks={tasks} setConfirmModal={setConfirmModal} />
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

      {activeTab === "staff_list" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.canManageStaff) && (
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
          setConfirmModal={setConfirmModal}
          setActiveTab={setActiveTab}
          setShowDirectChat={setShowDirectChat}
        />
      )}

      {activeTab === "system_history" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.canViewSystemHistory) && (
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

      {activeTab === "permission_matrix" && (effectiveUser?.role === "Admin" || effectiveUser?.delegatedPermissions?.canManageStaff) && (
        <PermissionMatrixTab
          effectiveUser={effectiveUser}
          presence={presence}
          allUsers={allUsers}
          updateProfile={updateProfile}
          setConfirmModal={setConfirmModal}
        />
      )}

      {["office_calendar", "attendance", "leave_request", "birthday"].includes(activeTab) && (
        <OfficeUtilitiesTab
          activeTab={activeTab as any}
          effectiveUser={effectiveUser}
          allUsers={allUsers}
          presence={presence}
          setConfirmModal={setConfirmModal}
          setActiveTab={setActiveTab}
        />
      )}
    </AnimatePresence>
  );
};

