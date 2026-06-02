import React, { useState, useEffect } from 'react';
import { Task, User } from '../../types';
import { TaskRow } from './TaskRow';
import { CompletedTaskRow } from './CompletedTaskRow';

interface TaskListProps {
  tasks: Task[];
  user: User;
  users: User[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  showChatModal: string | null;
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onEdit?: (task: Task) => void;
  setConfirmModal: (modal: any) => void;
  onApprove?: (id: string) => void;
  approveTaskCompletion?: (id: string, modifierName?: string, leaderQCD?: any, stopRecurrence?: boolean) => Promise<void>;
  onNavigate?: (tab: string) => void;
  type: 'active' | 'completed' | 'trash';
  isReadOnly?: boolean;
  isUpdateReadOnly?: boolean;
  highlightedTaskId?: string | null;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onBulkSelect?: (ids: string[], select: boolean) => void;
  createNotification?: any;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  sendAiMessage?: any;
  triggerAiNudge?: any;
  resetTaskAIStatus?: any;
  aiMessages?: any[];
  presence?: any[];
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  user, 
  users, 
  onUpdate, 
  onDelete, 
  onViewHistory, 
  onOpenChat, 
  showChatModal,
  onSendMessage,
  onReact,
  onEdit = () => {},
  setConfirmModal,
  onApprove,
  approveTaskCompletion,
  onNavigate,
  type,
  isReadOnly = false,
  isUpdateReadOnly = false,
  onRestore,
  highlightedTaskId,
  selectedIds = [],
  onToggleSelect,
  onBulkSelect,
  createNotification,
  markAsRead,
  lastReadChatTimestamps,
  sendAiMessage,
  triggerAiNudge,
  resetTaskAIStatus,
  aiMessages,
  presence
}) => {
  // THIẾT QUÂN LUẬT: Trì hoãn luân hồi ổn định bộ sắp xếp - 3 phút
  const [stableSortTimes, setStableSortTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const now = Date.now();
    const COOLDOWN_MS = 3 * 60 * 1000;

    setStableSortTimes(prev => {
      const next = { ...prev };
      let changed = false;

      tasks.forEach(t => {
        let realTime = new Date(t.lastActionAt || t.updatedAt || 0).getTime();
        if (isNaN(realTime)) {
          realTime = 0;
        }
        const stableTime = prev[t.id];

        if (stableTime === undefined) {
          next[t.id] = realTime;
          changed = true;
        } else if (realTime > stableTime) {
          if (now - realTime > COOLDOWN_MS) {
            next[t.id] = realTime;
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [tasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const COOLDOWN_MS = 3 * 60 * 1000;

      setStableSortTimes(prev => {
        const next = { ...prev };
        let changed = false;

        tasks.forEach(t => {
          const realTime = new Date(t.lastActionAt || t.updatedAt || 0).getTime();
          const stableTime = prev[t.id] || 0;

          if (realTime > stableTime && (now - realTime >= COOLDOWN_MS)) {
            next[t.id] = realTime;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [tasks]);

  const sortedTasks = [...tasks].sort((a, b) => {
    // Lớp 1 (Ưu tiên tuyệt đối): Priority Order (1 -> 2 -> 3...)
    if (a.priorityOrder && !b.priorityOrder) return -1;
    if (b.priorityOrder && !a.priorityOrder) return 1;
    if (a.priorityOrder && b.priorityOrder) return a.priorityOrder - b.priorityOrder;

    // Lớp đặc biệt: Phê duyệt (Dành cho cấp quản lý xác nhận lính mới)
    if (a.status === 'AWAITING_CONFIRMATION' && b.status !== 'AWAITING_CONFIRMATION') return -1;
    if (b.status === 'AWAITING_CONFIRMATION' && a.status !== 'AWAITING_CONFIRMATION') return 1;

    // Lớp 2 (Hoạt động mới nhất): Dựa trên lastActionAt hoặc updatedAt (Bảo hộ TRÌ HOÃN LUÂN HỒI 3 PHÚT)
    const timeA = stableSortTimes[a.id] || new Date(a.lastActionAt || a.updatedAt || 0).getTime();
    const timeB = stableSortTimes[b.id] || new Date(b.lastActionAt || b.updatedAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    // Lớp cuối: Mã công việc (Mới nhất lên trên)
    return b.code.localeCompare(a.code);
  });

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const taskData = tasks.find(t => t.id === id);
    if (!taskData) return;

    // Handle priority shifting when a task is completed
    if (updates.status === 'COMPLETED' && taskData.priorityOrder) {
      const removedOrder = taskData.priorityOrder;
      
      // Update the completed task first
      onUpdate(id, { ...updates, priorityOrder: null as any });
      
      // Shift all others up
      tasks.forEach(t => {
        if (t.priorityOrder && t.id !== id && t.priorityOrder > removedOrder) {
          onUpdate(t.id, { priorityOrder: t.priorityOrder - 1 });
        }
      });
      return;
    }

    onUpdate(id, updates);
  };

  const handleSetPriority = (taskId: string, order: number | null) => {
    const taskData = tasks.find(t => t.id === taskId);
    if (!taskData) return;

    const oldOrder = taskData.priorityOrder;

    if (order === null) {
      // Removing priority
      if (oldOrder) {
        onUpdate(taskId, { priorityOrder: null as any });
        tasks.forEach(t => {
          if (t.priorityOrder && t.id !== taskId && t.priorityOrder > oldOrder) {
            onUpdate(t.id, { priorityOrder: t.priorityOrder - 1 });
          }
        });
      }
    } else {
      // Setting a new priority (could be reordering or new assignment)
      onUpdate(taskId, { priorityOrder: order as any });
    }
  };

  const handleTogglePriority = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.priorityOrder) {
      handleSetPriority(taskId, null);
    } else {
      const maxOrder = tasks.reduce((max, t) => (t.priorityOrder || 0) > max ? (t.priorityOrder || 0) : max, 0);
      handleSetPriority(taskId, maxOrder + 1);
    }
  };

  return (
    <div className="border border-gray-300 rounded-md bg-white shadow-sm overflow-visible">
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block">
        <table className="w-full text-left border-collapse table-fixed min-w-full print-table">
          <thead>
            <tr className="bg-blue-600 h-12">
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider w-[40px] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                 <input 
                   type="checkbox"
                   className="w-3.5 h-3.5 rounded-sm border-blue-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                   checked={tasks.length > 0 && selectedIds.length === tasks.length}
                   onChange={(e) => {
                     if (onBulkSelect) {
                       onBulkSelect(tasks.map(t => t.id), e.target.checked);
                     } else {
                       if (e.target.checked) {
                         tasks.forEach(t => {
                           if (!selectedIds.includes(t.id)) onToggleSelect?.(t.id);
                         });
                       } else {
                         tasks.forEach(t => {
                           if (selectedIds.includes(t.id)) onToggleSelect?.(t.id);
                         });
                       }
                     }
                   }}
                 />
              </th>
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider w-[9%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                <span translate="no" className="notranslate">Mã</span>
              </th>
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider w-[20%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                <span translate="no" className="notranslate">Nhân sự</span>
              </th>
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] w-[35%] align-middle">
                <span translate="no" className="notranslate">Nội dung & Mục tiêu</span>
              </th>
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider w-[24%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                <span translate="no" className="notranslate">Cập nhật</span>
              </th>
              <th className="p-3 text-[14px] font-black text-white uppercase tracking-tighter w-[6%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                <span translate="no" className="notranslate">ƯU TIÊN</span>
              </th>
              <th className="p-3 text-[13px] font-black text-white uppercase tracking-wider w-[6%] text-center border-blue-700 bg-blue-600 sticky top-0 z-[50] align-middle">
                <span translate="no" className="notranslate">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTasks.map((task, idx) => (
              type === 'trash' ? (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  tasks={tasks}
                  user={user} 
                  users={users} 
                  idx={idx}
                  onUpdate={handleUpdateTask}
                  onDelete={onDelete}
                  onViewHistory={onViewHistory}
                  onOpenChat={onOpenChat}
                  isChatOpen={showChatModal === task.id}
                  onSendMessage={onSendMessage}
                  onReact={onReact}
                  onEdit={onEdit}
                  onSetPriority={handleSetPriority}
                  setConfirmModal={setConfirmModal}
                  onTogglePriority={handleTogglePriority}
                  isReadOnly={isReadOnly}
                  isUpdateReadOnly={isUpdateReadOnly}
                  onRestore={onRestore}
                  onApprove={onApprove}
                  approveTaskCompletion={approveTaskCompletion}
                  onNavigate={onNavigate}
                  highlightedTaskId={highlightedTaskId}
                  isSelected={selectedIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                  createNotification={createNotification}
                  markAsRead={markAsRead}
                  lastReadChatTimestamps={lastReadChatTimestamps}
                  presence={presence}
                />
              ) : type === 'active' ? (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  tasks={tasks}
                  user={user} 
                  users={users} 
                  idx={idx}
                  onUpdate={handleUpdateTask}
                  onDelete={onDelete}
                  onViewHistory={onViewHistory}
                  onOpenChat={onOpenChat}
                  isChatOpen={showChatModal === task.id}
                  onSendMessage={onSendMessage}
                  onReact={onReact}
                  onEdit={onEdit}
                  onSetPriority={handleSetPriority}
                  setConfirmModal={setConfirmModal}
                  onTogglePriority={handleTogglePriority}
                  onApprove={onApprove}
                  approveTaskCompletion={approveTaskCompletion}
                  sendAiMessage={sendAiMessage}
                  triggerAiNudge={triggerAiNudge}
                  resetTaskAIStatus={resetTaskAIStatus}
                  aiMessages={aiMessages}
                  onNavigate={onNavigate}
                  isReadOnly={isReadOnly}
                  isUpdateReadOnly={isUpdateReadOnly}
                  highlightedTaskId={highlightedTaskId}
                  isSelected={selectedIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                  createNotification={createNotification}
                  markAsRead={markAsRead}
                  lastReadChatTimestamps={lastReadChatTimestamps}
                  presence={presence}
                />
              ) : (
                <CompletedTaskRow 
                  key={task.id}
                  task={task}
                  user={user}
                  users={users}
                  idx={idx}
                  onViewHistory={onViewHistory}
                  onOpenChat={onOpenChat}
                  isChatOpen={showChatModal === task.id}
                  onSendMessage={onSendMessage}
                  onReact={onReact}
                  onUndo={(id) => {
                    const isCycle = id.includes('_cycle_');
                    const taskToUndo = tasks.find(t => t.id === id);
                    
                    if (!taskToUndo) return;

                    // Guard for recurring tasks
                    const isRecurringTask = taskToUndo.recurrence && taskToUndo.recurrence !== 'NONE' && taskToUndo.recurrence !== 'KHÔNG LẶP';
                    if (isRecurringTask) {
                      setConfirmModal({
                        show: true,
                        title: <span translate="no" className="notranslate">LỖI THAO TÁC</span>,
                        message: (
                          <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                            <p className="text-white font-black text-lg uppercase leading-tight">
                              <span translate="no" className="notranslate">ĐÂY LÀ CÔNG VIỆC ĐỊNH KỲ ĐÃ PHÁT SINH KỲ MỚI, KHÔNG THỂ HOÀN TÁC ĐỂ TRÁNH TRÙNG LẶP MÃ SỐ!</span>
                            </p>
                          </div>
                        ),
                        confirmText: <span translate="no" className="notranslate">ĐÃ HIỂU</span>,
                        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
                        isAlert: true
                      });
                      return;
                    }

                    const realId = isCycle ? id.split('_cycle_')[0] : id;

                    setConfirmModal({
                      show: true,
                      title: <span translate="no" className="notranslate">XÁC NHẬN HOÀN TÁC</span>,
                      message: (
                        <span translate="no" className="notranslate">
                          {isCycle 
                            ? `Bạn muốn hoàn tác kỳ hoàn thành này? Công việc sẽ quay lại mục TRÌNH DUYỆT HOÀN THÀNH.`
                            : `Bạn muốn hoàn tác công việc này? Công việc sẽ quay lại mục TRÌNH DUYỆT HOÀN THÀNH.`}
                        </span>
                      ),
                      onConfirm: () => {
                        const updates: Partial<Task> = { 
                           status: 'APPROVED', 
                          waitingApproval: true,
                          actualEndDate: null as any, 
                          isLocked: false, 
                          isNewInBoard: true,
                          requestUndo: null as any,
                          lastActionAt: new Date().toISOString(),
                          waitingApprovalAt: new Date().toISOString(),
                        };

                        if (isCycle && taskToUndo.cycleHistory) {
                          const version = parseInt(id.split('_cycle_')[1], 10);
                          const cycleEntry = taskToUndo.cycleHistory.find(h => h.version === version);
                          
                          // Remove this cycle from history
                          updates.cycleHistory = taskToUndo.cycleHistory.filter(h => h.version !== version);
                          
                          // Restore report content, objective and CODE from the cycle being undone
                          if (cycleEntry) {
                            updates.currentUpdate = cycleEntry.reportContent;
                            if (cycleEntry.objective) {
                              updates.objective = cycleEntry.objective;
                            }
                            
                            // Restore code - no more -K suffix
                            updates.code = cycleEntry.code || taskToUndo.code;
                          }
                        }

                        onUpdate(realId, updates);
                        setConfirmModal((p: any) => ({ ...p, show: false }));
                        if (onNavigate) onNavigate('pending_approval');
                      }
                    });
                  }}
                  onUpdate={(id, updates) => {
                    const realId = id.includes('_cycle_') ? id.split('_cycle_')[0] : id;
                    onUpdate(realId, updates);
                  }}
                  onSetPriority={handleSetPriority}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isSelected={selectedIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                  setConfirmModal={setConfirmModal}
                  markAsRead={markAsRead}
                  lastReadChatTimestamps={lastReadChatTimestamps}
                />
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block md:hidden bg-slate-50/50 p-2 space-y-4">
        <div className="flex flex-col gap-3">
          {sortedTasks.map((task, idx) => (
            type === 'trash' ? (
              <TaskRow 
                isMobileCard={true}
                key={`mob-${task.id}`} 
                task={task} 
                tasks={tasks}
                user={user} 
                users={users} 
                idx={idx}
                onUpdate={handleUpdateTask}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                onSetPriority={handleSetPriority}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                isReadOnly={isReadOnly}
                isUpdateReadOnly={isUpdateReadOnly}
                onRestore={onRestore}
                onApprove={onApprove}
                approveTaskCompletion={approveTaskCompletion}
                onNavigate={onNavigate}
                highlightedTaskId={highlightedTaskId}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                createNotification={createNotification}
                markAsRead={markAsRead}
                lastReadChatTimestamps={lastReadChatTimestamps}
                presence={presence}
              />
            ) : type === 'active' ? (
              <TaskRow 
                isMobileCard={true}
                key={`mob-${task.id}`} 
                task={task} 
                tasks={tasks}
                user={user} 
                users={users} 
                idx={idx}
                onUpdate={handleUpdateTask}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                onSetPriority={handleSetPriority}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                onApprove={onApprove}
                approveTaskCompletion={approveTaskCompletion}
                sendAiMessage={sendAiMessage}
                triggerAiNudge={triggerAiNudge}
                resetTaskAIStatus={resetTaskAIStatus}
                aiMessages={aiMessages}
                onNavigate={onNavigate}
                isReadOnly={isReadOnly}
                isUpdateReadOnly={isUpdateReadOnly}
                highlightedTaskId={highlightedTaskId}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                createNotification={createNotification}
                markAsRead={markAsRead}
                lastReadChatTimestamps={lastReadChatTimestamps}
                presence={presence}
              />
            ) : (
              <CompletedTaskRow 
                isMobileCard={true}
                key={`mob-${task.id}`}
                task={task}
                user={user}
                users={users}
                idx={idx}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onUndo={(id) => {
                  const isCycle = id.includes('_cycle_');
                  const taskToUndo = tasks.find(t => t.id === id);
                  
                  if (!taskToUndo) return;

                  // Guard for recurring tasks
                  const isRecurringTask = taskToUndo.recurrence && taskToUndo.recurrence !== 'NONE' && taskToUndo.recurrence !== 'KHÔNG LẶP';
                  if (isRecurringTask) {
                    setConfirmModal({
                      show: true,
                      title: <span translate="no" className="notranslate">LỖI THAO TÁC</span>,
                      message: (
                        <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                          <p className="text-white font-black text-lg uppercase leading-tight">
                            <span translate="no" className="notranslate">ĐÂY LÀ CÔNG VIỆC ĐỊNH KỲ ĐÃ PHÁT SINH KỲ MỚI, KHÔNG THỂ HOÀN TÁC ĐỂ TRÁNH TRÙNG LẶP MÃ SỐ!</span>
                          </p>
                        </div>
                      ),
                      confirmText: <span translate="no" className="notranslate">ĐÃ HIỂU</span>,
                      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
                      isAlert: true
                    });
                    return;
                  }

                  const realId = isCycle ? id.split('_cycle_')[0] : id;

                  setConfirmModal({
                    show: true,
                    title: <span translate="no" className="notranslate">XÁC NHẬN HOÀN TÁC</span>,
                    message: (
                      <span translate="no" className="notranslate">
                        {isCycle 
                          ? `Bạn muốn hoàn tác kỳ hoàn thành này? Công việc sẽ quay lại mục TRÌNH DUYỆT HOÀN THÀNH.`
                          : `Bạn muốn hoàn tác công việc này? Công việc sẽ quay lại mục TRÌNH DUYỆT HOÀN THÀNH.`}
                      </span>
                    ),
                    onConfirm: () => {
                      const updates: Partial<Task> = { 
                         status: 'APPROVED', 
                        waitingApproval: true,
                        actualEndDate: null as any, 
                        isLocked: false, 
                        isNewInBoard: true,
                        requestUndo: null as any,
                        lastActionAt: new Date().toISOString(),
                        waitingApprovalAt: new Date().toISOString(),
                      };

                      if (isCycle && taskToUndo.cycleHistory) {
                        const version = parseInt(id.split('_cycle_')[1], 10);
                        const cycleEntry = taskToUndo.cycleHistory.find(h => h.version === version);
                        
                        // Remove this cycle from history
                        updates.cycleHistory = taskToUndo.cycleHistory.filter(h => h.version !== version);
                        
                        // Restore report content, objective and CODE from the cycle being undone
                        if (cycleEntry) {
                          updates.currentUpdate = cycleEntry.reportContent;
                          if (cycleEntry.objective) {
                            updates.objective = cycleEntry.objective;
                          }
                          
                          // Restore code - no more -K suffix
                          updates.code = cycleEntry.code || taskToUndo.code;
                        }
                      }

                      onUpdate(realId, updates);
                      setConfirmModal((p: any) => ({ ...p, show: false }));
                      if (onNavigate) onNavigate('pending_approval');
                    }
                  });
                }}
                onUpdate={(id, updates) => {
                  const realId = id.includes('_cycle_') ? id.split('_cycle_')[0] : id;
                  onUpdate(realId, updates);
                }}
                onSetPriority={handleSetPriority}
                onDelete={onDelete}
                onEdit={onEdit}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                setConfirmModal={setConfirmModal}
                markAsRead={markAsRead}
                lastReadChatTimestamps={lastReadChatTimestamps}
              />
            )
          ))}
        </div>
      </div>

      {sortedTasks.length === 0 && (
        <div className="py-20 text-center text-gray-400 text-sm font-medium">
          <span translate="no" className="notranslate">
            {type === 'trash' ? 'Thùng rác trống.' : type === 'active' ? 'Không có công việc đang xử lý.' : 'Không có công việc đã hoàn thành.'}
          </span>
        </div>
      )}
    </div>
  );
};
