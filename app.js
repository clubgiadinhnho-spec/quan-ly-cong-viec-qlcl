const STORAGE_KEY = "task-tracker-demo-data-v2"; 
const MEMBERS = ["Nhật Trường", "Mỹ Tân", "Phan Tú", "Nhựt Hùng", "Khác"];

const state = {
  tasks: [],
  member: "all",
  search: "",
  activeTab: "active",
  activePage: "board"
};

const els = {
  taskForm: document.querySelector("#taskForm"),
  activeBody: document.querySelector("#activeTasksBody"),
  memberFilter: document.querySelector("#memberFilter"),
  searchInput: document.querySelector("#searchInput"),
  openCount: document.querySelector("#openCount"),
  doneCount: document.querySelector("#doneCount"),
  syncStatus: document.querySelector("#syncStatus"),
  openReportButton: document.querySelector("#openReportButton"),
  closeReportButton: document.querySelector("#closeReportButton"),
  pagePanels: { board: document.querySelector("#boardPage"), report: document.querySelector("#reportPage") }
};

init();

async function init() {
  hydrateSelects();
  bindEvents();
  await loadTasks();
  render();
}

function hydrateSelects() {
  const options = `<option value="all">Tất cả mọi người</option>` + 
    MEMBERS.map(m => `<option value="${m}">${m}</option>`).join("");
  if(els.memberFilter) els.memberFilter.innerHTML = options;
  if(els.taskForm.elements.assignee) {
    els.taskForm.elements.assignee.innerHTML = `<option value="">Chọn nhân viên</option>` + 
      MEMBERS.map(m => `<option value="${m}">${m}</option>`).join("");
  }
}

function bindEvents() {
  els.taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newTask = {
      id: crypto.randomUUID(),
      code: fd.get("code") || getNextCode(),
      title: fd.get("title"),
      goal: fd.get("goal"),
      assignee: fd.get("assignee"),
      createdAt: fd.get("createdAt"),
      startDate: fd.get("startDate"),
      dueDate: fd.get("dueDate"),
      previousWeek: fd.get("previousWeek"),
      thisWeek: fd.get("thisWeek"),
      endWeek: fd.get("endWeek"),
      isHot: false, 
      completed: false
    };
    state.tasks.unshift(newTask);
    saveTasks();
    e.target.reset();
    render();
  });

  if(els.memberFilter) els.memberFilter.addEventListener("change", (e) => { state.member = e.target.value; render(); });
  if(els.searchInput) els.searchInput.addEventListener("input", (e) => { state.search = e.target.value.toLowerCase(); render(); });
  
  if(els.openReportButton) els.openReportButton.onclick = () => { 
    els.pagePanels.board.classList.remove("active"); 
    els.pagePanels.report.classList.add("active"); 
  };
  if(els.closeReportButton) els.closeReportButton.onclick = () => { 
    els.pagePanels.report.classList.remove("active"); 
    els.pagePanels.board.classList.add("active"); 
  };
}

async function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  state.tasks = saved ? JSON.parse(saved) : [];
  els.syncStatus.textContent = state.tasks.length > 0 ? "Đã khôi phục dữ liệu cũ." : "Chưa có dữ liệu.";
}

function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }

function render() {
  const filtered = state.tasks.filter(t => {
    const m = state.member === "all" || t.assignee === state.member;
    const s = !state.search || JSON.stringify(t).toLowerCase().includes(state.search);
    return m && s && !t.completed;
  });

  els.activeBody.innerHTML = filtered.map(t => `
    <tr>
      <td class="col-compact"><input type="checkbox" class="task-checkbox" onchange="completeTask('${t.id}')"></td>
      <td><small><b>${t.code}</b></small></td>
      <td><span class="task-title">${t.title}</span></td>
      <td><small>${t.goal}</small></td>
      <td><small>${t.assignee}</small></td>
      <td><small>${t.startDate}</small></td>
      <td style="color:${isLate(t)?'red':'inherit'}"><small>${t.dueDate}</small></td>
      <td><textarea class="table-editor" onblur="updateTask('${t.id}','previousWeek',this.value)">${t.previousWeek}</textarea></td>
      <td><textarea class="table-editor" onblur="updateTask('${t.id}','thisWeek',this.value)">${t.thisWeek}</textarea></td>
      <td><textarea class="table-editor" onblur="updateTask('${t.id}','endWeek',this.value)">${t.endWeek}</textarea></td>
      <td class="col-compact"><input type="checkbox" ${t.isHot?'checked':''} onchange="updateTask('${t.id}','isHot',this.checked)"></td>
    </tr>
  `).join("");

  els.openCount.textContent = state.tasks.filter(t => !t.completed).length;
  els.doneCount.textContent = state.tasks.filter(t => t.completed).length;
}

// CÁC HÀM TOÀN CỤC ĐỂ GIAO DIỆN MỚI GỌI ĐƯỢC
window.completeTask = (id) => {
  const t = state.tasks.find(x => x.id === id);
  t.completed = true;
  t.completedAt = new Date().toISOString().slice(0,10);
  saveTasks(); render();
};

window.updateTask = (id, field, val) => {
  const t = state.tasks.find(x => x.id === id);
  if(t) {
    t[field] = val;
    saveTasks();
  }
};

function getNextCode() {
  const max = state.tasks.reduce((a, t) => Math.max(a, parseInt(String(t.code).replace('C','')) || 0), 0);
  return `C${max + 1}`;
}

function isLate(t) { 
    if(!t.dueDate) return false;
    return new Date() > new Date(t.dueDate) && !t.completed; 
}