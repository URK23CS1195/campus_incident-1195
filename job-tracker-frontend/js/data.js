/* =========================================================
   CareerFlow — Data layer (connected to Flask backend)
   Applications now come from the API. Events/settings still
   use localStorage since the backend doesn't cover those yet.
   ========================================================= */

const API_BASE = "http://localhost:5000";

// ---- Status config (unchanged — used by app.js) ----
const STATUS_META = {
  wishlist:  { label: "Wishlist",     short: "Wishlist",   color: "#64748b" },
  applied:   { label: "Applied",      short: "Applied",    color: "#3b82f6" },
  assessment:{ label: "Assessment",   short: "Assessment", color: "#8b5cf6" },
  interview: { label: "Interviewing", short: "Interview",  color: "#f97316" },
  technical: { label: "Technical Round", short: "Technical", color: "#06b6d4" },
  hr:        { label: "HR Round",     short: "HR",         color: "#ec4899" },
  offer:     { label: "Offer",        short: "Offer",      color: "#10b981" },
  accepted:  { label: "Accepted",     short: "Accepted",   color: "#22c55e" },
  rejected:  { label: "Rejected",     short: "Rejected",   color: "#ef4444" }
};

const COMPANIES = {
  "Google": "#4285F4", "Microsoft": "#00A4EF", "Amazon": "#FF9900",
  "Cognizant": "#1B3A63", "Infosys": "#007CC3", "TCS": "#004F9F",
  "Accenture": "#A100FF", "Deloitte": "#86BC25", "Wipro": "#341F65", "IBM": "#054ADA"
};

// ---------------------------------------------------------------------------
// Field-name translators: backend uses snake_case, frontend uses camelCase
// ---------------------------------------------------------------------------
function fromApi(a) {
  return {
    id: a.id,
    company: a.company,
    website: a.website || "",
    logoUrl: a.logo_url || "",
    jobTitle: a.job_title,
    jobType: a.job_type || "Internship",
    mode: a.mode || "Remote",
    location: a.location || "",
    status: a.status,
    priority: a.priority || "medium",
    dateApplied: a.date_applied || "",
    deadline: a.deadline || "",
    assessmentDate: a.assessment_date || "",
    interviewDate: a.interview_date || "",
    technicalDate: a.technical_date || "",
    hrDate: a.hr_date || "",
    offerDate: a.offer_date || "",
    salary: a.salary || "",
    offeredSalary: a.offered_salary || "",
    jobUrl: a.job_url || "",
    companyUrl: a.company_url || "",
    resume: a.resume || "",
    portfolio: a.portfolio || "",
    linkedin: a.linkedin || "",
    notes: a.notes || "",
    recruiter: a.recruiter || "",
    recruiterEmail: a.recruiter_email || "",
    recruiterPhone: a.recruiter_phone || "",
    lastUpdated: a.last_updated,
    history: a.history || []
  };
}

function toApi(a) {
  return {
    company: a.company, website: a.website, logoUrl: a.logoUrl,
    jobTitle: a.jobTitle, jobType: a.jobType, mode: a.mode, location: a.location,
    status: a.status, priority: a.priority, dateApplied: a.dateApplied,
    deadline: a.deadline, assessmentDate: a.assessmentDate, interviewDate: a.interviewDate,
    technicalDate: a.technicalDate, hrDate: a.hrDate, offerDate: a.offerDate,
    salary: a.salary, offeredSalary: a.offeredSalary, jobUrl: a.jobUrl,
    companyUrl: a.companyUrl, resume: a.resume, portfolio: a.portfolio,
    linkedin: a.linkedin, notes: a.notes, recruiter: a.recruiter,
    recruiterEmail: a.recruiterEmail, recruiterPhone: a.recruiterPhone
  };
}

// ---------------------------------------------------------------------------
// API functions — these replace the old localStorage functions
// ---------------------------------------------------------------------------
async function loadApplications() {
  try {
    const res = await fetch(`${API_BASE}/applications`);
    if (!res.ok) throw new Error("Failed to fetch applications");
    const data = await res.json();
    return data.map(fromApi);
  } catch (e) {
    console.error("Could not load applications from server", e);
    if (typeof toast === "function") toast("Could not reach the server. Is app.py running?", "error");
    return [];
  }
}

// Creates ONE new application on the server and returns it (with real id)
async function createApplicationRemote(applicationData) {
  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(applicationData))
  });
  if (!res.ok) throw new Error("Failed to create application");
  const created = await res.json();
  return fromApi(created);
}

// Updates ONE existing application on the server and returns the fresh copy
async function updateApplicationRemote(id, applicationData) {
  const res = await fetch(`${API_BASE}/applications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(applicationData))
  });
  if (!res.ok) throw new Error("Failed to update application");
  const updated = await res.json();
  return fromApi(updated);
}

async function deleteApplicationRemote(id) {
  const res = await fetch(`${API_BASE}/applications/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete application");
  return true;
}

// Kept for compatibility — no-op now, since every change already saves
// itself to the server the moment it happens (see createApplicationRemote,
// updateApplicationRemote, deleteApplicationRemote above).
function saveApplications() {}

// ---------------------------------------------------------------------------
// Events + Settings — still local for now (backend doesn't cover these yet)
// ---------------------------------------------------------------------------
function defaultEvents() { return []; }

function loadEvents() {
  try {
    const raw = localStorage.getItem("careerflow_events");
    if (!raw) { const seed = defaultEvents(); saveEvents(seed); return seed; }
    return JSON.parse(raw);
  } catch (e) { return defaultEvents(); }
}

function saveEvents(events) {
  try { localStorage.setItem("careerflow_events", JSON.stringify(events)); }
  catch (e) { console.error("Failed to save events", e); }
}

function getSettings() {
  try {
    const raw = localStorage.getItem("careerflow_settings");
    if (!raw) {
      const defaults = { name: "Alex Morgan", email: "alex@example.com", emailReminders: true, reminderDays: 7 };
      saveSettings(defaults);
      return defaults;
    }
    return JSON.parse(raw);
  } catch (e) {
    return { name: "Alex Morgan", email: "alex@example.com", emailReminders: true, reminderDays: 7 };
  }
}

function saveSettings(settings) {
  try { localStorage.setItem("careerflow_settings", JSON.stringify(settings)); }
  catch (e) { console.error("Failed to save settings", e); }
}