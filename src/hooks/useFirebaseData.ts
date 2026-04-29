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
import { User, Task, TaskComment, PrivateMessage, ReportDraft, OfficialReport } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export const useFirebaseData = (currentUserId?: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<TaskComment[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [officialReports, setOfficialReports] = useState<OfficialReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no user ID is provided, it means we're on the login screen or auth is still initializing.
    // We only listen to public data like 'users' at the beginning, others wait for auth.
    
    // Listen to Users (needed for login and bootstrap)
    console.log("Starting users listener...");
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as unknown as User));
        setUsers(usersData);
      },
      (error) => {
        console.warn("Users listener permission/error:", error.message);
      }
    );

    if (!currentUserId) {
      setLoading(false);
      return () => {
        usersUnsubscribe();
      };
    }

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
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'tasks');
        } else {
          console.warn("Permission denied for tasks listener. You might not have the correct role.");
        }
      }
    );

    // Listen to Messages
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
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'messages');
        } else {
          console.warn("Permission denied for messages listener.");
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

    // Listen to Private Messages
    // We use the Firebase UID if available, otherwise fallback to the provided internal ID
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
      } else {
        console.warn("Permission denied for direct_messages listener. Auth ID:", firebaseUid);
      }
    });

    return () => {
      usersUnsubscribe();
      tasksUnsubscribe();
      messagesUnsubscribe();
      reportsUnsubscribe();
      unsubPrivate();
    };
  }, [currentUserId, auth.currentUser?.uid]);

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
      // Use monthYear_userId as a unique doc ID for simplicity to overwrite same month's draft
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
      // Use the actual Firebase UID for sending if available, otherwise use provided ID
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

  const updateStaff = useCallback(async (staff: User) => {
    try {
      // Use the staff's id as the document ID if it exists, otherwise use a new one.
      // In this app, we should use the UID as the ID for clarity.
      await setDoc(doc(db, 'users', staff.id), staff);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${staff.id}`);
    }
  }, []);

  const deleteStaff = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  }, []);

  const clearAllTasks = useCallback(async (taskIds: string[]) => {
    try {
      // Loop sequentially to avoid bulk operation restrictions and ensure client-side permissions
      for (const id of taskIds) {
        await deleteDoc(doc(db, 'tasks', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'multiple tasks');
    }
  }, []);

  const updateHeartbeat = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastActive: Date.now()
      });
    } catch (error) {
      // Silently fail for heartbeat to avoid UI noise
      console.error("Heartbeat error:", error);
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

  return {
    tasks,
    users,
    messages,
    privateMessages,
    officialReports,
    loading,
    addTask,
    updateTask,
    deleteTask,
    sendMessage,
    sendPrivateMessage,
    updateStaff,
    deleteStaff,
    updateHeartbeat,
    updateMessageReactions,
    updatePrivateMessageReactions,
    saveReportDraft,
    saveOfficialReport,
    clearAllTasks
  };
};

export const useUserHeartbeat = (userId: string | undefined, updateHeartbeat: (id: string) => Promise<void>) => {
  useEffect(() => {
    if (!userId) return;

    // Initial heartbeat
    updateHeartbeat(userId);

    const interval = setInterval(() => {
      updateHeartbeat(userId);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userId, updateHeartbeat]);
};
