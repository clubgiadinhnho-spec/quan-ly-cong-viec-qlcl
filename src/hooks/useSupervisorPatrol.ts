import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, User } from '../types';
import { getTaskDeadlineStatus } from '../lib/dateUtils';

export interface SupervisorState {
  isActive: boolean;
  currentTaskId: string | null;
  currentTaskCode: string;
  speech: string;
  speechJob?: string;
  patrolledAt: string | null;
  currentIndex: number;
  patrolledTaskIds?: string[];
  isCheckIn?: boolean;
}

interface UseSupervisorPatrolProps {
  tasks: Task[];
  currentUser: User | null;
  users: User[];
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export const useSupervisorPatrol = ({
  tasks,
  currentUser,
  users,
  activeTab,
  setActiveTab
}: UseSupervisorPatrolProps) => {
  const [supState, setSupState] = useState<SupervisorState>({
    isActive: false,
    currentTaskId: null,
    currentTaskCode: '',
    speech: '',
    patrolledAt: null,
    currentIndex: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  const tasksRef = useRef(tasks);
  const usersRef = useRef(users);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Check if current user is Admin (especially Lê Nhật Trường)
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || 
                  currentUser?.uniqueKey === 'LeNhatTruong0907767304' || 
                  currentUser?.id === 'lenhattruong.caphef1@gmail.com';

  // Listen to supervisor state in Firestore for real-time synchronization
  useEffect(() => {
    const docRef = doc(db, 'settings', 'supervisor_state');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SupervisorState;
        setSupState(data);
      } else {
        // Initial state
        setDoc(docRef, {
          isActive: false,
          currentTaskId: null,
          currentTaskCode: '',
          speech: 'Hệ thống an ninh S.U.P sẵn sàng!',
          patrolledAt: null,
          currentIndex: 0,
          isCheckIn: false
        });
      }
    });

    return () => unsub();
  }, []);

  // Check working hours: 8 AM to 5 PM (17h) Vietnamese Time (UTC+7)
  const checkIsWorkingHours = (): boolean => {
    const now = new Date();
    // UTC to GMT+7 Conversion
    const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const vnHour = vnDate.getUTCHours();
    return vnHour >= 8 && vnHour < 17;
  };

  // Prioritization weight helper
  const getSortWeight = useCallback((t: Task) => {
    const dld = getTaskDeadlineStatus(t);
    if (dld.status === 'CRITICAL') return 0; // Highest priority: Overdue (Red)
    if (dld.status === 'URGENT' || dld.status === 'WARNING') return 1; // Near-due (Yellow)

    // Phase 1 KNN / KNB not done:
    const isKNN = t.category === 'KNN';
    const isKNB = t.category === 'KNB';
    const taskCreatedAt = t.systemCreatedAt || t.issueDate || t.updatedAt || new Date().toISOString();
    const isLegacyKNN = isKNN && new Date(taskCreatedAt).getTime() < new Date('2026-05-22T23:59:59').getTime();
    const isLegacyKNB = isKNB && new Date(taskCreatedAt).getTime() < new Date('2026-05-29T23:59:59').getTime();
    const isStage1Done = !!(t.stage1Done || isLegacyKNN || isLegacyKNB);
    if ((isKNN || isKNB) && !isStage1Done) return 2; // Category KNN/KNB pending stage 1

    return 3; // Others
  }, []);

  // Generate the patrol speech dialogue dynamically
  const generatePatrolSpeech = useCallback((task: Task, assigneeName: string): string => {
    const code = task.code;
    const deadline = task.extensionDate || task.expectedEndDate || 'Chưa định';
    const dld = getTaskDeadlineStatus(task);

    // Formatted dates (Standard Vietnamese DD/MM/YY format check)
    let formattedDeadline = deadline;
    if (deadline.includes('-')) {
      const parts = deadline.split('-');
      if (parts.length === 3) {
        const yy = parts[0].length === 4 ? parts[0].substring(2) : parts[0];
        formattedDeadline = `${parts[2]}/${parts[1]}/${yy}`;
      } else {
        formattedDeadline = deadline.split('-').reverse().join('/');
      }
    }

    // Check specific priority states to speak correctly
    if (dld.status === 'CRITICAL') {
      const phrases = [
        `Phát hiện Mã ${code}: Quá hạn ${formattedDeadline}! Đề nghị đồng chí ${assigneeName} lập tức giải trình khẩn cấp!`,
        `Cảnh báo Đỏ tại Mã ${code}! Đồng chí ${assigneeName} trễ deadline ${formattedDeadline}. Tập trung xử lý ngay!`,
        `Thanh tra Mã ${code} đang quá hạn! ${assigneeName} khẩn trương hoàn thành mục tiêu!`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    if (dld.status === 'URGENT' || dld.status === 'WARNING') {
      const phrases = [
        `Phát hiện Mã ${code}: Sắp đến hạn ${formattedDeadline}! Đồng chí ${assigneeName} theo sát mục tiêu!`,
        `Cảnh báo Vàng tại Mã ${code}: Tiến độ tiệm cận ngày ${formattedDeadline}. Khẩn trương đẩy nhanh ${assigneeName}!`,
        `Kiểm tra Mã ${code} sắp đến hạn! Đề nghị đồng chí ${assigneeName} bám sát tiến độ chỉ đạo!`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    // KNN/KNB GĐ1
    const isKNN = task.category === 'KNN';
    const isKNB = task.category === 'KNB';
    const taskCreatedAt = task.systemCreatedAt || task.issueDate || task.updatedAt || new Date().toISOString();
    const isLegacyKNN = isKNN && new Date(taskCreatedAt).getTime() < new Date('2026-05-22T23:59:59').getTime();
    const isLegacyKNB = isKNB && new Date(taskCreatedAt).getTime() < new Date('2026-05-29T23:59:59').getTime();
    const isStage1Done = !!(task.stage1Done || isLegacyKNN || isLegacyKNB);

    if ((isKNN || isKNB) && !isStage1Done) {
      const phrases = [
        `Kiểm soát Mã ${code}: Nhiệm vụ ${task.category} chưa hoàn tất GĐ1! Đề nghị ${assigneeName} tập trung xử lý gấp!`,
        `Mã kiểm tra ${code}: Khiếu nại ${task.category} GĐ1 đang chờ xử lý. Đồng chí ${assigneeName} đẩy nhanh tiến trình!`,
        `Rà soát Mã ${code}: Giai đoạn 1 chưa chốt. Yêu cầu ${assigneeName} kiểm tra phản hồi!`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    // Normal tasks
    const phrases = [
      `Kiểm tra Mã ${code}: Diễn tiến ổn định. Đồng chí ${assigneeName} tiếp tục bám sát!`,
      `Rà soát Mã ${code}: Không phát hiện lỗi nghiêm trọng. Yêu cầu đồng chí ${assigneeName} nỗ lực!`
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []);

  // Helper to call the central Gemini proxy
  const callGemini = async (prompt: string): Promise<string> => {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate content');
    }
    const data = await response.json();
    return data.text || '';
  };

  // A ref to keep track of any active run sequence abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Patrol toggle button handlers (For admin only)
  const togglePatrol = useCallback(async () => {
    if (!isAdmin) return;
    const docRef = doc(db, 'settings', 'supervisor_state');

    try {
      const snap = await getDoc(docRef);
      const active = snap.exists() ? snap.data().isActive : false;

      if (active) {
        // Turning OFF: cancel any running sequence
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        await setDoc(docRef, {
          isActive: false,
          currentTaskId: null,
          currentTaskCode: '',
          speech: 'S.U.P tạm dừng tuần tra, chuyển sang chế độ bảo trì.',
          speechJob: '',
          patrolledAt: new Date().toISOString(),
          currentIndex: 0,
          patrolledTaskIds: []
        });
        return;
      }

      // Check working hours constraint
      if (!checkIsWorkingHours()) {
        await setDoc(docRef, {
          isActive: false,
          currentTaskId: null,
          currentTaskCode: '',
          speech: 'S.U.P đang nghỉ ngơi (Ngoài giờ hành chính 8h - 17h).',
          speechJob: '',
          patrolledAt: new Date().toISOString(),
          currentIndex: 0
        });
        alert('S.U.P đang nghỉ ngơi ngoài giờ hành chính (8h - 17h).');
        return;
      }

      // Filter active approved tasks (as per rule 5)
      const activeTasks = tasksRef.current.filter(t => t.status === 'APPROVED' && !t.waitingApproval && !t.deletedAt);

      if (activeTasks.length === 0) {
        await setDoc(docRef, {
          isActive: false,
          currentTaskId: null,
          currentTaskCode: '',
          speech: 'Bảng công việc trống. Không tìm thấy công việc APPROVED để tuần tra!',
          speechJob: '',
          patrolledAt: new Date().toISOString(),
          currentIndex: 0
        });
        alert('Bảng công việc trống. Không tìm thấy công việc APPROVED để tuần tra!');
        return;
      }

      // Sort the pool according to task code for sequential rotation
      const sortedPool = [...activeTasks].sort((a, b) => (a.code || '').localeCompare(b.code || ''));

      // Find the task using localStorage sequence memory
      let task = sortedPool[0];
      const lastPatrolledId = localStorage.getItem('last_patrolled_task_id');
      if (lastPatrolledId) {
        const lastIndex = sortedPool.findIndex(t => t.id === lastPatrolledId);
        if (lastIndex !== -1) {
          if (lastIndex + 1 < sortedPool.length) {
            task = sortedPool[lastIndex + 1];
          } else {
            task = sortedPool[0]; // Wrap around
          }
        }
      }

      // Initiate abort controller for this execution run
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      // Sleep with abort checking to allow smooth control exit
      const sleepWithAbort = (ms: number) => new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, ms);
        const onAbort = () => {
          clearTimeout(t);
          reject(new Error('Patrol Aborted'));
        };
        signal.addEventListener('abort', onAbort);
      });

      // Run Single Patrol sequence
      const runSinglePatrol = async () => {
        try {
          // Phase 0: S.U.P lượn lờ quét sơ bộ qua 3 công việc ngẫu nhiên khác để tạo không khí rà soát sống động kịch tính
          const otherTasks = sortedPool.filter(t => t.id !== task.id);
          if (otherTasks.length > 0) {
            // Lấy tối đa 3 công việc ngẫu nhiên từ danh sách để lướt qua quan sát
            const cruiseCount = Math.min(otherTasks.length, 3);
            const shuffledOthers = [...otherTasks].sort(() => 0.5 - Math.random());
            const cruiseTasks = shuffledOthers.slice(0, cruiseCount);

            for (let i = 0; i < cruiseTasks.length; i++) {
              const cTask = cruiseTasks[i];
              const scanSpeeches = [
                `S.U.P đang lướt nhanh rà soát Mã ${cTask.code}...`,
                `S.U.P đang quét tiến độ sơ bộ Mã ${cTask.code}...`,
                `S.U.P kiểm tra chéo cảm biến tại Mã ${cTask.code}...`,
                `Đang tuần tra: S.U.P quan sát tổng bộ Mã ${cTask.code}...`
              ];
              const scanSpeech = scanSpeeches[i % scanSpeeches.length];

              await setDoc(docRef, {
                isActive: true,
                currentTaskId: cTask.id,
                currentTaskCode: cTask.code,
                speech: scanSpeech,
                speechJob: `Đang quét cảm biến tiến độ và hiệu năng...`,
                patrolledAt: new Date().toISOString(),
                isCheckIn: false
              });

              // Thời gian vàng để màn hình cuộn mượt đến việc đó và mô phỏng quét (giảm tốc độ đi ~80% để quan sát trung thực)
              await sleepWithAbort(4800);
              if (signal.aborted) return;
            }
          }

          // Bước 1: Di chuyền và cuộn mượt tới Task mục tiêu chính thức
          await setDoc(docRef, {
            isActive: true,
            currentTaskId: task.id,
            currentTaskCode: task.code,
            speech: `S.U.P chốt hạ vị trí: Di chuyển kiểm tra Mã ${task.code}!`,
            speechJob: 'Đang giải nén hồ sơ công tác...',
            patrolledAt: new Date().toISOString(),
            isCheckIn: true
          });

          await sleepWithAbort(3500);
          if (signal.aborted) return;

          // Bước 2: Chào hỏi giám sát
          const supervisorGreetings = [
            `Robot ${task.code}, báo cáo tiến độ!`,
            `Kiểm tra mã ${task.code}. Tình hình sao rồi?`,
            `Supervisor gọi ${task.code}. Báo cáo ngay!`,
            `Check-in mã ${task.code}. Cập nhật nội dung thực hiện đi.`
          ];
          const greeting = supervisorGreetings[Math.floor(Math.random() * supervisorGreetings.length)];

          await setDoc(docRef, {
            isActive: true,
            currentTaskId: task.id,
            currentTaskCode: task.code,
            speech: greeting,
            speechJob: 'Sẵn sàng báo cáo!',
            patrolledAt: new Date().toISOString(),
            isCheckIn: true
          });

          await sleepWithAbort(4000);
          if (signal.aborted) return;

          // Let ROBOT JOB show it's analyzing
          await setDoc(docRef, {
            isActive: true,
            currentTaskId: task.id,
            currentTaskCode: task.code,
            speech: greeting,
            speechJob: 'Đang kết nối Gemini rà soát mục tiêu dựa trên QCD...',
            patrolledAt: new Date().toISOString(),
            isCheckIn: true
          });

          // Bước 3: Đối thoại AI - PHÂN TÍCH SẮC BÉN
          const cleanUpdate = (task.currentUpdate || "").replace(/<[^>]*>/g, "").trim();
          const cleanObjective = (task.objective || "").replace(/<[^>]*>/g, "").trim();
          const cleanTitle = (task.title || "").replace(/<[^>]*>/g, "").trim();

          const historyList = (task.history || [])
            .slice(-3)
            .map((h, i) => `Báo cáo ${i + 1}: "${h.content || ''}" (${h.timestamp ? h.timestamp.split('T')[0] : 'N/A'})`)
            .join(' | ');

          const systemPromptAndQuery = `
            BỐI CẢNH: Bạn đóng vai hai trí tuệ nhân tạo tuần tra trong Tổng cục Quản lý Chất lượng TÂN PHÚ VIỆT NAM (Phòng QLCL). Môi trường sản xuất thực tế cực kỳ gắt gao về tiến độ, tính kỷ luật và hiệu quả bám sát mục tiêu. Không chấp nhận kiểu báo cáo sáo rỗng, đối phó.

            THÔNG TIN CÔNG VIỆC THỰC TẾ (Mã việc: ${task.code}):
            - Tên việc: "${cleanTitle}"
            - Mục tiêu chính (QCD/Target): "${cleanObjective}"
            - Kỳ hạn/Hạn định: ${task.extensionDate || task.expectedEndDate || task.dueDate || "Chưa xác định"}
            - Báo cáo cập nhật từ nhân sự hiện tại: "${cleanUpdate || "TRỐNG - CHƯA BÁO CÁO CẬP NHẬT"}"
            - QUÉT LỊCH SỬ CÁC BÁO CÁO TRƯỚC ĐÓ (Hãy dùng thông tin này để so sánh độ tiến bộ/dứng im): ${historyList || "Chưa có lịch sử báo cáo cũ."}

            HÃY THỰC HIỆN PHÂN VAI VÀ ĐỐI THOẠI CỰC KỲ THỰC TẾ:

            1. ROBOT JOB (Trợ lý Phân tích Kỹ thuật Công việc):
               - Phong cách: Khách quan, sắc bén, đi thẳng vào số liệu hoặc lỗ hổng thực tế.
               - Nhiệm vụ:
                 - Quét đối chiếu lịch sử báo cáo với báo cáo hiện tại xem nhân sự có dẫm chân tại chỗ hoặc báo cáo trùng lắp không.
                 - HOÀN TOÀN CHỦ ĐỘNG HỎI hoặc chất vấn về KẾ HOẠCH SẮP TỚI ("Kế hoạch sắp tới là gì?").
                 - Nếu báo cáo bị TRỐNG hoặc hời hợt, phê bình dứt khoát lỗi "Báo cáo sơ sài", "Thiếu số liệu".
                 - Sử dụng văn phong thực tế văn phòng Việt Nam.
               - GIỚI HẠN: Dưới 25 từ.

            2. SUPERVISOR BOSS (Sếp Tổng Tuần Tra S.U.P):
               - Phong cách: Uy quyền, đanh thép, cực kỳ gắt gao, hướng về kết quả và ép sát sườn. Câu nói dứt khoát của một người quản lý trực tiếp quyền lực.
               - Nhiệm vụ: Xem xét ý kiến phân tích của Robot Job, lập tức HỐI THÚC NHÂN VIÊN/nhân sự thực hiện gắt gao, yêu cầu hoàn thành ngay hoặc làm rõ kế hoạch sắp tới.
               - GIỚI HẠN: Dưới 12 từ.

            3. HÀNH ĐỘNG KHẨN CẤP [LÀM NGAY]:
               - Một chỉ thị hành động cực kỳ hối thúc nhân sự làm ngay.
               - GIỚI HẠN: Dưới 5 từ (ví dụ: "Báo cáo kế hoạch gấp", "Giao nộp kết quả ngay", "Trình phương án mới").

            TRẢ VỀ ĐỊNH DẠNG JSON CHUẨN (KHÔNG ĐƯỢC CHỨA BẤT CỨ ĐOẠN DẪN GIẢI HOẶC CHỮ NÀO KHÁC NGOÀI JSON NÀY):
            {
              "assistantReply": "Nhận xét của Robot Job, nói rõ lịch sử cũ, hỏi kế hoạch mới ngắn gọn dưới 25 từ",
              "supervisorClosing": "Câu hối thúc đanh thép của Sếp Tổng dưới 12 từ",
              "nextAction": "Chỉ thị làm ngay dưới 5 từ"
            }
          `;

          let assistantReply = "Đã rà soát QCD đầy đủ.";
          let supervisorClosing = "Tập trung đẩy mạnh tiến độ!";
          let nextAction = "Báo cáo ngay";

          try {
            const responseText = await callGemini(systemPromptAndQuery);
            const jsonString = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
            if (jsonString) {
              const data = JSON.parse(jsonString || '{}');
              assistantReply = data.assistantReply || assistantReply;
              supervisorClosing = data.supervisorClosing || supervisorClosing;
              nextAction = data.nextAction || nextAction;
            }
          } catch (geminiError: any) {
            console.error("Patrol AI Error:", geminiError);
            if (geminiError?.message?.includes("quota") || geminiError?.message?.includes("429")) {
              assistantReply = "Hệ thống AI 'hết pin' (Quota). Robot sẽ tiếp tục tuần tra thủ công!";
            } else {
              assistantReply = "Robot đang bận rà soát dữ liệu kỹ thuật.";
            }
          }

          if (signal.aborted) return;

          // Update Firestore with Robot Job's feedback
          await setDoc(docRef, {
            isActive: true,
            currentTaskId: task.id,
            currentTaskCode: task.code,
            speech: greeting,
            speechJob: assistantReply,
            patrolledAt: new Date().toISOString(),
            isCheckIn: true
          });

          await sleepWithAbort(8000);
          if (signal.aborted) return;

          // Update Firestore with S.U.P Boss's closing & nextAction
          await setDoc(docRef, {
            isActive: true,
            currentTaskId: task.id,
            currentTaskCode: task.code,
            speech: supervisorClosing,
            speechJob: `[LÀM NGAY]: ${nextAction}`,
            patrolledAt: new Date().toISOString(),
            isCheckIn: true
          });

          await sleepWithAbort(9000);
          if (signal.aborted) return;

          // Update task in database & localStorage
          try {
            await updateDoc(doc(db, 'tasks', task.id), {
              patrolStatus: 'WAITING',
              lastPatrolTime: new Date().toISOString(),
              patrolReviewedByAdmin: false,
              lastPatrolResult: {
                assistantReply,
                supervisorClosing,
                nextAction,
                patrolledAt: new Date().toISOString()
              }
            });
          } catch (dbErr) {
            console.error("Failed to update patrol status in Firestore:", dbErr);
          }

          localStorage.setItem('last_patrolled_task_id', task.id);

          // Keep the dynamic dialogue bubble on-screen for the final 16 seconds
          await sleepWithAbort(16000);
          if (signal.aborted) return;

          // Step 5: Auto-rest
          await setDoc(docRef, {
            isActive: false,
            currentTaskId: null,
            currentTaskCode: '',
            speech: 'S.U.P hoàn thành tuần tra, đang nghỉ ngơi...',
            speechJob: '',
            patrolledAt: new Date().toISOString(),
            currentIndex: 0,
            isCheckIn: false
          });

        } catch (err: any) {
          if (err.message === 'Patrol Aborted') {
            console.log("Patrol was aborted manually.");
          } else {
            console.error("Error during patrol run:", err);
          }
        } finally {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        }
      };

      runSinglePatrol();

    } catch (e) {
      console.error("Failed to toggle patrol:", e);
    }
  }, [isAdmin]);

  // Auto-switch tab to 'tasks' when S.U.P robot is patrolling
  useEffect(() => {
    if (supState.isActive && supState.currentTaskId && activeTab !== 'tasks') {
      setActiveTab?.('tasks');
    }
  }, [supState.isActive, supState.currentTaskId, activeTab, setActiveTab]);

  // Client AUTO-SCROLL/JUMP & HIGHLIGHT trace logic for worker devices
  useEffect(() => {
    if (!supState.isActive || !supState.currentTaskId || activeTab !== 'tasks') return;

    // We schedule multiple scroll attempts to handle React render cycles and database sync lag (100ms to 1500ms)
    const scrollAttempts = [100, 300, 600, 1000, 1500];
    const timers = scrollAttempts.map(delay => {
      return setTimeout(() => {
        const idToMatch = supState.currentTaskId;
        if (!idToMatch) return;
        const baseIdToMatch = idToMatch.split('_cycle_')[0];

        // Robust DOM selection including exact matching, base ID matching, task-row ID formats & wildcard query matching
        let element = document.getElementById(`task-card-${idToMatch}`) || 
                      document.getElementById(`task-${idToMatch}`) ||
                      document.getElementById(`task-row-${idToMatch}`);
        
        if (!element) {
          element = document.getElementById(`task-card-${baseIdToMatch}`) || 
                    document.getElementById(`task-${baseIdToMatch}`) ||
                    document.getElementById(`task-row-${baseIdToMatch}`);
        }

        if (!element) {
          element = document.querySelector(`[id^="task-card-${idToMatch}"]`) ||
                    document.querySelector(`[id^="task-${idToMatch}"]`) ||
                    document.querySelector(`[id^="task-row-${idToMatch}"]`) ||
                    document.querySelector(`[id^="task-card-${baseIdToMatch}"]`) ||
                    document.querySelector(`[id^="task-${baseIdToMatch}"]`) ||
                    document.querySelector(`[id^="task-row-${baseIdToMatch}"]`) ||
                    document.querySelector(`[id*="${baseIdToMatch}"]`);
        }

        if (element) {
          try {
            // CỰC KỲ CHÍNH XÁC: Tính toán toạ độ tuyệt đối để cuộn mượt và căn chính giữa màn hình (tránh lag layout lồng nhau)
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - (window.innerHeight / 2) + (rect.height / 2);
            window.scrollTo({
              top: targetY,
              behavior: 'smooth'
            });
          } catch (scrollErr) {
            console.error("Vertical scroll failed: ", scrollErr);
            // Fallback an toàn chuẩn HTML
            if (element.tagName === 'TR') {
              const firstCell = element.querySelector('td');
              if (firstCell) {
                firstCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } else {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }, delay);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [supState.currentTaskId, supState.isActive, activeTab]);

  return {
    supState,
    togglePatrol,
    isAdmin
  };
};
