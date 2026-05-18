import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Task, PrivateMessage, DiscussionMessage, TaskComment } from '../types';
import { isTaskDeleted } from '../utils/userUtils';

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

    // Logic thông báo
    setUnreadNotifications((prev) => {
      let changed = false;
      const next = prev.filter((n) => {
        if (n.type === "approve_ht" || n.type === "approve_delete") {
          const t = tasks.find((task) => task.id === n.taskId);
          if (!t || isTaskDeleted(t)) return false;
          if (n.type === "approve_ht" && t.status !== "PENDING_APPROVAL") return false;
          if (n.type === "approve_delete" && !t.requestDelete) return false;
        }
        return true;
      });

      if (next.length !== prev.length) changed = true;

      // 2. Thông báo yêu cầu duyệt (Admin/Người có quyền)
      if (effectiveUser && (effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canApproveTask)) {
        tasks.forEach((t) => {
          const reqKey = `${t.id}-${t.status === "PENDING_APPROVAL" ? "HT" : ""}-${t.requestDelete ? "XOA" : ""}`;
          if ((t.status === "PENDING_APPROVAL" || t.requestDelete) && !isTaskDeleted(t) && !knownRequests.current.has(reqKey)) {
            const type = t.status === "PENDING_APPROVAL" ? "approve_ht" : "approve_delete";
            const exists = next.find((n) => n.taskId === t.id && n.type === type);
            if (!exists) {
              next.push({
                type,
                taskId: t.id,
                taskTitle: `[${t.code}] ${t.title}`,
                msg: t.status === "PENDING_APPROVAL" ? "Yêu cầu chốt hoàn thành" : "Yêu cầu xóa công việc",
              });
              changed = true;
              // We'll mark it as known outside the state updater to be safe
            }
          }
        });
      }

      // 3. Tin nhắn trực tiếp mới
      if (privateMessages.length > 0) {
        const lastMsg = privateMessages[privateMessages.length - 1];
        if (lastMsg.id !== lastPrivateMsgId.current) {
          if (lastMsg.senderId !== effectiveUser.id && showDirectChatId !== lastMsg.senderId) {
            const exists = next.find(n => n.type === 'direct' && n.senderId === lastMsg.senderId);
            if (!exists) {
              next.push({
                type: 'direct',
                senderId: lastMsg.senderId,
                senderName: 'Bạn có tin nhắn mới',
                msg: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '')
              });
              changed = true;
            }
          }
        }
      }

      // 4. Bình luận công việc mới
      tasks.filter(t => !isTaskDeleted(t) && !t.isCycleRecord).forEach(t => {
        if (t.comments && t.comments.length > 0) {
          const lastComment = t.comments[t.comments.length - 1];
          if (lastComment.id !== lastTaskCommentId.current[t.id]) {
            if (lastComment.authorId !== effectiveUser.id && showChatModalId !== t.id) {
              const exists = next.find(n => n.type === 'task' && n.taskId === t.id);
              if (!exists) {
                next.push({
                  type: 'task',
                  taskId: t.id,
                  taskTitle: `[${t.code}] ${t.title}`,
                  msg: 'Có bình luận mới'
                });
                changed = true;
              }
            }
          }
        }
      });

      return changed ? next : prev;
    });

    // Update refs outside the state updater
    if (privateMessages.length > 0) {
      lastPrivateMsgId.current = privateMessages[privateMessages.length - 1].id;
    }
    tasks.forEach(t => {
      const reqKey = `${t.id}-${t.status === "PENDING_APPROVAL" ? "HT" : ""}-${t.requestDelete ? "XOA" : ""}`;
      if (t.status === "PENDING_APPROVAL" || t.requestDelete) {
        knownRequests.current.add(reqKey);
      }
      if (t.comments && t.comments.length > 0) {
        lastTaskCommentId.current[t.id] = t.comments[t.comments.length - 1].id;
      }
    });

  }, [tasks, privateMessages, effectiveUser?.id, effectiveUser?.role, authReady, firebaseLoading]);

  // Clean up notifications when viewed
  useEffect(() => {
    if (unreadNotifications.length === 0) return;
    setUnreadNotifications((prev) => {
      const filtered = prev.filter((notif) => {
        if (notif.type === "direct" && showDirectChatId && notif.senderId === showDirectChatId) return false;
        if (notif.type === "task" && showChatModalId === notif.taskId) return false;
        return true;
      });
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [showDirectChatId, activeTab, showChatModalId]);

  const markAsRead = useCallback((chatId: string) => {
    setLastReadChatTimestamps(prev => {
      const now = Date.now();
      // Only update if the timestamp is actually newer
      if (prev[chatId] && now <= prev[chatId]) return prev; 
      return { ...prev, [chatId]: now };
    });
  }, []);

  // Timestamps for when user last viewed main sections
  const [lastViewedSections, setLastViewedSections] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("qc_last_viewed_sections");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("qc_last_viewed_sections", JSON.stringify(lastViewedSections));
  }, [lastViewedSections]);

  const markSectionAsViewed = useCallback((sectionId: string) => {
    setLastViewedSections(prev => ({ ...prev, [sectionId]: Date.now() }));
  }, []);

  const unreadCounts = useMemo(() => {
    if (!effectiveUser) return {};
    const counts: Record<string, number> = {};
    privateMessages.forEach(msg => {
      if (msg.senderId === effectiveUser.id) return;
      const lastRead = lastReadChatTimestamps[msg.senderId] || 0;
      const msgTime = new Date(msg.timestamp).getTime();
      if (msgTime > lastRead) {
        counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
      }
    });
    return counts;
  }, [privateMessages, lastReadChatTimestamps, effectiveUser?.id]);

  const groupUnreadCount = useMemo(() => {
    if (!effectiveUser) return 0;
    const lastRead = lastReadChatTimestamps['group_chat'] || 0;
    return discussionMessages.filter(msg => {
      if (msg.authorId === effectiveUser.id) return false;
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime > lastRead;
    }).length;
  }, [discussionMessages, lastReadChatTimestamps, effectiveUser?.id]);

  return {
    unreadNotifications,
    unreadCounts,
    groupUnreadCount,
    setUnreadNotifications,
    lastReadChatTimestamps,
    lastViewedSections,
    markAsRead,
    markSectionAsViewed
  };
};
