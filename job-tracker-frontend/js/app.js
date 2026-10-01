/* =========================================================
   CareerFlow — Frontend application
   Vanilla JS SPA. No backend. State is persisted to localStorage.
   (Analytics page removed — dashboard already has charts/funnel)
   ========================================================= */

const state = {
  page: localStorage.getItem("careerflow_page") || "dashboard",
  applications: [], // populated asynchronously from the backend in boot()
  events: loadEvents(),
  settings: getSettings(),
  sidebarCollapsed: localStorage.getItem("careerflow_sidebar") === "1",
  trackerSearch: "",
  trackerStatus: "all",
  trackerCompany: "all",
  trackerSort: "updated",
  calendarDate: new Date(2026, 7, 25),
  calendarView: "month",
  activeApplication: null
};

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const icons = {
  dashboard: "▦", tracker: "▤", add: "+", calendar: "▣",
  settings: "⚙", logout: "↪", search: "⌕", bell: "♢", chevron: "⌄",
  menu: "☰", close: "×", edit: "✎", trash: "⌫", arrow: "→", check: "✓",
  filter: "≡", sort: "↕", spark: "✦", clock: "◷", link: "↗"
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dateObj(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  const d = dateObj(value);
  return d ? d.toLocaleDateString("en-IN", options) : "—";
}

function daysSince(value) {
  if (!value) return 0;
  const a = dateObj(value), b = dateObj(todayISO());
  return Math.floor((b - a) / 86400000);
}

function daysUntil(value) {
  if (!value) return Infinity;
  const a = dateObj(todayISO()), b = dateObj(value);
  return Math.ceil((b - a) / 86400000);
}

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.applied;
}

function initials(name = "") {
  return name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
}

function companyLogo(company) {
  const color = COMPANIES[company] || "#64748b";
  return `<div class="company-logo" style="--logo-color:${color}">${esc(initials(company))}</div>`;
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "!" : "i"}</span><div>${esc(message)}</div>`;
  toastRoot.appendChild(node);
  setTimeout(() => node.classList.add("show"), 10);
  setTimeout(() => { node.classList.remove("show"); setTimeout(() => node.remove(), 250); }, 3000);
}

function saveAndRefresh(message) {
  saveApplications(state.applications);
  render();
  if (message) toast(message);
}

function counts() {
  const c = {};
  Object.keys(STATUS_META).forEach(k => c[k] = state.applications.filter(a => a.status === k).length);
  return c;
}

function render() {
  localStorage.setItem("careerflow_page", state.page);
  app.innerHTML = `
    <div class="app-shell ${state.sidebarCollapsed ? "sidebar-collapsed" : ""}">
      ${renderSidebar()}
      <div class="main-shell">
        ${renderHeader()}
        <main class="main-content">${renderPage()}</main>
      </div>
    </div>
  `;
  bindGlobalEvents();
  if (state.page === "dashboard") drawDashboardCharts();
}

function renderSidebar() {
  const items = [
    ["dashboard", "Dashboard"],
    ["tracker", "Job Tracker"],
    ["add", "Add Application"],
    ["calendar", "Calendar"]
  ];
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">C</div>
        <div class="brand-copy"><strong>CareerFlow</strong><span>Career OS</span></div>
        <button class="icon-btn sidebar-toggle" title="Collapse sidebar">${icons.menu}</button>
      </div>
      <nav class="nav-section">
        <span class="nav-label">Workspace</span>
        ${items.map(([key,label]) => `
          <button class="nav-item ${state.page === key ? "active" : ""}" data-page="${key}">
            <span class="nav-icon">${icons[key]}</span><span class="nav-text">${label}</span>
          </button>`).join("")}
      </nav>
      <div class="sidebar-bottom">
        <span class="nav-label">Account</span>
        <button class="nav-item ${state.page === "settings" ? "active" : ""}" data-page="settings">
          <span class="nav-icon">${icons.settings}</span><span class="nav-text">Settings</span>
        </button>
        <button class="nav-item danger" data-action="logout">
          <span class="nav-icon">${icons.logout}</span><span class="nav-text">Logout</span>
        </button>
      </div>
      <div class="sidebar-profile">
        <div class="avatar">${initials(state.settings.name)}</div>
        <div class="profile-copy"><strong>${esc(state.settings.name)}</strong><span>${esc(state.settings.email)}</span></div>
      </div>
    </aside>
  `;
}

function renderHeader() {
  const pageTitles = {
    dashboard: ["Dashboard", "Good morning, Alex. Here’s your application pulse."],
    tracker: ["Job Tracker", "Manage every opportunity from first click to offer."],
    add: ["Add Application", "Capture the details while they are fresh."],
    calendar: ["Calendar", "Keep interviews, deadlines and follow-ups in view."],
    settings: ["Settings", "Tune your profile, reminders and workspace preferences."]
  };
  const [title, sub] = pageTitles[state.page];
  return `
    <header class="topbar">
      <div class="mobile-brand"><div class="brand-mark">C</div><strong>CareerFlow</strong></div>
      <div class="header-title"><h1>${title}</h1><p>${sub}</p></div>
      <div class="header-actions">
        <label class="global-search"><span>${icons.search}</span><input id="global-search" placeholder="Search applications..." value="${esc(state.trackerSearch)}"></label>
        <button class="icon-btn notification-btn" title="Notifications">${icons.bell}<i></i></button>
        <div class="profile-menu-wrap">
          <button class="profile-button" data-action="profile-menu">
            <div class="avatar">${initials(state.settings.name)}</div><span class="profile-name">${esc(state.settings.name.split(" ")[0])}</span><span>⌄</span>
          </button>
          <div class="profile-menu hidden" id="profile-menu">
            <button data-page="settings">⚙ Settings</button>
            <button data-action="logout">↪ Logout</button>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderPage() {
  switch (state.page) {
    case "tracker": return renderTracker();
    case "add": return renderAdd();
    case "calendar": return renderCalendar();
    case "settings": return renderSettings();
    default: return renderDashboard();
  }
}

function statCard(title, count, icon, tone, extra = "") {
  return `<div class="stat-card ${tone}">
    <div class="stat-top"><span>${icon}</span><small>${extra}</small></div>
    <strong>${count}</strong><label>${title}</label>
  </div>`;
}

function renderDashboard() {
  const c = counts();
  const total = state.applications.length;
  const followups = state.applications.filter(a => a.status !== "accepted" && a.status !== "rejected" && a.status !== "withdrawn" && daysSince(a.lastUpdated) >= 7);
  const upcoming = state.events.filter(e => daysUntil(e.date) >= 0).sort((a,b) => a.date.localeCompare(b.date)).slice(0,5);
  return `
    <section class="page">
      <div class="welcome-row">
        <div><span class="eyebrow">OVERVIEW</span><h2>Application command center</h2></div>
        <button class="btn primary" data-page="add">${icons.add} Add application</button>
      </div>
      <div class="stats-grid">
        ${statCard("Total Applications", total, "▦", "indigo", `${c.accepted + c.offer} positive`)}
        ${statCard("Wishlist", c.wishlist, "☆", "slate", "Pipeline")}
        ${statCard("Applied", c.applied, "↗", "blue", "Active")}
        ${statCard("Interviewing", c.interview, "◷", "orange", "Scheduled")}
        ${statCard("Technical Rounds", c.technical, "⌘", "cyan", "In process")}
        ${statCard("HR Rounds", c.hr, "♙", "pink", "In process")}
        ${statCard("Accepted", c.accepted, "✓", "green", "Closed won")}
        ${statCard("Rejected", c.rejected, "×", "red", "Closed lost")}
        ${statCard("Offers Received", c.offer, "◆", "emerald", "Action needed")}
      </div>

      <div class="dashboard-grid">
        <section class="panel chart-panel wide">
          <div class="panel-head"><div><h3>Application status</h3><p>Current distribution across your pipeline</p></div><button class="text-btn" data-page="tracker">View tracker ${icons.arrow}</button></div>
          <div class="chart-box donut-box"><canvas id="statusChart"></canvas></div>
        </section>
        <section class="panel chart-panel wide">
          <div class="panel-head"><div><h3>Applications per month</h3><p>Submitted applications over the last 6 months</p></div><span class="mini-pill">+18% vs. last period</span></div>
          <div class="chart-box"><canvas id="monthlyChart"></canvas></div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h3>Upcoming events</h3><p>Your next important dates</p></div><button class="icon-btn" data-page="calendar">→</button></div>
          <div class="event-list">
            ${upcoming.length ? upcoming.map(renderEventItem).join("") : emptyState("◷", "No upcoming events", "Your calendar is clear.")}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h3>Follow-up alerts</h3><p>Applications needing attention</p></div><span class="alert-count">${followups.length}</span></div>
          <div class="follow-list">
            ${followups.slice(0,5).map(a => `
              <button class="follow-item" data-app="${a.id}">
                ${companyLogo(a.company)}
                <span><strong>${esc(a.company)}</strong><small>${esc(a.jobTitle)}</small></span>
                <b class="${daysSince(a.lastUpdated) >= 14 ? "urgent-text" : ""}">${daysSince(a.lastUpdated)}d</b>
              </button>`).join("") || emptyState("✓", "All caught up", "No follow-up is overdue.")}
          </div>
        </section>

        <section class="panel wide">
          <div class="panel-head"><div><h3>Success funnel</h3><p>Where applications are moving forward</p></div></div>
          <div class="funnel">
            ${[
              ["Wishlist", c.wishlist + c.applied + c.assessment + c.interview + c.technical + c.hr + c.offer + c.accepted],
              ["Applied", c.applied + c.assessment + c.interview + c.technical + c.hr + c.offer + c.accepted],
              ["Interview", c.interview + c.technical + c.hr + c.offer + c.accepted],
              ["Technical", c.technical + c.hr + c.offer + c.accepted],
              ["HR", c.hr + c.offer + c.accepted],
              ["Offer", c.offer + c.accepted],
              ["Accepted", c.accepted]
            ].map(([label,n],i) => `<div class="funnel-step" style="--w:${Math.max(12, Math.round((n / Math.max(1,total))*100))}%"><span>${label}</span><strong>${n}</strong></div>`).join("")}
          </div>
        </section>

        <section class="panel wide">
          <div class="panel-head"><div><h3>Recent activity</h3><p>Latest changes across your applications</p></div></div>
          <div class="activity-list">
            ${state.applications.flatMap(a => (a.history || []).slice(-1).map(h => ({a,h}))).sort((x,y)=>y.h[0].localeCompare(x.h[0])).slice(0,6).map(({a,h}) => `
              <button class="activity-item" data-app="${a.id}">
                ${companyLogo(a.company)}
                <span><strong>${esc(a.company)}</strong><small>${esc(h[1])}</small></span>
                <time>${formatDate(h[0])}</time>
              </button>`).join("")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderEventItem(e) {
  const appItem = state.applications.find(a => a.id === e.appId);
  return `<button class="event-item" data-app="${e.appId}">
    <div class="event-date"><strong>${dateObj(e.date).getDate()}</strong><span>${dateObj(e.date).toLocaleDateString("en-IN",{month:"short"})}</span></div>
    <span class="event-dot ${e.type}"></span>
    <span class="event-copy"><strong>${esc(e.title)}</strong><small>${appItem ? esc(appItem.jobTitle) : ""}${e.time ? ` · ${e.time}` : ""}</small></span>
  </button>`;
}

function emptyState(icon, title, text) {
  return `<div class="empty-state"><div>${icon}</div><strong>${title}</strong><p>${text}</p></div>`;
}

function renderTracker() {
  const filtered = getFilteredApps();
  const statuses = ["wishlist","applied","assessment","interview","technical","hr","offer","accepted","rejected"];
  return `
    <section class="page">
      <div class="page-toolbar">
        <div class="toolbar-search"><span>${icons.search}</span><input id="tracker-search" placeholder="Search company or job title..." value="${esc(state.trackerSearch)}"></div>
        <select id="status-filter"><option value="all">All statuses</option>${Object.entries(STATUS_META).map(([k,v])=>`<option value="${k}" ${state.trackerStatus===k?"selected":""}>${v.label}</option>`).join("")}</select>
        <select id="company-filter"><option value="all">All companies</option>${Object.keys(COMPANIES).map(c=>`<option value="${esc(c)}" ${state.trackerCompany===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
        <select id="sort-filter">
          <option value="updated" ${state.trackerSort==="updated"?"selected":""}>Recently updated</option>
          <option value="deadline" ${state.trackerSort==="deadline"?"selected":""}>Deadline soonest</option>
          <option value="priority" ${state.trackerSort==="priority"?"selected":""}>Priority</option>
          <option value="company" ${state.trackerSort==="company"?"selected":""}>Company A–Z</option>
        </select>
        <button class="btn primary" data-page="add">${icons.add} Quick add</button>
      </div>
      <div class="tracker-summary">
        <span><b>${filtered.length}</b> applications shown</span>
        <span><i class="legend yellow"></i> Follow-up needed</span>
        <span><i class="legend red"></i> Deadline approaching</span>
        <span><i class="legend green"></i> Active progress</span>
      </div>
      <div class="kanban-wrap">
        <div class="kanban-board">
          ${statuses.map(status => {
            const cards = filtered.filter(a => a.status === status);
            return `<section class="kanban-column" data-status="${status}">
              <div class="column-head"><div><span class="status-dot" style="background:${statusMeta(status).color}"></span><strong>${statusMeta(status).short}</strong></div><span>${cards.length}</span></div>
              <div class="drop-zone" data-drop-status="${status}">
                ${cards.map(renderApplicationCard).join("") || `<div class="column-empty">Drop applications here</div>`}
              </div>
            </section>`;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderApplicationCard(a) {
  const stale = a.status !== "accepted" && a.status !== "rejected" && a.status !== "withdrawn" && daysSince(a.lastUpdated) >= 7;
  const urgent = a.deadline && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 3;
  const active = ["interview","technical","hr","offer"].includes(a.status);
  return `<article class="job-card ${stale ? "stale" : ""} ${urgent ? "urgent" : ""} ${active ? "progressing" : ""}" draggable="true" data-app="${a.id}">
    <div class="job-card-top">
      ${companyLogo(a.company)}
      <div class="job-card-company"><strong>${esc(a.company)}</strong><span>${esc(a.location)}</span></div>
      <button class="more-btn" data-action="card-menu" data-id="${a.id}">•••</button>
    </div>
    <h4>${esc(a.jobTitle)}</h4>
    <div class="job-meta"><span>${esc(a.jobType)}</span><span>·</span><span>${esc(a.mode)}</span></div>
    ${a.salary ? `<div class="salary">${esc(a.salary)}</div>` : ""}
    <div class="badges"><span class="badge mode">${esc(a.mode)}</span><span class="badge priority ${a.priority}">${esc(a.priority)}</span></div>
    <div class="job-dates">
      <span>Applied <b>${a.dateApplied ? formatDate(a.dateApplied) : "Not yet"}</b></span>
      ${a.deadline ? `<span class="${urgent ? "deadline-danger" : ""}">Deadline <b>${formatDate(a.deadline)}</b></span>` : ""}
    </div>
    ${stale ? `<div class="follow-indicator ${daysSince(a.lastUpdated)>=14?"urgent":""}">${daysSince(a.lastUpdated)>=14?"Urgent":"Follow up"} · ${daysSince(a.lastUpdated)}d inactive</div>` : ""}
    <div class="card-actions">
      <button data-action="view" data-id="${a.id}">View</button>
      <button data-action="edit" data-id="${a.id}">Edit</button>
      <button data-action="delete" data-id="${a.id}" class="danger-text">Delete</button>
    </div>
  </article>`;
}

function getFilteredApps() {
  let apps = [...state.applications];
  const q = state.trackerSearch.trim().toLowerCase();
  if (q) apps = apps.filter(a => `${a.company} ${a.jobTitle} ${a.location}`.toLowerCase().includes(q));
  if (state.trackerStatus !== "all") apps = apps.filter(a => a.status === state.trackerStatus);
  if (state.trackerCompany !== "all") apps = apps.filter(a => a.company === state.trackerCompany);
  if (state.trackerSort === "updated") apps.sort((a,b)=>b.lastUpdated.localeCompare(a.lastUpdated));
  if (state.trackerSort === "deadline") apps.sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999"));
  if (state.trackerSort === "company") apps.sort((a,b)=>a.company.localeCompare(b.company));
  if (state.trackerSort === "priority") {
    const p = {high:1, medium:2, low:3}; apps.sort((a,b)=>p[a.priority]-p[b.priority]);
  }
  return apps;
}

function renderAdd(editId = null) {
  const a = editId ? state.applications.find(x=>x.id===editId) : null;
  const x = a || {
    company:"", website:"", logoUrl:"", jobTitle:"", jobType:"Internship", mode:"Remote", location:"",
    status:"wishlist", priority:"medium", dateApplied:todayISO(), deadline:"", assessmentDate:"",
    interviewDate:"", technicalDate:"", hrDate:"", offerDate:"", salary:"", offeredSalary:"",
    jobUrl:"", companyUrl:"", resume:"", portfolio:"", linkedin:"", notes:"",
    recruiter:"", recruiterEmail:"", recruiterPhone:""
  };
  return `
    <section class="page form-page">
      <div class="form-header">
        <div><span class="eyebrow">${a ? "EDIT APPLICATION" : "NEW APPLICATION"}</span><h2>${a ? "Edit application" : "Add a new application"}</h2><p>Keep the complete recruitment context in one place.</p></div>
        <button class="btn ghost" data-page="tracker">Cancel</button>
      </div>
      <form id="application-form" class="application-form" data-edit-id="${editId || ""}">
        ${formSection("Company information", `
          <div class="form-grid">
            ${field("Company Name","company","text",x.company,true)}
            ${field("Company Website","website","url",x.website)}
            ${field("Company Logo URL","logoUrl","url",x.logoUrl)}
          </div>`)}
        ${formSection("Job information", `
          <div class="form-grid">
            ${field("Job Title","jobTitle","text",x.jobTitle,true)}
            ${selectField("Job Type","jobType",["Full Time","Internship","Part Time","Contract"],x.jobType)}
            ${selectField("Work Mode","mode",["Remote","Hybrid","Onsite"],x.mode)}
            ${field("Location","location","text",x.location)}
          </div>`)}
        ${formSection("Application tracking", `
          <div class="form-grid">
            ${selectField("Current Status","status",Object.keys(STATUS_META),x.status,true,true)}
            ${selectField("Priority","priority",["high","medium","low"],x.priority)}
            ${field("Date Applied","dateApplied","date",x.dateApplied)}
            ${field("Application Deadline","deadline","date",x.deadline)}
          </div>`)}
        ${formSection("Recruitment process", `
          <div class="form-grid four">
            ${field("Assessment Date","assessmentDate","date",x.assessmentDate)}
            ${field("Interview Date","interviewDate","date",x.interviewDate)}
            ${field("Technical Round","technicalDate","date",x.technicalDate)}
            ${field("HR Round Date","hrDate","date",x.hrDate)}
            ${field("Offer Date","offerDate","date",x.offerDate)}
          </div>`)}
        ${formSection("Compensation", `
          <div class="form-grid">
            ${field("Expected Salary / Stipend","salary","text",x.salary)}
            ${field("Offered Salary / Stipend","offeredSalary","text",x.offeredSalary)}
          </div>`)}
        ${formSection("Resources", `
          <div class="form-grid">
            ${field("Job Description URL","jobUrl","url",x.jobUrl)}
            ${field("Company Careers URL","companyUrl","url",x.companyUrl)}
            ${field("Resume Version Used","resume","text",x.resume)}
            ${field("Portfolio URL","portfolio","url",x.portfolio)}
            ${field("LinkedIn URL","linkedin","url",x.linkedin)}
          </div>`)}
        ${formSection("Notes", `<label class="field full"><span>Application notes</span><textarea name="notes" rows="7" placeholder="Interview prep, role details, questions, compensation notes...">${esc(x.notes)}</textarea></label>`)}
        ${formSection("Recruiter information", `
          <div class="form-grid">
            ${field("Recruiter Name","recruiter","text",x.recruiter)}
            ${field("Recruiter Email","recruiterEmail","email",x.recruiterEmail)}
            ${field("Recruiter Phone","recruiterPhone","tel",x.recruiterPhone)}
          </div>`)}
        <div class="form-actions">
          <button type="button" class="btn ghost" data-action="reset-form">Reset form</button>
          <div><button type="button" class="btn secondary" data-action="save-draft">Save as draft</button><button type="submit" class="btn primary">${a ? "Save changes" : "Save application"}</button></div>
        </div>
      </form>
    </section>
  `;
}

function field(label,name,type,value,required=false) {
  return `<label class="field"><span>${label}${required?" *":""}</span><input name="${name}" type="${type}" value="${esc(value)}" ${required?"required":""}></label>`;
}
function selectField(label,name,values,value,required=false,statusKeys=false) {
  return `<label class="field"><span>${label}${required?" *":""}</span><select name="${name}" ${required?"required":""}>${values.map(v => {
    const val = statusKeys ? v : v;
    const text = statusKeys ? STATUS_META[v].label : v;
    return `<option value="${esc(val)}" ${val===value?"selected":""}>${esc(text)}</option>`;
  }).join("")}</select></label>`;
}
function formSection(title, body) {
  return `<section class="form-section"><h3>${title}</h3>${body}</section>`;
}

function renderCalendar() {
  const d = state.calendarDate;
  const month = d.getMonth(), year = d.getFullYear();
  const events = calendarEventsForMonth(year, month);
  return `
    <section class="page">
      <div class="calendar-toolbar">
        <div><h2>${d.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</h2><p>${events.length} events this month</p></div>
        <div class="calendar-controls"><button class="icon-btn" data-action="calendar-prev">‹</button><button class="btn ghost" data-action="calendar-today">Today</button><button class="icon-btn" data-action="calendar-next">›</button><select id="calendar-view"><option value="month" ${state.calendarView==="month"?"selected":""}>Month</option><option value="agenda" ${state.calendarView==="agenda"?"selected":""}>Agenda</option></select></div>
      </div>
      <div class="calendar-layout">
        <section class="panel calendar-panel">${state.calendarView==="month" ? renderMonthGrid(year,month) : renderAgenda(events)}</section>
        <aside class="panel upcoming-panel"><div class="panel-head"><div><h3>Upcoming</h3><p>Next 10 important dates</p></div></div>${renderUpcomingEvents()}</aside>
      </div>
    </section>`;
}

function calendarEventsForMonth(year, month) {
  return state.events.filter(e => {
    const d = dateObj(e.date);
    return d && d.getFullYear() === year && d.getMonth() === month;
  });
}

function renderMonthGrid(year,month) {
  const first = new Date(year,month,1);
  const start = (first.getDay()+6)%7;
  const days = new Date(year,month+1,0).getDate();
  let cells = "";
  for(let i=0;i<start;i++) cells += `<div class="calendar-cell muted"></div>`;
  for(let day=1;day<=days;day++) {
    const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const dayEvents = state.events.filter(e=>e.date===iso);
    cells += `<div class="calendar-cell ${iso===todayISO()?"today":""}">
      <span class="day-number">${day}</span>
      <div class="day-events">${dayEvents.slice(0,3).map(e=>`<button class="calendar-event ${e.type}" data-app="${e.appId}">${esc(e.title)}</button>`).join("")}${dayEvents.length>3?`<small>+${dayEvents.length-3} more</small>`:""}</div>
    </div>`;
  }
  return `<div class="calendar-grid"><div class="calendar-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar-days">${cells}</div></div>`;
}

function renderAgenda(events) {
  const sorted = [...events].sort((a,b)=>a.date.localeCompare(b.date));
  return `<div class="agenda-list">${sorted.map(renderEventItem).join("") || emptyState("▣","No events","Nothing scheduled for this month.")}</div>`;
}

function renderUpcomingEvents() {
  const events = state.events.filter(e=>daysUntil(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
  return `<div class="upcoming-list">${events.map(renderEventItem).join("") || emptyState("✓","No upcoming events","You’re all clear.")}</div>`;
}

function renderSettings() {
  const s=state.settings;
  return `
    <section class="page settings-page">
      <div class="form-header"><div><span class="eyebrow">PREFERENCES</span><h2>Workspace settings</h2><p>Control your profile and reminder behavior.</p></div></div>
      <div class="settings-layout">
        <section class="panel">
          <div class="settings-section"><div><h3>Profile</h3><p>How your account appears across CareerFlow.</p></div>
            <div class="settings-form">
              ${field("Full Name","settingsName","text",s.name)}
              ${field("Email","settingsEmail","email",s.email)}
            </div>
          </div>
          <div class="settings-section"><div><h3>Notifications</h3><p>Choose how aggressively CareerFlow reminds you.</p></div>
            <div class="setting-row"><div><strong>Email reminders</strong><span>Receive follow-up reminder notifications.</span></div><button class="toggle ${s.emailReminders?"on":""}" data-action="toggle-reminders"><i></i></button></div>
            <div class="setting-row"><div><strong>Default follow-up interval</strong><span>Highlight applications after this many inactive days.</span></div><select id="reminder-days"><option value="7" ${s.reminderDays==7?"selected":""}>7 days</option><option value="14" ${s.reminderDays==14?"selected":""}>14 days</option><option value="30" ${s.reminderDays==30?"selected":""}>30 days</option></select></div>
          </div>
          <div class="settings-section"><div><h3>Appearance</h3><p>Theme support is ready for expansion.</p></div>
            <div class="setting-row"><div><strong>Theme</strong><span>Light mode is enabled for this demo.</span></div><span class="theme-pill">☀ Light</span></div>
          </div>
          <div class="form-actions"><span></span><button class="btn primary" data-action="save-settings">Save preferences</button></div>
        </section>
        <aside class="panel profile-preview"><div class="large-avatar">${initials(s.name)}</div><h3>${esc(s.name)}</h3><p>${esc(s.email)}</p><span class="pro-badge">CareerFlow member</span><div class="preview-stat"><span>Applications</span><strong>${state.applications.length}</strong></div><div class="preview-stat"><span>Offers</span><strong>${counts().offer+counts().accepted}</strong></div></aside>
      </div>
    </section>`;
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-page]").forEach(el => el.addEventListener("click", () => {
    state.page = el.dataset.page;
    if (state.page !== "add") state.editingId = null;
    render();
  }));
  document.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", e => handleAction(e.currentTarget.dataset.action, e.currentTarget)));
  const gs=document.getElementById("global-search");
  if(gs) gs.addEventListener("input", e=>{state.trackerSearch=e.target.value; if(state.page!=="tracker") return; render();});
  const ts=document.getElementById("tracker-search");
  if(ts) ts.addEventListener("input", e=>{state.trackerSearch=e.target.value; render();});
  const sf=document.getElementById("status-filter");
  if(sf) sf.addEventListener("change", e=>{state.trackerStatus=e.target.value;render();});
  const cf=document.getElementById("company-filter");
  if(cf) cf.addEventListener("change", e=>{state.trackerCompany=e.target.value;render();});
  const sort=document.getElementById("sort-filter");
  if(sort) sort.addEventListener("change", e=>{state.trackerSort=e.target.value;render();});
  const cv=document.getElementById("calendar-view");
  if(cv) cv.addEventListener("change",e=>{state.calendarView=e.target.value;render();});
  const form=document.getElementById("application-form");
  if(form) form.addEventListener("submit", e=>submitApplication(e, false));
  document.querySelectorAll("[data-app]").forEach(el=>{
    el.addEventListener("click", e=>{
      if(e.target.closest("button") && !e.target.closest(".follow-item") && !e.target.closest(".event-item") && !e.target.closest(".activity-item") && !e.target.closest(".calendar-event")) return;
      openDetails(el.dataset.app);
    });
  });
  bindDragDrop();
}

function bindDragDrop() {
  document.querySelectorAll(".job-card").forEach(card=>{
    card.addEventListener("dragstart", e=>{e.dataTransfer.setData("text/plain",card.dataset.app);card.classList.add("dragging");});
    card.addEventListener("dragend", ()=>card.classList.remove("dragging"));
  });
  document.querySelectorAll(".drop-zone").forEach(zone=>{
    zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("drag-over");});
    zone.addEventListener("dragleave",()=>zone.classList.remove("drag-over"));
    zone.addEventListener("drop", async e=>{
      e.preventDefault();zone.classList.remove("drag-over");
      const id=e.dataTransfer.getData("text/plain"), newStatus=zone.dataset.dropStatus;
      const a=state.applications.find(x=>x.id===id);
      if(a && a.status!==newStatus){
        try {
          const updated = await updateApplicationRemote(id, { ...a, status: newStatus });
          Object.assign(a, updated);
          render();
          toast(`${a.company} moved to ${STATUS_META[newStatus].label}`);
        } catch (err) {
          console.error(err);
          toast("Could not update status. Make sure the backend server is running.", "error");
        }
      }
    });
  });
}

function handleAction(action, el) {
  switch(action) {
    case "logout":
      localStorage.removeItem("careerflow_authenticated");
      renderAuth();
      break;
    case "profile-menu":
      document.getElementById("profile-menu")?.classList.toggle("hidden");
      break;
    case "view": openDetails(el.dataset.id); break;
    case "edit": state.page="add"; state.editingId=el.dataset.id; render(); break;
    case "delete": deleteApplication(el.dataset.id); break;
    case "card-menu": openDetails(el.dataset.id); break;
    case "reset-form": document.getElementById("application-form")?.reset(); break;
    case "save-draft": submitApplication({preventDefault:()=>{}}, true); break;
    case "calendar-prev": state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()-1,1);render();break;
    case "calendar-next": state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()+1,1);render();break;
    case "calendar-today": state.calendarDate=new Date(2026,7,25);render();break;
    case "toggle-reminders": state.settings.emailReminders=!state.settings.emailReminders; render(); break;
    case "save-settings":
      state.settings.name=document.querySelector('[name="settingsName"]')?.value || state.settings.name;
      state.settings.email=document.querySelector('[name="settingsEmail"]')?.value || state.settings.email;
      state.settings.reminderDays=Number(document.getElementById("reminder-days")?.value || 7);
      saveSettings(state.settings); render(); toast("Preferences saved");
      break;
  }
}

async function submitApplication(e, draft) {
  e.preventDefault();
  const form=document.getElementById("application-form");
  const data=Object.fromEntries(new FormData(form).entries());
  if(!data.company || !data.jobTitle) { toast("Company name and job title are required","error"); return; }
  if(draft) data.status="wishlist";
  const editId=form.dataset.editId;
  try {
    if(editId) {
      const updated = await updateApplicationRemote(editId, data);
      const idx = state.applications.findIndex(x=>x.id===editId);
      if(idx !== -1) state.applications[idx] = updated;
    } else {
      const created = await createApplicationRemote({ ...data, status: data.status || "wishlist" });
      state.applications.unshift(created);
    }
    state.page="tracker"; state.editingId=null; render();
    toast(draft ? "Draft saved" : "Application saved");
  } catch (err) {
    console.error(err);
    toast("Could not save. Make sure the backend server (app.py) is running.", "error");
  }
}

async function deleteApplication(id) {
  const a=state.applications.find(x=>x.id===id);
  if(!a) return;
  if(!confirm(`Remove ${a.company} — ${a.jobTitle}?`)) return;
  try {
    await deleteApplicationRemote(id);
    state.applications=state.applications.filter(x=>x.id!==id);
    render();toast("Application removed");
  } catch (err) {
    console.error(err);
    toast("Could not delete. Make sure the backend server (app.py) is running.", "error");
  }
}

function openDetails(id) {
  const a=state.applications.find(x=>x.id===id); if(!a)return;
  state.activeApplication=id;
  const stale=daysSince(a.lastUpdated)>=7, urgent=a.deadline && daysUntil(a.deadline)>=0 && daysUntil(a.deadline)<=3;
  modalRoot.innerHTML=`<div class="drawer-backdrop" data-action="close-modal"><aside class="details-drawer" onclick="event.stopPropagation()">
    <div class="drawer-head"><div><span class="eyebrow">APPLICATION</span><h2>${esc(a.company)}</h2></div><button class="icon-btn" data-action="close-modal">${icons.close}</button></div>
    <div class="drawer-company">${companyLogo(a.company)}<div><strong>${esc(a.jobTitle)}</strong><span>${esc(a.location)} · ${esc(a.mode)}</span></div><span class="status-chip" style="--status-color:${statusMeta(a.status).color}">${statusMeta(a.status).label}</span></div>
    <div class="drawer-alerts">${stale?`<div class="inline-alert yellow">⚠ No update for ${daysSince(a.lastUpdated)} days. Follow up.</div>`:""}${urgent?`<div class="inline-alert red">! Deadline in ${daysUntil(a.deadline)} days.</div>`:""}</div>
    <div class="drawer-section"><h3>Quick status</h3><select id="drawer-status">${Object.entries(STATUS_META).map(([k,v])=>`<option value="${k}" ${k===a.status?"selected":""}>${v.label}</option>`).join("")}</select></div>
    <div class="drawer-grid">${detail("Priority",a.priority)}${detail("Date applied",formatDate(a.dateApplied))}${detail("Deadline",formatDate(a.deadline))}${detail("Salary",a.salary||"—")}${detail("Recruiter",a.recruiter||"—")}${detail("Recruiter email",a.recruiterEmail||"—")}</div>
    <div class="drawer-section"><h3>Recruitment timeline</h3><div class="timeline">${(a.history||[]).map(h=>`<div class="timeline-item"><i></i><span><b>${esc(h[1])}</b><small>${formatDate(h[0],{month:"short",day:"numeric",year:"numeric"})}</small></span></div>`).join("")}</div></div>
    <div class="drawer-section"><h3>Notes</h3><div class="notes-box">${esc(a.notes||"No notes added yet.")}</div></div>
    <div class="drawer-section"><h3>Resources</h3><div class="resource-list">${a.jobUrl?`<a href="${esc(a.jobUrl)}" target="_blank">${icons.link} Job description</a>`:""}${a.companyUrl?`<a href="${esc(a.companyUrl)}" target="_blank">${icons.link} Company careers</a>`:""}${a.portfolio?`<a href="${esc(a.portfolio)}" target="_blank">${icons.link} Portfolio</a>`:""}</div></div>
    <div class="drawer-actions"><button class="btn ghost" data-action="edit" data-id="${a.id}">Edit application</button><button class="btn primary" data-action="delete" data-id="${a.id}">Delete</button></div>
  </aside></div>`;
  document.getElementById("drawer-status").addEventListener("change", async e=>{
    const next=e.target.value;
    try {
      const updated = await updateApplicationRemote(a.id, { ...a, status: next });
      Object.assign(a, updated);
      openDetails(a.id);render();toast("Status updated");
    } catch (err) {
      console.error(err);
      toast("Could not update status. Make sure the backend server is running.", "error");
    }
  });
  modalRoot.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>handleModalAction(btn.dataset.action,btn)));
}

function detail(label,value){return `<div class="detail-cell"><span>${label}</span><strong>${esc(value)}</strong></div>`;}

function handleModalAction(action,el){
  if(action==="close-modal"){modalRoot.innerHTML="";return;}
  if(action==="edit"){modalRoot.innerHTML="";state.page="add";state.editingId=el.dataset.id;render();return;}
  if(action==="delete"){modalRoot.innerHTML="";deleteApplication(el.dataset.id);}
}

function drawDashboardCharts() {
  const statusCtx=document.getElementById("statusChart"), monthCtx=document.getElementById("monthlyChart");
  if(!statusCtx || !monthCtx || typeof Chart==="undefined")return;
  const c=counts(), keys=["wishlist","applied","assessment","interview","technical","hr","offer","accepted","rejected"];
  new Chart(statusCtx,{type:"doughnut",data:{labels:keys.map(k=>STATUS_META[k].short),datasets:[{data:keys.map(k=>c[k]),backgroundColor:keys.map(k=>STATUS_META[k].color),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{position:"right",labels:{usePointStyle:true,padding:16,font:{family:"Inter",size:11}}}}}});
  const labels=["Mar","Apr","May","Jun","Jul","Aug"], data=[2,4,3,5,8,10];
  new Chart(monthCtx,{type:"bar",data:{labels,datasets:[{label:"Applications",data,borderRadius:7,backgroundColor:"#6366f1",maxBarThickness:28}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:"#eef2f7"},ticks:{stepSize:2}},x:{grid:{display:false}}}}});
}

function renderAuth() {
  app.innerHTML=`<div class="auth-shell"><section class="auth-visual"><div class="auth-brand"><div class="brand-mark">C</div><strong>CareerFlow</strong></div><div class="visual-content"><span class="eyebrow">YOUR CAREER, ORGANIZED</span><h1>Turn applications into <em>momentum.</em></h1><p>One calm workspace for every role, interview, follow-up and offer.</p><div class="visual-card"><div class="fake-window"><div class="fake-dots">● ● ●</div><div class="fake-bars"><i></i><i></i><i></i></div><div class="fake-chart"><span></span><span></span><span></span><span></span><span></span></div></div></div></div><div class="auth-footer">Designed for focused job seekers · Frontend demo</div></section>
  <section class="auth-form-wrap"><div class="auth-form" id="auth-form"></div></section></div>`;
  renderLogin();
}

function renderLogin() {
  document.getElementById("auth-form").innerHTML=`<div class="auth-heading"><span class="eyebrow">WELCOME BACK</span><h2>Sign in to CareerFlow</h2><p>Continue where you left off.</p></div>
    <form id="login-form">
      ${field("Email","email","email","alex@example.com",true)}
      ${field("Password","password","password","",true)}
      <div class="login-row"><label><input type="checkbox" checked> Remember me</label><a href="#" onclick="event.preventDefault();toast('Password reset flow can be connected later.','info')">Forgot password?</a></div>
      <button class="btn primary wide-btn" type="submit">Login ${icons.arrow}</button>
    </form>
    <div class="auth-switch">New to CareerFlow? <button id="show-register">Create an account</button></div>`;
  document.getElementById("login-form").addEventListener("submit", async e=>{
    e.preventDefault();
    localStorage.setItem("careerflow_authenticated","1");
    state.applications = await loadApplications();
    state.page="dashboard";render();toast("Welcome back, Alex");
  });
  document.getElementById("show-register").addEventListener("click",renderRegister);
}

function renderRegister() {
  document.getElementById("auth-form").innerHTML=`<div class="auth-heading"><span class="eyebrow">GET STARTED</span><h2>Create your account</h2><p>Build your personal application command center.</p></div>
    <form id="register-form">
      ${field("Full Name","name","text","Alex Morgan",true)}
      ${field("Email","email","email","",true)}
      ${field("Password","password","password","",true)}
      ${field("Confirm Password","confirm","password","",true)}
      <button class="btn primary wide-btn" type="submit">Create account ${icons.arrow}</button>
    </form>
    <div class="auth-switch">Already have an account? <button id="show-login">Sign in</button></div>`;
  document.getElementById("register-form").addEventListener("submit", async e=>{
    e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries());
    if(data.password!==data.confirm){toast("Passwords do not match","error");return;}
    state.settings.name=data.name;state.settings.email=data.email;saveSettings(state.settings);
    localStorage.setItem("careerflow_authenticated","1");
    state.applications = await loadApplications();
    state.page="dashboard";render();toast("Account created");
  });
  document.getElementById("show-login").addEventListener("click",renderLogin);
}

(async function boot(){
  if(localStorage.getItem("careerflow_authenticated")!=="1") {
    renderAuth();
  } else {
    state.applications = await loadApplications();
    render();
  }
})();