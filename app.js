const MEMBERS = ["Nhật Trường", "Mỹ Tân", "Phan Tú", "Nhựt Hùng", "Khác"];
const STORAGE_KEY = "task-tracker-demo-data-v2";

const DEMO_TASKS = [
  {
    id: crypto.randomUUID(),
    activeOrder: 1,
    code: "C133",
    title: "Thống kê tổng hợp khiếu nại khách hàng của các chi nhánh và báo cáo hàng tuần",
    goal: "Báo cáo BLĐ để nắm tình hình chất lượng",
    assignee: "Nhựt Hùng",
    createdAt: "2026-04-13",
    startDate: "2026-04-13",
    dueDate: "2026-04-26",
    previousWeek: "Đã báo cáo theo dõi KNKH W15 đến BLĐ.",
    thisWeek: "Tiếp tục tổng hợp dữ liệu phát sinh và rà soát đầu mục cần ưu tiên.",
    endWeek: "Chốt báo cáo W16 và cập nhật các trường hợp mới.",
    isHot: true,
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    activeOrder: 2,
    code: "C599",
    title: "Cập nhật danh mục hàng mẫu thử nghiệm, gửi NCC và theo dõi phản hồi",
    goal: "Đáp ứng yêu cầu đầu ra",
    assignee: "Nhựt Hùng",
    createdAt: "2026-03-31",
    startDate: "2026-03-31",
    dueDate: "2026-05-31",
    previousWeek: "Đã trao đổi với NCC và chốt danh sách gửi thử.",
    thisWeek: "Đang chờ phản hồi cuối cùng từ NCC.",
    endWeek: "Gửi nhắc lại các đầu mục chưa phản hồi và tổng hợp kết quả.",
    isHot: false,
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    activeOrder: 3,
    code: "C934",
    title: "Theo dõi các đơn SHTT nước ngoài cho thị trường Mỹ và khu vực",
    goal: "Đáp ứng yêu cầu BLĐ",
    assignee: "Mỹ Tân",
    createdAt: "2025-12-20",
    startDate: "2025-12-20",
    dueDate: "2026-05-10",
    previousWeek: "Làm rõ nghị trình TGĐ phê duyệt chi phí phức đáp.",
    thisWeek: "Lập danh sách gửi luật sư để bổ sung hồ sơ.",
    endWeek: "Theo dõi phản hồi và cập nhật lịch nộp bổ sung.",
    isHot: true,
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    activeOrder: 4,
    code: "C1060",
    title: "Theo dõi mẫu Event cho VNM và cập nhật phản hồi khách hàng",
    goal: "Đáp ứng yêu cầu KD",
    assignee: "Phan Tú",
    createdAt: "2025-04-28",
    startDate: "2025-04-28",
    dueDate: "2026-05-01",
    previousWeek: "Theo dõi 11 mẫu chờ phản hồi.",
    thisWeek: "Nhắc bộ phận KD cập nhật phản hồi của khách.",
    endWeek: "Chốt các mẫu đạt và chuyển sang bước tiếp theo.",
    isHot: false,
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    activeOrder: 5,
    code: "C1119",
    title: "Rà soát thông tư về tự công bố sản phẩm theo hợp đồng gia công mới",
    goal: "Phù hợp NĐ 15, NĐ 43, NĐ 111",
    assignee: "Mỹ Tân",
    createdAt: "2025-06-30",
    startDate: "2025-06-30",
    dueDate: "2026-04-20",
    previousWeek: "Theo dõi và tick vào danh mục HSTCB.",
    thisWeek: "Hoàn tất cập nhật hồ sơ.",
    endWeek: "Đã chốt xong hồ sơ bàn giao.",
    isHot: true,
    completed: true,
    completedAt: "2026-04-22",
  },
];

const els = {
  memberFilter: document.querySelector("#memberFilter"),
  searchInput: document.querySelector("#searchInput"),
  viewMode: document.querySelector("#viewMode"),
  taskForm: document.querySelector("#taskForm"),
  activeBody: document.querySelector("#activeTasksBody"),
  completedBody: document.querySelector("#completedTasksBody"),
  openCount: document.querySelector("#openCount"),
  doneCount: document.querySelector("#doneCount"),
  syncStatus: document.querySelector("#syncStatus"),
  reportMonth: document.querySelector("#reportMonth"),
  reportCompletedCount: document.querySelector("#reportCompletedCount"),
  reportOnTimeCount: document.querySelector("#reportOnTimeCount"),
  reportLateCount: document.querySelector("#reportLateCount"),
  reportHotCount: document.querySelector("#reportHotCount"),
  reportMemberBody: document.querySelector("#reportMemberBody"),
  reportProminentList: document.querySelector("#reportProminentList"),
  emptyReportTemplate: document.querySelector("#emptyReportTemplate"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate"),
  emptyCompletedTemplate: document.querySelector("#emptyCompletedTemplate"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  openReportButton: document.querySelector("#openReportButton"),
  closeReportButton: document.querySelector("#closeReportButton"),
  tabPanels: {
    active: document.querySelector("#activeTab"),
    completed: document.querySelector("#completedTab"),
  },
  pagePanels: {
    board: document.querySelector("#boardPage"),
    report: document.querySelector("#reportPage"),
  },
};

const state = {
  tasks: [],
  member: "all",
  search: "",
  activeTab: "active",
  activePage: "board",
  mode: "demo",
  reportMonth: "",
};

const supabaseConfig = window.TASK_TRACKER_SUPABASE ?? null;

init();

async function init() {
  hydrateSelects();
  bindEvents();
  await loadTasks();
  seedMissingMetadata();
  hydrateReportMonthOptions();
  refreshNextCode();
  render();
}

function hydrateSelects() {
  const memberOptions = [`<option value="all">Tất cả mọi người</option>`]
    .concat(MEMBERS.map((member) => `<option value="${member}">${member}</option>`))
    .join("");

  els.memberFilter.innerHTML = memberOptions;

  const formSelect = els.taskForm.elements.assignee;
  formSelect.innerHTML = `<option value="">Chọn người thực hiện</option>${MEMBERS.map(
    (member) => `<option value="${member}">${member}</option>`,
  ).join("")}`;
}

function bindEvents() {
  els.memberFilter.addEventListener("change", (event) => {
    state.member = event.target.value;
    render();
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextCode = formData.get("code").trim().toUpperCase() || getNextTaskCode();
    const nextTask = {
      id: crypto.randomUUID(),
      activeOrder: getNextActiveOrder(),
      code: nextCode,
      title: formData.get("title").trim(),
      goal: formData.get("goal").trim(),
      assignee: formData.get("assignee"),
      createdAt: parseInputDate(formData.get("createdAt")) || todayISO(),
      startDate: parseInputDate(formData.get("startDate")) || todayISO(),
      dueDate: parseInputDate(formData.get("dueDate")),
      previousWeek: formData.get("previousWeek").trim(),
      thisWeek: formData.get("thisWeek").trim(),
      endWeek: formData.get("endWeek").trim(),
      isHot: false,
      completed: false,
      completedAt: null,
    };

    state.tasks.unshift(nextTask);
    await persistTask(nextTask, "insert");
    event.currentTarget.reset();
    refreshNextCode();
    render();
  });

  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  els.openReportButton?.addEventListener("click", () => setPage("report"));
  els.closeReportButton?.addEventListener("click", () => setPage("board"));

  els.reportMonth.addEventListener("change", (event) => {
    state.reportMonth = event.target.value;
    renderReports();
  });
}

async function loadTasks() {
  if (supabaseConfig?.url && supabaseConfig?.anonKey) {
    try {
      state.mode = "supabase";
      els.viewMode.value = "supabase";
      els.syncStatus.textContent = "Đang đồng bộ dữ liệu dùng chung qua Supabase.";
      state.tasks = await supabaseFetchTasks();
      return;
    } catch (error) {
      console.error(error);
      els.syncStatus.textContent =
        "Không kết nối được Supabase, đang chuyển sang dữ liệu demo cục bộ.";
    }
  }

  state.mode = "demo";
  els.viewMode.value = "demo";
  const saved = localStorage.getItem(STORAGE_KEY);
  state.tasks = saved ? JSON.parse(saved) : DEMO_TASKS;
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_TASKS));
  }
}

async function persistTask(task, operation) {
  if (state.mode === "supabase") {
    await supabasePersistTask(task, operation);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function render() {
  const filtered = getFilteredTasks();
  const activeTasks = filtered
    .filter((task) => !task.completed)
    .sort((a, b) => (a.activeOrder ?? 0) - (b.activeOrder ?? 0));
  const completedTasks = filtered
    .filter((task) => task.completed)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  els.openCount.textContent = state.tasks.filter((task) => !task.completed).length;
  els.doneCount.textContent = state.tasks.filter((task) => task.completed).length;

  renderActive(activeTasks);
  renderCompleted(completedTasks);
  syncTabs();
  syncPages();
  renderReports();
  equalizeWeeklyEditors();
}

function getFilteredTasks() {
  return state.tasks.filter((task) => {
    const memberMatch = state.member === "all" || task.assignee === state.member;
    const searchMatch =
      !state.search ||
      [
        task.code,
        task.title,
        task.goal,
        task.assignee,
        task.previousWeek,
        task.thisWeek,
        task.endWeek,
      ]
        .join(" ")
        .toLowerCase()
        .includes(state.search);

    return memberMatch && searchMatch;
  });
}

function renderActive(tasks) {
  els.activeBody.innerHTML = "";

  if (tasks.length === 0) {
    els.activeBody.append(els.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  tasks.forEach((task) => {
    const row = document.createElement("tr");
    row.className = `task-row ${statusRowClass(task)}`;
    row.innerHTML = `
      <td class="cell-check"><input class="task-checkbox" type="checkbox" aria-label="Hoàn thành ${task.code}" /></td>
      <td class="cell-compact vertical-code-cell"><span class="pill vertical-pill">${escapeHtml(task.code)}</span></td>
      <td class="cell-date-compact vertical-date-cell">${formatVerticalDate(task.createdAt)}</td>
      <td>
        <span class="task-title">${escapeHtml(task.title)}</span>
      </td>
      <td>${escapeHtml(task.goal)}</td>
      <td><span class="pill person ${personClass(task.assignee)}">${escapeHtml(task.assignee)}</span></td>
      <td class="cell-date-compact vertical-date-cell">${formatVerticalDate(task.startDate)}</td>
      <td class="cell-date-compact vertical-date-cell ${isOverdue(task) ? "overdue" : ""}">${formatVerticalDate(task.dueDate)}</td>
      <td><textarea class="table-editor" data-field="previousWeek">${escapeHtml(task.previousWeek)}</textarea></td>
      <td><textarea class="table-editor" data-field="thisWeek">${escapeHtml(task.thisWeek)}</textarea></td>
      <td><textarea class="table-editor" data-field="endWeek">${escapeHtml(task.endWeek)}</textarea></td>
      <td class="cell-check"><input class="task-checkbox hot-checkbox" type="checkbox" ${task.isHot ? "checked" : ""} aria-label="CHECK ${task.code}" /></td>
    `;

    row.querySelector(".task-checkbox").addEventListener("change", async () => {
      task.completed = true;
      task.completedAt = todayISO();
      await persistTask(task, "update");
      setTab("completed");
      render();
    });

    row.querySelector(".hot-checkbox").addEventListener("change", async (event) => {
      task.isHot = event.target.checked;
      await persistTask(task, "update");
      renderReports();
    });

    row.querySelectorAll(".table-editor").forEach((editor) => {
      editor.addEventListener("input", () => {
        equalizeWeeklyEditors();
      });

      editor.addEventListener("change", async () => {
        syncRowEditorsToTask(row, task);
        await persistTask(task, "update");
      });

      editor.addEventListener("blur", async () => {
        const nextValue = editor.value.trim();
        if (task[editor.dataset.field] === nextValue) return;
        syncRowEditorsToTask(row, task);
        await persistTask(task, "update");
        render();
      });
    });

    els.activeBody.append(row);
  });
}

function renderCompleted(tasks) {
  els.completedBody.innerHTML = "";

  if (tasks.length === 0) {
    els.completedBody.append(els.emptyCompletedTemplate.content.cloneNode(true));
    return;
  }

  tasks.forEach((task) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="pill success">${escapeHtml(task.code)}</span></td>
      <td>
        <span class="task-title">${escapeHtml(task.title)}</span>
        <span class="task-sub">${escapeHtml(task.goal)}</span>
      </td>
      <td>${escapeHtml(task.assignee)}</td>
      <td>${formatDate(task.startDate)}</td>
      <td>${formatDate(task.completedAt)}</td>
      <td>${escapeHtml(task.endWeek || task.thisWeek || task.previousWeek || "Hoàn thành")}</td>
      <td><button class="undo-row-button" type="button">Hoàn tác</button></td>
    `;

    row.querySelector(".undo-row-button").addEventListener("click", async () => {
      task.completed = false;
      task.completedAt = null;
      task.activeOrder = getNextActiveOrder();
      await persistTask(task, "update");
      setTab("active");
      refreshNextCode();
      render();
    });

    els.completedBody.append(row);
  });
}

function syncRowEditorsToTask(row, task) {
  row.querySelectorAll(".table-editor").forEach((editor) => {
    task[editor.dataset.field] = editor.value.trim();
  });
}

function setTab(tab) {
  state.activeTab = tab;
  syncTabs();
}

function syncTabs() {
  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });

  Object.entries(els.tabPanels).forEach(([name, panel]) => {
    panel.classList.toggle("active", name === state.activeTab);
  });
}

function setPage(page) {
  state.activePage = page;
  syncPages();
}

function syncPages() {
  Object.entries(els.pagePanels).forEach(([name, panel]) => {
    panel.classList.toggle("active", name === state.activePage);
  });
}

function equalizeWeeklyEditors() {
  const rows = [...els.activeBody.querySelectorAll("tr")];
  rows.forEach((row) => {
    const editors = [...row.querySelectorAll(".table-editor")];
    if (editors.length === 0) return;

    editors.forEach((editor) => {
      editor.style.height = "auto";
    });

    const maxHeight = Math.max(...editors.map((editor) => Math.max(editor.scrollHeight, 88)));
    editors.forEach((editor) => {
      editor.style.height = `${maxHeight}px`;
    });
  });
}

function hydrateReportMonthOptions() {
  const monthValues = getAvailableReportMonths();
  if (monthValues.length === 0) {
    const currentMonth = todayISO().slice(0, 7);
    monthValues.push(currentMonth);
  }

  if (!state.reportMonth) {
    state.reportMonth = monthValues[0];
  }

  els.reportMonth.innerHTML = monthValues
    .map((value) => `<option value="${value}">${formatMonthLabel(value)}</option>`)
    .join("");
  els.reportMonth.value = state.reportMonth;
}

function getAvailableReportMonths() {
  const monthSet = new Set();
  state.tasks.forEach((task) => {
    const sourceDate = task.completedAt || task.createdAt || task.startDate;
    if (sourceDate) {
      monthSet.add(String(sourceDate).slice(0, 7));
    }
  });

  return [...monthSet].sort((a, b) => b.localeCompare(a));
}

function formatMonthLabel(value) {
  const [year, month] = value.split("-");
  return `Tháng ${month}/${year}`;
}

function renderReports() {
  hydrateReportMonthOptions();
  const monthTasks = state.tasks.filter((task) => isTaskInReportMonth(task, state.reportMonth));
  const completedTasks = monthTasks.filter((task) => task.completed && task.completedAt?.startsWith(state.reportMonth));
  const onTimeTasks = completedTasks.filter((task) => task.completedAt <= task.dueDate);
  const lateTasks = completedTasks.filter((task) => task.completedAt > task.dueDate);
  const prominentTasks = monthTasks.filter((task) => task.isHot);

  els.reportCompletedCount.textContent = String(completedTasks.length);
  els.reportOnTimeCount.textContent = String(onTimeTasks.length);
  els.reportLateCount.textContent = String(lateTasks.length);
  els.reportHotCount.textContent = String(prominentTasks.length);

  renderMemberReport(monthTasks, completedTasks, onTimeTasks, lateTasks);
  renderProminentReport(prominentTasks);
}

function isTaskInReportMonth(task, month) {
  return [task.completedAt, task.createdAt, task.startDate].some((value) => String(value ?? "").startsWith(month));
}

function renderMemberReport(monthTasks, completedTasks, onTimeTasks, lateTasks) {
  const rows = MEMBERS.map((member) => {
    const all = monthTasks.filter((task) => task.assignee === member).length;
    const onTime = onTimeTasks.filter((task) => task.assignee === member).length;
    const late = lateTasks.filter((task) => task.assignee === member).length;
    const completed = completedTasks.filter((task) => task.assignee === member).length;

    return `
      <tr>
        <td>${member}</td>
        <td>${completed || all}</td>
        <td>${onTime}</td>
        <td>${late}</td>
      </tr>
    `;
  }).join("");

  els.reportMemberBody.innerHTML = rows;
}

function renderProminentReport(tasks) {
  els.reportProminentList.innerHTML = "";

  if (tasks.length === 0) {
    els.reportProminentList.append(els.emptyReportTemplate.content.cloneNode(true));
    return;
  }

  tasks
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((task) => {
      const card = document.createElement("article");
      card.className = "prominent-item";
      card.innerHTML = `
        <div class="prominent-top">
          <span class="pill">${escapeHtml(task.code)}</span>
          <span class="pill person report-person ${personClass(task.assignee)}">${escapeHtml(task.assignee)}</span>
        </div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.goal)}</p>
      `;
      els.reportProminentList.append(card);
    });
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatVerticalDate(value) {
  const formatted = formatDate(value);
  return formatted.replaceAll("/", "<br />");
}

function todayISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().slice(0, 10);
}

function parseInputDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return raw;

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month}-${day}`;
}

function getNextTaskCode() {
  const numbers = state.tasks
    .map((task) => {
      const match = String(task.code ?? "").toUpperCase().match(/^C(\d+)$/);
      return match ? Number(match[1]) : null;
    })
    .filter((value) => Number.isFinite(value));

  const nextNumber = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `C${nextNumber}`;
}

function refreshNextCode() {
  const codeInput = els.taskForm.elements.code;
  if (!codeInput) return;
  codeInput.value = getNextTaskCode();
}

function getNextActiveOrder() {
  const orders = state.tasks
    .map((task) => task.activeOrder)
    .filter((value) => Number.isFinite(value));
  return (orders.length ? Math.max(...orders) : 0) + 1;
}

function seedMissingMetadata() {
  let changed = false;
  state.tasks.forEach((task, index) => {
    if (!Number.isFinite(task.activeOrder)) {
      task.activeOrder = index + 1;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }
}

function isOverdue(task) {
  return !task.completed && task.dueDate < todayISO();
}

function statusLabel(task) {
  if (task.completed) return "Hoàn thành";
  if (isOverdue(task)) return "Quá hạn";
  if (daysRemaining(task) <= 3) return "Sắp tới hạn";
  return "Đang theo dõi";
}

function statusClass(task) {
  if (task.completed) return "status-done";
  if (isOverdue(task)) return "status-overdue";
  if (daysRemaining(task) <= 3) return "status-warning";
  return "status-open";
}

function statusRowClass(task) {
  if (task.completed) return "row-done";
  if (isOverdue(task)) return "row-overdue";
  if (daysRemaining(task) <= 3) return "row-warning";
  return "row-open";
}

function personClass(assignee) {
  switch (assignee) {
    case "Nhật Trường":
      return "person-nhat-truong";
    case "Mỹ Tân":
      return "person-my-tan";
    case "Phan Tú":
      return "person-phan-tu";
    case "Nhựt Hùng":
      return "person-nhut-hung";
    default:
      return "person-khac";
  }
}

function daysRemaining(task) {
  const today = new Date(todayISO());
  const due = new Date(task.dueDate);
  return Math.ceil((due - today) / 86400000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function supabaseFetchTasks() {
  const response = await fetch(`${supabaseConfig.url}/rest/v1/tasks?select=*&order=created_at.desc`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows.map(mapSupabaseTask);
}

async function supabasePersistTask(task, operation) {
  const payload = {
    id: task.id,
    active_order: task.activeOrder,
    code: task.code,
    title: task.title,
    goal: task.goal,
    assignee: task.assignee,
    created_at: task.createdAt,
    start_date: task.startDate,
    due_date: task.dueDate,
    previous_week: task.previousWeek,
    this_week: task.thisWeek,
    end_week: task.endWeek,
    is_hot: task.isHot,
    completed: task.completed,
    completed_at: task.completedAt,
  };

  const endpoint =
    operation === "insert"
      ? `${supabaseConfig.url}/rest/v1/tasks`
      : `${supabaseConfig.url}/rest/v1/tasks?id=eq.${encodeURIComponent(task.id)}`;

  const response = await fetch(endpoint, {
    method: operation === "insert" ? "POST" : "PATCH",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Supabase save failed: ${response.status}`);
  }

  els.syncStatus.textContent = "Đã cập nhật dữ liệu dùng chung thành công.";
}

function supabaseHeaders() {
  return {
    apikey: supabaseConfig.anonKey,
    Authorization: `Bearer ${supabaseConfig.anonKey}`,
  };
}

function mapSupabaseTask(row) {
  return {
    id: row.id,
    activeOrder: row.active_order ?? 0,
    code: row.code,
    title: row.title,
    goal: row.goal,
    assignee: row.assignee,
    createdAt: row.created_at,
    startDate: row.start_date ?? row.created_at,
    dueDate: row.due_date,
    previousWeek: row.previous_week ?? "",
    thisWeek: row.this_week ?? "",
    endWeek: row.end_week ?? "",
    isHot: row.is_hot ?? false,
    completed: row.completed,
    completedAt: row.completed_at,
  };
}
