import { useState, useEffect, useRef } from 'react';
import { User, Task, PrivateMessage, DiscussionMessage, TaskComment } from '../types';

interface Notification {
  type: 'direct' | 'task' | 'approve_ht' | 'approve_delete';
  taskId?: string;
  senderId?: string;
  senderName?: string;
  taskTitle?: string;
  msg: string;
}

export const useAppNotifications = (
  effectiveUser: User | null,
  authReady: boolean,
  firebaseLoading: boolean,
  tasks: Task[],
  privateMessages: PrivateMessage[],
  generalMessages: TaskComment[],
  discussionMessages: DiscussionMessage[],
  showDirectChatId: string | null,
  activeTab: string,
  showChatModalId: string | null
) => {
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [lastReadChatTimestamps, setLastReadChatTimestamps] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("qc_last_read_chats");
    return saved ? JSON.parse(saved) : {};
  });

  const lastPrivateMsgId = useRef<string | null>(null);
  const lastGroupMsgId = useRef<string | null>(null);
  const lastTaskCommentId = useRef<Record<string, string>>({});
  const initialLoadDone = useRef(false);
  const knownRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem("qc_last_read_chats", JSON.stringify(lastReadChatTimestamps));
  }, [lastReadChatTimestamps]);

  useEffect(() => {
    if (!effectiveUser || !authReady || firebaseLoading) return;

    if (!initialLoadDone.current) {
      if (privateMessages.length > 0) {
        lastPrivateMsgId.current = privateMessages[privateMessages.length - 1].id;
      }
      if (generalMessages.length > 0) {
        lastGroupMsgId.current = generalMessages[generalMessages.length - 1].id;
      }
      tasks.forEach((t) => {
        if (t.comments && t.comments.length > 0) {
          lastTaskCommentId.current[t.id] = t.comments[t.comments.length - 1].id;
        }
      });
      initialLoadDone.current = true;
      return;
    }

    // Task requests logic
    if (effectiveUser && (effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canApproveTask)) {
      setUnreadNotifications((prev) =>
        prev.filter((n) => {
          if (n.type === "approve_ht" || n.type === "approve_delete") {
            const t = tasks.find((task) => task.id === n.taskId);
            if (!t || t.deletedAt) return false;
            if (n.type === "approve_ht" && t.status !== "PENDING_APPROVAL") return false;
            if (n.type === "approve_delete" && !t.requestDelete) return false;
          }
          return true;
        })
      );

      tasks.forEach((t) => {
        const reqKey = `${t.id}-${t.status === "PENDING_APPROVAL" ? "HT" : ""}-${t.requestDelete ? "XOA" : ""}`;
        if ((t.status === "PENDING_APPROVAL" || t.requestDelete) && !t.deletedAt && !knownRequests.current.has(reqKey)) {
          setUnreadNotifications((prev) => {
            const type = t.status === "PENDING_APPROVAL" ? "approve_ht" : "approve_delete";
            const exists = prev.find((n) => n.taskId === t.id && n.type === type);
            if (exists) return prev;
            return [
              ...prev,
              {
                type,
                taskId: t.id,
                taskTitle: `[${t.code}] ${t.title}`,
                msg: t.status === "PENDING_APPROVAL" ? "Yêu cầu chốt hoàn thành" : "Yêu cầu xóa công việc",
              },
            ];
          });
          knownRequests.current.add(reqKey);
        }
      });
    }
  }, [privateMessages, tasks, effectiveUser, authReady, firebaseLoading]);

  // Clean up notifications when viewed
  useEffect(() => {
    if (unreadNotifications.length === 0) return;
    setUnreadNotifications((prev) =>
      prev.filter((notif) => {
        if (notif.type === "direct" && showDirectChatId && notif.senderId === showDirectChatId) return false;
        if (notif.type === "task" && showChatModalId === notif.taskId) return false;
        return true;
      })
    );
  }, [showDirectChatId, activeTab, showChatModalId, unreadNotifications.length]);

  const markAsRead = (chatId: string) => {
    setLastReadChatTimestamps(prev => ({ ...prev, [chatId]: Date.now() }));
  };

  return {
    unreadNotifications,
    setUnreadNotifications,
    lastReadChatTimestamps,
    markAsRead
  };
};
