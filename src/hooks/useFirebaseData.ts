import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where,
  or,
  orderBy, 
  limit,
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
import { calculateNextDeadline } from '../lib/dateUtils';
import { User, UserPresence, Task, TaskComment, PrivateMessage, ReportDraft, OfficialReport, LogEntry, DiscussionTopic, DiscussionMessage, TaskCategory, CycleHistoryEntry } from '../types';
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
  const [userProfiles, setUserProfiles] = useState<User[]>([]);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let tasksLoaded = false;
    let topicsLoaded = false;

    const checkLoading = () => {
      if (tasksLoaded && topicsLoaded) {
        setLoading(false);
      }
    };

    // Listen to Presence
    const presenceUnsubscribe = onSnapshot(
      collection(db, 'presence'),
      (snapshot) => {
        const now = new Date().toISOString();
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
            ts = now;
          }
          return {
            ...data,
            id: doc.id,
            lastActive: ts
          } as UserPresence;
        });

        // Lọc người dùng online: Hoạt động trong 5 phút qua
        const nowMs = Date.now();
        const onlineUsers = presenceData.filter(p => {
          const lastActiveTime = new Date(p.lastActive).getTime();
          return (nowMs - lastActiveTime) < (5 * 60 * 1000);
        });
        setPresence(onlineUsers);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Presence listener error:", error.message);
        }
      }
    );

    // Listen to Task Categories
    const categoriesUnsubscribe = onSnapshot(
      collection(db, 'task_categories'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as TaskCategory[];
        setCategories(data);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("Categories listener error:", error.message);
        }
      }
    );

    // Listen to Tasks
    const tasksUnsubscribe = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
          const now = new Date().toISOString();
          const tasksData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate().toISOString() : (data.updatedAt || now),
              systemCreatedAt: (data.systemCreatedAt as any)?.toDate ? (data.systemCreatedAt as any).toDate().toISOString() : data.systemCreatedAt,
              issueDate: data.issueDate || now.split('T')[0],
              startDate: data.startDate || data.issueDate || now.split('T')[0],
              code: data.code || 'N/A'
            } as Task;
          });
        
        // In-memory sort by code (desc)
        const sorted = tasksData.sort((a, b) => (b.code || '').localeCompare(a.code || ''));
        setTasks(sorted);
        tasksLoaded = true;
        checkLoading();
      },
      (error) => {
        if (error.code === 'permission-denied') {
          console.warn("🔐 [useFirebaseData] Permission denied for 'tasks'. This is expected if auth is still initializing.");
        } else {
          handleFirestoreError(error, OperationType.GET, 'tasks');
        }
      }
    );

    // Listen to Messages (Global Chat)
    const messagesUnsubscribe = onSnapshot(
      query(collection(db, 'messages'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        const now = new Date().toISOString();
        const messagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          let ts: string;
          if (data.timestamp?.toDate) {
            ts = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
            ts = data.timestamp;
          } else {
            ts = now;
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
        if (error.code === 'permission-denied') {
          console.warn("🔐 [useFirebaseData] Permission denied for 'messages'. This is expected if auth is still initializing.");
        } else {
          handleFirestoreError(error, OperationType.GET, 'messages');
        }
      }
    );

    // Listen to Discussion Topics
    const topicsUnsubscribe = onSnapshot(
      query(collection(db, 'discussion_topics'), orderBy('createdAt', 'desc')),
      async (snapshot) => {
        const now = new Date().toISOString();
        const topicsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || now),
            closedAt: data.closedAt?.toDate ? data.closedAt.toDate().toISOString() : data.closedAt
          } as DiscussionTopic;
        });
        
        // CĐ: KHÔNG TỰ ĐỘNG KHỞI TẠO NẾU TRỐNG. Admin sẽ tự tạo.
        setDiscussionTopics(topicsData);
        topicsLoaded = true;
        checkLoading();
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
        const now = new Date().toISOString();
        const messagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          let ts: string;
          if (data.timestamp?.toDate) {
            ts = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
            ts = data.timestamp;
          } else {
            ts = now;
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
      query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(50)),
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

    // Listen to Private Messages - Tách query OR để tránh lỗi Internal Assertion của Firestore trong sandbox
    const firebaseUid = auth.currentUser?.uid || currentUserId;
    
    let unsubPrivateSent = () => {};
    let unsubPrivateReceived = () => {};

    if (firebaseUid) {
      const qSent = query(
        collection(db, 'direct_messages'), 
        where('senderId', '==', firebaseUid)
      );

      const qReceived = query(
        collection(db, 'direct_messages'), 
        where('receiverId', '==', firebaseUid)
      );

      const handlePrivateSnapshot = (snapshot: any, type: 'sent' | 'received') => {
        setPrivateMessages(prev => {
          const others = prev.filter(m => type === 'sent' ? m.receiverId === firebaseUid : m.senderId === firebaseUid);
          const current = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id,
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate().toISOString() : (doc.data().timestamp || new Date().toISOString())
          }));
          
          const combined = [...others, ...current];
          // Lọc trùng ID và sắp xếp
          const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
          return unique.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
      };

      unsubPrivateSent = onSnapshot(qSent, (s) => handlePrivateSnapshot(s, 'sent'), (e) => {
        if (e.code !== 'permission-denied') handleFirestoreError(e, OperationType.GET, 'direct_messages_sent');
      });

      unsubPrivateReceived = onSnapshot(qReceived, (s) => handlePrivateSnapshot(s, 'received'), (e) => {
        if (e.code !== 'permission-denied') handleFirestoreError(e, OperationType.GET, 'direct_messages_received');
      });
    }

    // Listen to Extra Users - ADMIN ONLY
    const isAdmin = [
      "truong.le@tanphuvietnam.vn", 
      "lenhattruong.tpp@gmail.com", 
      "lenhattruong.caphef1@gmail.com",
      "club.nhuatanphu@gmail.com", 
      "tanphuvietnam.tpp@gmail.com", 
      "truongln.tanhongngoc@gmail.com"
    ].includes((auth.currentUser?.email || "").toLowerCase());

    let extraUsersUnsubscribe = () => {};
    if (isAdmin) {
      extraUsersUnsubscribe = onSnapshot(
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
    }

    // Listen to user_profiles for internal metadata (logging)
    const profilesUnsubscribe = onSnapshot(
      collection(db, 'user_profiles'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as User));
        setUserProfiles(usersData);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          console.warn("User profiles listener error:", error.message);
        }
      }
    );

    return () => {
      tasksUnsubscribe();
      messagesUnsubscribe();
      categoriesUnsubscribe();
      topicsUnsubscribe();
      discMessagesUnsubscribe();
      reportsUnsubscribe();
      logsUnsubscribe();
      unsubPrivateSent();
      unsubPrivateReceived();
      extraUsersUnsubscribe();
      profilesUnsubscribe();
      presenceUnsubscribe();
    };
  }, [currentUserId, auth.currentUser?.uid]);

  const lastPresenceData = useRef<{name: string, avatar: string} | null>(null);
  const lastPresenceUpdate = useRef<number>(0);

  const updatePresence = useCallback(async (user: User) => {
    try {
      const now = Date.now();
      const hasChanged = !lastPresenceData.current || 
                         lastPresenceData.current.name !== user.name || 
                         lastPresenceData.current.avatar !== user.avatar;

      // Only throttle if data hasn't changed. If it changed (e.g. new avatar), update immediately.
      if (!hasChanged && (now - lastPresenceUpdate.current < 240000)) return;

      await setDoc(doc(db, 'presence', user.id), {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        lastActive: serverTimestamp(),
        status: 'online'
      });
      
      lastPresenceUpdate.current = now;
      lastPresenceData.current = { name: user.name, avatar: user.avatar };
    } catch (error) {
      console.warn("Failed to update presence:", error);
    }
  }, []);

  const addLog = useCallback(async (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    try {
      // Find user name if not provided
      let userName = entry.userName;
      if (!userName && entry.userId !== 'SYSTEM') {
        const profile = userProfiles.find(u => u.id === entry.userId || (u as any).uid === entry.userId || (u as any).uniqueKey === entry.userId);
        if (profile) userName = profile.name;
        else if (entry.userId === currentUserId) userName = 'Lê Nhật Trường'; // Fallback for the boss
      }

      await addDoc(collection(db, 'system_logs'), {
        ...entry,
        userName: userName || null,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  }, [userProfiles, currentUserId]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>, authorName?: string) => {
    try {
      const cleanTask = Object.fromEntries(
        Object.entries(task).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'tasks'), {
        ...cleanTask,
        createdAt: serverTimestamp(),
        systemCreatedAt: serverTimestamp()
      });
      
      await addLog({
        type: 'TASK_CREATE',
        userId: auth.currentUser?.uid || currentUserId || task.authorId || 'SYSTEM',
        userName: authorName,
        details: `Tạo công việc mới: ${task.title} (Mã: ${task.code})`,
        metadata: { taskId: docRef.id, taskCode: task.code }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  }, [currentUserId, addLog]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>, modifierName?: string) => {
    try {
      let targetId = id;
      let cycleVersion: number | null = null;
      
      // Kiểm tra xem ID có phải là bản ghi lịch sử chu kỳ không (virtual ID)
      if (id.includes('_cycle_')) {
        const parts = id.split('_cycle_');
        targetId = parts[0];
        cycleVersion = parseInt(parts[1], 10);
      }

      const taskRef = doc(db, 'tasks', targetId);
      const existingTask = tasks.find(t => t.id === targetId);
      const taskCode = existingTask?.code || 'N/A';

      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      // Nếu là bản ghi chu kỳ, xử lý cập nhật mảng cycleHistory
      if (cycleVersion !== null && existingTask) {
        const isHistoryFieldUpdate = updates.currentUpdate !== undefined || updates.objective !== undefined;
        
        if (isHistoryFieldUpdate) {
          const newCycleHistory = [...(existingTask.cycleHistory || [])];
          const entryIndex = newCycleHistory.findIndex(e => e.version === cycleVersion);
          
          if (entryIndex > -1) {
            if (updates.currentUpdate !== undefined) {
               newCycleHistory[entryIndex].reportContent = updates.currentUpdate;
               delete cleanUpdates.currentUpdate; // Không cập nhật vào task gốc (đang ở trạng thái active)
            }
            if (updates.objective !== undefined) {
               newCycleHistory[entryIndex].objective = updates.objective;
               delete cleanUpdates.objective;
            }
            cleanUpdates.cycleHistory = newCycleHistory;
          }
        }
      }

      // Cập nhật document gốc (Dùng targetId để tránh lỗi "No document to update")
      await updateDoc(taskRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });

      // Log specific actions
      let logType: LogEntry['type'] = 'TASK_UPDATE';
      let logDetails = `Cập nhật công việc ${taskCode}${cycleVersion ? ` (Kỳ ${cycleVersion})` : ''}`;

      if (updates.isLocked === true) {
        logType = 'TASK_LOCK';
        logDetails = `Chốt dữ liệu công việc ${taskCode}`;
      } else if (updates.isLocked === false) {
        logDetails = `Mở khóa dữ liệu công việc ${taskCode}`;
      } else if (updates.requestDelete === true) {
        logDetails = `Yêu cầu xóa công việc ${taskCode}`;
      } else if (updates.deletedAt === null) {
        logType = 'TASK_RESTORE';
        logDetails = `Khôi phục công việc ${taskCode} từ thùng rác`;
      } else if (updates.deletedAt) {
        logType = 'TASK_DELETE';
        logDetails = `Di chuyển công việc ${taskCode} vào thùng rác`;
      } else if (updates.status) {
        if (updates.status === 'APPROVED') {
          logDetails = `Admin đã duyệt công việc ${taskCode}${cycleVersion ? ` (Kỳ ${cycleVersion})` : ''}`;
        } else {
          logDetails = `Thay đổi trạng thái công việc ${taskCode} thành "${updates.status.toUpperCase()}"${cycleVersion ? ` (Kỳ ${cycleVersion})` : ''}`;
        }
      } else {
        // Detailed log based on what fields were touched
        const changedFields = Object.keys(updates).filter(k => k !== 'updatedAt');
        if (changedFields.length > 0) {
          const fieldMap: Record<string, string> = {
            title: 'Tên công việc',
            description: 'Mô tả',
            assigneeId: 'Người phụ trách',
            assigneeName: 'Tên người phụ trách',
            issueDate: 'Ngày phát hành',
            type: 'Phân loại',
            priority: 'Độ ưu tiên'
          };
          const labels = changedFields.map(f => fieldMap[f] || f).join(', ');
          logDetails = `Cập nhật ${labels} cho công việc ${taskCode}${cycleVersion ? ` (Kỳ ${cycleVersion})` : ''}`;
        }
      }

      await addLog({
        type: logType,
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: logDetails,
        metadata: { taskId: targetId, taskCode, updates, cycleVersion, virtualId: id }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  }, [currentUserId, addLog, tasks]);

  const approveTaskCompletion = useCallback(async (id: string, modifierName?: string) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      const existingTask = tasks.find(t => t.id === id);
      if (!existingTask) return;
      
      // Chặn duyệt trùng lặp nếu công việc không còn ở trạng thái chờ duyệt hoặc đã có chu kỳ mới tương tự
      if (!existingTask.waitingApproval) {
        console.warn(`Công việc ${existingTask.code} đã được duyệt hoặc không ở trạng thái chờ duyệt.`);
        return;
      }

      const isRecurring = existingTask.recurrence && existingTask.recurrence !== 'NONE';
      const nowTs = new Date().toISOString();
      const todayDate = nowTs.split('T')[0];

      // Nếu là việc định kỳ, kiểm tra xem nội dung cập nhật hiện tại đã được lưu vào lịch sử chưa (tránh trùng)
      if (isRecurring && existingTask.cycleHistory?.some(h => 
        h.reportContent === existingTask.currentUpdate && 
        h.completedAt?.split('T')[0] === todayDate
      )) {
        console.warn(`Chu kỳ này cho công việc ${existingTask.code} đã tồn tại trong lịch sử.`);
        // Vẫn cho phép reset trạng thái chờ duyệt nhưng không thêm history mới
        await updateDoc(taskRef, {
          waitingApproval: false,
          updatedAt: serverTimestamp()
        });
        return;
      }

      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const dateOnly = now.split('T')[0];

      if (existingTask.recurrence && existingTask.recurrence !== 'NONE') {
        const currentDeadline = existingTask.extensionDate || existingTask.expectedEndDate;
        const nextDeadline = calculateNextDeadline(currentDeadline || dateOnly, existingTask.recurrence);
        
        // 1. Lưu lịch sử chu kỳ (BƯỚC A)
        const newHistoryItem: CycleHistoryEntry = {
          version: (existingTask.cycleHistory?.length || 0) + 1,
          reportContent: existingTask.currentUpdate || '(Trống)',
          objective: existingTask.objective || '',
          completedAt: now,
          nextDeadline: nextDeadline
        };

        const cycleHistory = [...(existingTask.cycleHistory || []), newHistoryItem];
        
        // 2. Ghi log lịch sử văn bản
        const historyUpdates = [
          `[HOÀN THÀNH KỲ] Chốt kỳ ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}.`,
          `Nội dung: ${existingTask.currentUpdate || '(Trống)'}`,
          `Hạn tiếp theo: ${nextDeadline}`
        ];
        
        const newHistory = [...(existingTask.history || [])];
        newHistory.push({
          version: (newHistory.length > 0 ? newHistory[newHistory.length - 1].version : 0) + 1,
          content: historyUpdates.join(' | '),
          timestamp: now,
          authorId: auth.currentUser?.uid || 'SYSTEM'
        });

        // 3. Reset cho kỳ mới (BƯỚC B & C)
        batch.update(taskRef, {
          cycleHistory,
          history: newHistory,
          expectedEndDate: nextDeadline, // Nhảy hạn
          extensionDate: null,
          prevProgress: existingTask.currentUpdate,
          currentUpdate: '', // Xóa trắng báo cáo
          isNewUpdate: false, // Reset cờ
          waitingApproval: false, // Hiện lại nút Xanh
          version: (existingTask.version || 0) + 1,
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'system_logs'));
        batch.set(logRef, {
          type: 'TASK_UPDATE',
          userId: auth.currentUser?.uid || 'SYSTEM',
          userName: modifierName || null,
          timestamp: serverTimestamp(),
          details: `Duyệt hoàn thành kỳ cho công việc ${existingTask.code}. Hạn kỳ tới: ${nextDeadline}`,
          metadata: { taskId: id, taskCode: existingTask.code, action: 'CYCLE_COMPLETE' }
        });
      } else {
        // Trường hợp 1: Công việc không lặp
        batch.update(taskRef, {
          status: 'COMPLETED',
          actualEndDate: dateOnly,
          isLocked: true,
          waitingApproval: false,
          updatedAt: serverTimestamp()
        });

        const logRef = doc(collection(db, 'system_logs'));
        batch.set(logRef, {
          type: 'TASK_UPDATE',
          userId: auth.currentUser?.uid || 'SYSTEM',
          userName: modifierName || null,
          timestamp: serverTimestamp(),
          details: `Xác nhận hoàn thành công việc ${existingTask.code}`,
          metadata: { taskId: id, taskCode: existingTask.code, action: 'COMPLETE' }
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}/approve`);
    }
  }, [tasks]);

  const saveReportDraft = useCallback(async (draft: Omit<ReportDraft, 'id'>) => {
    try {
      const draftId = `${(draft.monthYear || '').replace(/\//g, '-')}_${draft.userId}`;
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

  const deleteTask = useCallback(async (id: string, modifierName?: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      await addLog({
        type: 'TASK_PERMANENT_DELETE',
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: `Xóa vĩnh viễn công việc (ID: ${id.slice(-6)})`,
        metadata: { taskId: id }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  }, [currentUserId, addLog]);

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
      // Prioritize the provided authorId (uniqueKey) over Firebase UID for consistent identity scaling
      const realAuthorId = authorId || auth.currentUser?.uid || 'anonymous';
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
      const now = new Date();
      const sttRef = doc(db, 'settings', 'topic_counter');
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const dateStr = `${dd}${mm}${yy}`;

      await runTransaction(db, async (transaction) => {
        const sttDoc = await transaction.get(sttRef);
        let nextStt = 0;

        if (sttDoc.exists()) {
          nextStt = (sttDoc.data().lastStt ?? -1) + 1;
        }

        const formattedStt = String(nextStt).padStart(3, '0');
        const finalCode = `P${formattedStt}${dateStr}`;
        
        transaction.set(sttRef, {
          lastStt: nextStt,
          updatedAt: serverTimestamp()
        });

        const topicRef = doc(collection(db, 'discussion_topics'));
        transaction.set(topicRef, {
          ...topic,
          topicCode: finalCode,
          orderCode: formattedStt,
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

  const updateProfile = useCallback(async (uniqueKey: string, updates: Partial<User>) => {
    try {
      // Logic requirement: ID must be uniqueKey, use setDoc with merge: true
      await setDoc(doc(db, 'user_profiles', uniqueKey), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_profiles/${uniqueKey}`);
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

  const deleteTopicsBulk = useCallback(async (topicIds: string[]) => {
    try {
      console.log(`[FORCED DELETE] Starting sequence for ${topicIds.length} topics...`);
      
      const allMessageRefs: any[] = [];
      
      // Step 1: Batch the fetching of messages to avoid hitting limits or resource exhaustion
      const CHUNK_SIZE = 10;
      for (let i = 0; i < topicIds.length; i += CHUNK_SIZE) {
        const chunk = topicIds.slice(i, i + CHUNK_SIZE);
        const fetchPromises = chunk.map(id => {
          const q = query(collection(db, 'discussion_messages'), where('topicId', '==', id));
          return getDocs(q);
        });
        
        const snapshots = await Promise.all(fetchPromises);
        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => allMessageRefs.push(doc.ref));
        });
        console.log(`[FORCED DELETE] Fetched messages for chunk ${i/CHUNK_SIZE + 1}. Total messages so far: ${allMessageRefs.length}`);
      }
      
      let batch = writeBatch(db);
      let count = 0;

      // Step 2: Delete topics
      for (const topicId of topicIds) {
        batch.delete(doc(db, 'discussion_topics', topicId));
        count++;
        
        if (count >= 400) {
          console.log("[FORCED DELETE] Committing topic batch...");
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      // Step 3: Delete messages
      console.log(`[FORCED DELETE] Deleting ${allMessageRefs.length} messages...`);
      for (const msgRef of allMessageRefs) {
        batch.delete(msgRef);
        count++;
        
        if (count >= 400) {
          console.log("[FORCED DELETE] Committing message batch...");
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        console.log("[FORCED DELETE] Committing final batch...");
        await batch.commit();
      }
      
      console.log("[FORCED DELETE] Success!");
      return true;
    } catch (error) {
      console.error("CRITICAL DELETE FAILURE:", error);
      handleFirestoreError(error, OperationType.DELETE, `bulk_discussion_topics`);
      throw error;
    }
  }, []);

  const deleteTasksBulk = useCallback(async (taskIds: string[], modifierName?: string) => {
    try {
      console.log(`[SYSTEM RESET] Starting bulk deletion of ${taskIds.length} tasks...`);
      let batch = writeBatch(db);
      let count = 0;

      for (const taskId of taskIds) {
        batch.delete(doc(db, 'tasks', taskId));
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      
      await addLog({
        type: 'TASK_PERMANENT_DELETE',
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: `Xóa vĩnh viễn hàng loạt (${taskIds.length} công việc)`,
        metadata: { taskIds }
      });

      console.log("[SYSTEM RESET] Tasks cleared successfully!");
      return true;
    } catch (error) {
      console.error("BULK TASK DELETE FAILURE:", error);
      handleFirestoreError(error, OperationType.DELETE, `bulk_tasks`);
      throw error;
    }
  }, [currentUserId, addLog]);

  const trashTasksBulk = useCallback(async (taskIds: string[], modifierName?: string) => {
    try {
      console.log(`[BULK TRASH] Moving ${taskIds.length} tasks to trash...`);
      let batch = writeBatch(db);
      let count = 0;

      for (const taskId of taskIds) {
        batch.update(doc(db, 'tasks', taskId), {
          deletedAt: serverTimestamp(),
          status: 'DELETED',
          updatedAt: serverTimestamp()
        });
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      
      await addLog({
        type: 'TASK_DELETE',
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: `Di chuyển hàng loạt công việc vào thùng rác (${taskIds.length} công việc)`,
        metadata: { taskIds }
      });

      console.log("[BULK TRASH] Tasks moved successfully!");
      return true;
    } catch (error) {
      console.error("BULK TASK TRASH FAILURE:", error);
      handleFirestoreError(error, OperationType.UPDATE, `bulk_trash_tasks`);
      throw error;
    }
  }, [currentUserId, addLog]);

  const approveTasksBulk = useCallback(async (taskIds: string[], modifierName?: string) => {
    try {
      let batch = writeBatch(db);
      let count = 0;

      for (const taskId of taskIds) {
        batch.update(doc(db, 'tasks', taskId), {
          status: 'APPROVED',
          isNewInBoard: true,
          updatedAt: serverTimestamp(),
          lastActionAt: serverTimestamp()
        });
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      
      await addLog({
        type: 'TASK_UPDATE',
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: `Phê duyệt hàng loạt (${taskIds.length} công việc)`,
        metadata: { taskIds }
      });
      
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bulk_approve_tasks`);
      throw error;
    }
  }, [currentUserId, addLog]);

  const clearNewInBoardTasks = useCallback(async (taskIds: string[]) => {
    try {
      if (taskIds.length === 0) return;
      let batch = writeBatch(db);
      let count = 0;

      for (const taskId of taskIds) {
        batch.update(doc(db, 'tasks', taskId), {
          isNewInBoard: false
        });
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Failed to clear new in board status:", error);
    }
  }, []);

  const resetSystem = useCallback(async (modifierName?: string) => {
    try {
      // 1. Delete all tasks
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const taskIds = tasksSnap.docs.map(d => d.id);
      for (const id of taskIds) {
        await deleteDoc(doc(db, 'tasks', id));
      }

      // 2. Delete all logs
      const logsSnap = await getDocs(collection(db, 'system_logs'));
      const logIds = logsSnap.docs.map(d => d.id);
      for (const id of logIds) {
        await deleteDoc(doc(db, 'system_logs', id));
      }

      // 3. Delete all topics
      const topicsSnap = await getDocs(collection(db, 'discussion_topics'));
      const topicIds = topicsSnap.docs.map(d => d.id);
      for (const id of topicIds) {
        await deleteDoc(doc(db, 'discussion_topics', id));
      }

      // 4. Delete all discussion messages
      const msgsSnap = await getDocs(collection(db, 'discussion_messages'));
      const messageIds = msgsSnap.docs.map(d => d.id);
      for (const id of messageIds) {
        await deleteDoc(doc(db, 'discussion_messages', id));
      }

      await addLog({
        type: 'SYSTEM',
        userId: auth.currentUser?.uid || currentUserId || 'SYSTEM',
        userName: modifierName,
        details: `Reset toàn bộ hệ thống (Xóa sạch dữ liệu)`,
        metadata: { action: 'SYSTEM_RESET' }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reset_system');
    }
  }, [currentUserId, addLog]);

  const deleteLogsBulk = useCallback(async (logIds: string[]) => {
    try {
      let batch = writeBatch(db);
      let count = 0;

      for (const logId of logIds) {
        batch.delete(doc(db, 'system_logs', logId));
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bulk_logs`);
      throw error;
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
    userProfiles,
    loading,
    addTask,
    updateTask,
    deleteTask,
    deleteTasksBulk,
    trashTasksBulk,
    approveTasksBulk,
    sendMessage,
    sendDiscussionMessage,
    createTopic,
    updateTopic,
    deleteTopic,
    deleteTopicsBulk,
    sendPrivateMessage,
    updateMessageReactions,
    updateDiscussionMessageReactions,
    updatePrivateMessageReactions,
    saveReportDraft,
    saveOfficialReport,
    addExtraUser,
    updateExtraUser,
    updateProfile,
    deleteExtraUser,
    deleteDiscussionMessage,
    presence,
    categories,
    updatePresence,
    approveTaskCompletion,
    clearNewInBoardTasks,
    resetSystem,
    deleteLogsBulk
  };
};
