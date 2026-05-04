import { useState, useEffect, useCallback, useRef } from 'react';
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
  serverTimestamp,
  writeBatch,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, UserPresence, Task, TaskComment, PrivateMessage, ReportDraft, OfficialReport, LogEntry, DiscussionTopic, DiscussionMessage } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export const useFirebaseData = (currentUserId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<TaskComment[]>([]);
  const [discussionTopics, setDiscussionTopics] = useState<DiscussionTopic[]>([]);
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([]);
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
      collection(db, 'tasks'),
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            issueDate: data.issueDate || new Date().toISOString().split('T')[0],
            code: data.code || 'N/A'
          } as Task;
        });
        
        // In-memory sort by code (desc)
        const sorted = tasksData.sort((a, b) => (b.code || '').localeCompare(a.code || ''));
        setTasks(sorted);
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

  // Listen to Discussion Topics
  const topicsUnsubscribe = onSnapshot(
    query(collection(db, 'discussion_topics'), orderBy('createdAt', 'desc')),
    async (snapshot) => {
      const topicsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          closedAt: data.closedAt?.toDate ? data.closedAt.toDate().toISOString() : data.closedAt
        } as DiscussionTopic;
      });
      setDiscussionTopics(topicsData);
    },
    (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Discussion topics error:", error.message);
      }
    }
  );

    // Listen to Discussion Messages
    const discMessagesUnsubscribe = onSnapshot(
      query(collection(db, 'discussion_messages'), orderBy('timestamp', 'asc')),
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
          } as DiscussionMessage;
        });
        setDiscussionMessages(messagesData);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Discussion messages error:", error.message);
        }
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
      topicsUnsubscribe();
      discMessagesUnsubscribe();
      reportsUnsubscribe();
      logsUnsubscribe();
      unsubPrivate();
      extraUsersUnsubscribe();
      presenceUnsubscribe();
    };
  }, [currentUserId, auth.currentUser?.uid]);

  const lastPresenceUpdate = useRef<number>(0);

  const updatePresence = useCallback(async (user: User) => {
    try {
      const now = Date.now();
      // Gating: Chặn đứng vòng lặp, chỉ cho phép cập nhật sau mỗi 4 phút
      if (now - lastPresenceUpdate.current < 240000) return;

      await setDoc(doc(db, 'presence', user.id), {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        lastActive: serverTimestamp(),
        status: 'online'
      });
      lastPresenceUpdate.current = now;
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

  const sendMessage = useCallback(async (content: string, authorId: string, attachments?: any[]) => {
    try {
      const realAuthorId = auth.currentUser?.uid || authorId;
      await addDoc(collection(db, 'messages'), {
        authorId: realAuthorId,
        content,
        attachments: attachments || [],
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  }, []);

  const sendDiscussionMessage = useCallback(async (
    topicId: string, 
    content: string, 
    authorId: string, 
    attachments?: any[]
  ) => {
    try {
      const realAuthorId = auth.currentUser?.uid || authorId;
      await addDoc(collection(db, 'discussion_messages'), {
        topicId,
        authorId: realAuthorId,
        content,
        attachments: attachments || [],
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'discussion_messages');
    }
  }, []);

  const createTopic = useCallback(async (topic: Omit<DiscussionTopic, 'id' | 'createdAt'>) => {
    try {
      const currentYear = new Date().getFullYear();
      const sttRef = doc(db, 'settings', 'topic_counter');
      
      await runTransaction(db, async (transaction) => {
        const sttDoc = await transaction.get(sttRef);
        let nextStt = 1;

        if (sttDoc.exists()) {
          const data = sttDoc.data();
          if (data.year === currentYear) {
            nextStt = (data.lastStt || 0) + 1;
          } else {
            nextStt = 1;
          }
        } else {
          // Special case for the very first initialization in a new project
          nextStt = 0; 
        }

        // New format: P0002026 if nextStt is 0
        const formattedCode = `P${String(nextStt).padStart(3, '0')}${currentYear}`;
        
        transaction.set(sttRef, {
          lastStt: nextStt,
          year: currentYear,
          updatedAt: serverTimestamp()
        });

        const topicRef = doc(collection(db, 'discussion_topics'));
        transaction.set(topicRef, {
          ...topic,
          topicCode: formattedCode,
          orderCode: String(nextStt).padStart(3, '0'),
          createdAt: serverTimestamp()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'discussion_topics');
    }
  }, []);

  const updateTopic = useCallback(async (topicId: string, updates: Partial<DiscussionTopic>) => {
    try {
      const finalUpdates = { ...updates };
      if (updates.status === 'CLOSED') {
        finalUpdates.closedAt = serverTimestamp() as any;
      }
      await updateDoc(doc(db, 'discussion_topics', topicId), finalUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discussion_topics/${topicId}`);
    }
  }, []);

  const updateDiscussionMessageReactions = useCallback(async (msgId: string, reactions: any[]) => {
    try {
      await updateDoc(doc(db, 'discussion_messages', msgId), { reactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discussion_messages/${msgId}`);
    }
  }, []);

  const sendPrivateMessage = useCallback(async (content: string, senderId: string, receiverId: string, attachments?: any[]) => {
    try {
      const realSenderId = auth.currentUser?.uid || senderId;
      const chatId = [realSenderId, receiverId].sort().join('_');
      
      await addDoc(collection(db, 'direct_messages'), {
        senderId: realSenderId,
        receiverId,
        content,
        chatId,
        attachments: attachments || [],
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'direct_messages');
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

  const deleteDiscussionMessage = useCallback(async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'discussion_messages', msgId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `discussion_messages/${msgId}`);
    }
  }, []);

  const deleteTopic = useCallback(async (topicId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'discussion_topics', topicId));
      const msgsQuery = query(collection(db, 'discussion_messages'), where('topicId', '==', topicId));
      const msgsSnapshot = await getDocs(msgsQuery);
      msgsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `discussion_topics/${topicId}`);
    }
  }, []);

  return {
    tasks,
    messages,
    discussionTopics,
    discussionMessages,
    privateMessages,
    officialReports,
    logs,
    extraUsers,
    loading,
    addTask,
    updateTask,
    deleteTask,
    sendMessage,
    sendDiscussionMessage,
    createTopic,
    updateTopic,
    deleteTopic,
    sendPrivateMessage,
    updateMessageReactions,
    updateDiscussionMessageReactions,
    updatePrivateMessageReactions,
    addLog,
    saveReportDraft,
    saveOfficialReport,
    addExtraUser,
    updateExtraUser,
    deleteExtraUser,
    deleteDiscussionMessage,
    presence,
    updatePresence
  };
};
