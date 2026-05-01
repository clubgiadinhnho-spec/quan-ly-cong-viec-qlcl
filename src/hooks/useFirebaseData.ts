import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where,
  or,
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, UserPresence, Task, TaskComment, PrivateMessage, ReportDraft, OfficialReport, LogEntry } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export const useFirebaseData = (currentUserId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<TaskComment[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [officialReports, setOfficialReports] = useState<OfficialReport[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [extraUsers, setExtraUsers] = useState<User[]>([]);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    // Listen to Presence
    const presenceUnsubscribe = onSnapshot(
      collection(db, 'presence'),
      (snapshot) => {
        const presenceData = snapshot.docs.map(doc => {
          const data = doc.data();
          let ts: string;
          // Xử lý các loại timestamp khác nhau từ Firebase (Metadata, string, Date)
          if (data.lastActive?.toDate) {
            ts = data.lastActive.toDate().toISOString();
          } else if (data.lastActive && typeof data.lastActive === 'object' && 'seconds' in data.lastActive) {
            // Trường hợp là object snapshot nhưng chưa có hàm toDate
            ts = new Date(data.lastActive.seconds * 1000).toISOString();
          } else if (typeof data.lastActive === 'string') {
            ts = data.lastActive;
          } else {
            ts = new Date().toISOString();
          }
          return {
            ...data,
            id: doc.id,
            lastActive: ts
          } as UserPresence;
        });

        // Lọc người dùng online: Hoạt động trong 5 phút qua
        const now = Date.now();
        const onlineUsers = presenceData.filter(p => {
          const lastActiveTime = new Date(p.lastActive).getTime();
          return (now - lastActiveTime) < (5 * 60 * 1000);
        });
        setPresence(onlineUsers);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Presence listener error:", error.message);
        }
      }
    );

    // Listen to Tasks
    const tasksUnsubscribe = onSnapshot(
      query(collection(db, 'tasks'), orderBy('code', 'desc')),
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            issueDate: data.issueDate || new Date().toISOString().split('T')[0]
          } as Task;
        });
        setTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tasks');
      }
    );

    // Listen to Messages (Global Chat)
    const messagesUnsubscribe = onSnapshot(
      query(collection(db, 'messages'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          let ts: string;
          if (data.timestamp?.toDate) {
            ts = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
            ts = data.timestamp;
          } else {
            ts = new Date().toISOString();
          }
          return {
            ...data,
            id: doc.id,
            timestamp: ts
          } as TaskComment;
        });
        setMessages(messagesData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'messages');
      }
    );

    // Listen to Official Reports
    const reportsUnsubscribe = onSnapshot(
      query(collection(db, 'official_reports'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as OfficialReport));
        setOfficialReports(reportsData);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Official reports error:", error.message);
        }
      }
    );

    // Listen to System Logs
    const logsUnsubscribe = onSnapshot(
      query(collection(db, 'system_logs'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate().toISOString() : doc.data().timestamp
        } as LogEntry));
        setLogs(logsData);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Logs error:", error.message);
        }
      }
    );

    // Listen to Private Messages
    const firebaseUid = auth.currentUser?.uid || currentUserId;
    
    if (!firebaseUid) return;

    const qPrivate = query(
      collection(db, 'direct_messages'), 
      or(
        where('senderId', '==', firebaseUid),
        where('receiverId', '==', firebaseUid)
      )
    );

    const unsubPrivate = onSnapshot(qPrivate, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        let ts: string;
        if (data.timestamp?.toDate) {
          ts = data.timestamp.toDate().toISOString();
        } else if (typeof data.timestamp === 'string') {
          ts = data.timestamp;
        } else {
          ts = new Date().toISOString();
        }
        return {
          ...data,
          id: doc.id,
          timestamp: ts
        } as PrivateMessage;
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setPrivateMessages(messagesData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'direct_messages');
      }
    });

    // Listen to Extra Users
    const extraUsersUnsubscribe = onSnapshot(
      collection(db, 'extra_users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as User));
        setExtraUsers(usersData);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Extra users listener error:", error.message);
        }
      }
    );

    return () => {
      tasksUnsubscribe();
      messagesUnsubscribe();
      reportsUnsubscribe();
      logsUnsubscribe();
      unsubPrivate();
      extraUsersUnsubscribe();
      presenceUnsubscribe();
    };
  }, [currentUserId, auth.currentUser?.uid]);

  const updatePresence = useCallback(async (user: User) => {
    try {
      await setDoc(doc(db, 'presence', user.id), {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        lastActive: serverTimestamp(),
        status: 'online'
      });
    } catch (error) {
      console.warn("Failed to update presence:", error);
    }
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  }, []);

  const saveReportDraft = useCallback(async (draft: Omit<ReportDraft, 'id'>) => {
    try {
      const draftId = `${draft.monthYear.replace(/\//g, '-')}_${draft.userId}`;
      await setDoc(doc(db, 'report_drafts', draftId), {
        ...draft,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'report_drafts');
    }
  }, []);

  const saveOfficialReport = useCallback(async (report: Omit<OfficialReport, 'id'>) => {
    try {
      await addDoc(collection(db, 'official_reports'), {
        ...report,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'official_reports');
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, authorId: string) => {
    try {
      const realAuthorId = auth.currentUser?.uid || authorId;
      await addDoc(collection(db, 'messages'), {
        authorId: realAuthorId,
        content,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  }, []);

  const sendPrivateMessage = useCallback(async (content: string, senderId: string, receiverId: string) => {
    try {
      const realSenderId = auth.currentUser?.uid || senderId;
      const chatId = [realSenderId, receiverId].sort().join('_');
      
      await addDoc(collection(db, 'direct_messages'), {
        senderId: realSenderId,
        receiverId,
        content,
        chatId,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'direct_messages');
    }
  }, []);

  const clearAllTasks = useCallback(async (taskIds: string[]) => {
    try {
      for (const id of taskIds) {
        await deleteDoc(doc(db, 'tasks', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'multiple tasks');
    }
  }, []);

  const updateMessageReactions = useCallback(async (msgId: string, reactions: any[]) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), { reactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${msgId}`);
    }
  }, []);

  const updatePrivateMessageReactions = useCallback(async (msgId: string, reactions: any[]) => {
    try {
      await updateDoc(doc(db, 'direct_messages', msgId), { reactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `direct_messages/${msgId}`);
    }
  }, []);

  const addLog = useCallback(async (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        ...log,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  }, []);

  const addExtraUser = useCallback(async (user: User) => {
    try {
      await setDoc(doc(db, 'extra_users', user.id), {
        ...user,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `extra_users/${user.id}`);
    }
  }, []);

  const updateExtraUser = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'extra_users', userId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `extra_users/${userId}`);
    }
  }, []);

  const deleteExtraUser = useCallback(async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'extra_users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `extra_users/${userId}`);
    }
  }, []);

  return {
    tasks,
    messages,
    privateMessages,
    officialReports,
    logs,
    extraUsers,
    loading,
    addTask,
    updateTask,
    deleteTask,
    sendMessage,
    sendPrivateMessage,
    updateMessageReactions,
    updatePrivateMessageReactions,
    addLog,
    saveReportDraft,
    saveOfficialReport,
    clearAllTasks,
    addExtraUser,
    updateExtraUser,
    deleteExtraUser,
    presence,
    updatePresence
  };
};
