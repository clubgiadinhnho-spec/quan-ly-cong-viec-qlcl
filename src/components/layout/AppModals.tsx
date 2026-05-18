import React from 'react';
import { User, Task, TaskCategory, DiscussionTopic } from '../../types';
import { TaskModal } from '../tasks/TaskModal';
import { HistoryModal } from '../tasks/HistoryModal';
import { DirectChat } from '../tasks/DirectChat';
import { ConfirmModal } from '../common/ConfirmModal';
import { HealthReminder } from '../common/HealthReminder';

interface AppModalsProps {
  showTaskModal: boolean;
  setShowTaskModal: (show: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  updateTask: any;
  baseAddTask: any;
  allUsers: User[];
  tasks: Task[];
  effectiveUser: User | null;
  categories: TaskCategory[];
  showHistoryModal: string | null;
  setShowHistoryModal: (id: string | null) => void;
  showDirectChat: User | null;
  setShowDirectChat: (u: User | null) => void;
  isChatMinimized: boolean;
  setIsChatMinimized: (m: boolean) => void;
  privateMessages: any[];
  firebaseSendPrivateMsg: any;
  handleJumpToTask: (id: string) => void;
  confirmModal: { show: boolean; title: any; message: any; onConfirm: () => void };
  setConfirmModal: (m: any) => void;
  showHealthReminder: boolean;
  setShowHealthReminder: (show: boolean) => void;
  currentUser: User | null;
}

export const AppModals: React.FC<AppModalsProps> = ({
  showTaskModal, setShowTaskModal, editingTask, setEditingTask, updateTask, baseAddTask,
  allUsers, tasks, effectiveUser, categories, showHistoryModal, setShowHistoryModal,
  showDirectChat, setShowDirectChat, isChatMinimized, setIsChatMinimized,
  privateMessages, firebaseSendPrivateMsg, handleJumpToTask,
  confirmModal, setConfirmModal, showHealthReminder, setShowHealthReminder, currentUser
}) => {
  return (
    <>
      {(showTaskModal || editingTask) && (
        <TaskModal 
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }} 
          onSave={editingTask ? (data: any) => updateTask(editingTask.id, data) : baseAddTask} 
          users={allUsers} 
          tasks={tasks}
          task={editingTask || undefined} 
          currentUser={effectiveUser!} 
          categories={categories}
        />
      )}
      
      {showHistoryModal && (
        <HistoryModal 
          taskId={showHistoryModal} 
          tasks={tasks} 
          users={allUsers} 
          onClose={() => setShowHistoryModal(null)} 
        />
      )}
      
      {showDirectChat && (
        <DirectChat 
          variant="bubble" 
          isMinimized={isChatMinimized} 
          onMinimizeChange={setIsChatMinimized} 
          currentUser={effectiveUser!} 
          otherUser={allUsers.find(u => u.id === showDirectChat.id) || showDirectChat} 
          messages={privateMessages} 
          onSendMessage={firebaseSendPrivateMsg} 
          onClose={() => setShowDirectChat(null)} 
          onReact={(msgId, emoji) => {/* Logic react */}} 
          allUsers={allUsers}
          onJumpToTask={handleJumpToTask}
        />
      )}
      
      <ConfirmModal 
        show={confirmModal?.show || false} 
        title={confirmModal?.title || ""} 
        message={confirmModal?.message || ""} 
        onConfirm={confirmModal?.onConfirm || (() => {})} 
        onClose={() => setConfirmModal((p: any) => ({ ...p, show: false }))} 
        confirmText={(confirmModal as any)?.confirmText}
        isAlert={(confirmModal as any)?.isAlert}
      />
      
      {showHealthReminder && currentUser?.reminderSettings && (
        <HealthReminder 
          settings={currentUser.reminderSettings} 
          onClose={() => setShowHealthReminder(false)} 
        />
      )}
    </>
  );
};
