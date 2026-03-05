/*************************
 * Policy Brief Studio UI
 * Frontend-only version with placeholders.
 *************************/

const $ = (id) => document.getElementById(id);

/* ---------- Theme toggle (Sun ↔ Moon) ---------- */
const themeToggle = $("themeToggle");
const themeIcon = $("themeIcon");

function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pbs_theme", theme);
  themeIcon.innerHTML = theme === "dark" ? moonSvg() : sunSvg();
}
function initTheme(){
  const saved = localStorage.getItem("pbs_theme");
  setTheme(saved || "dark");
}
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(current === "dark" ? "light" : "dark");
});
function sunSvg(){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="2"/>
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
function moonSvg(){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M21 13.2A7.5 7.5 0 0 1 10.8 3 6.8 6.8 0 1 0 21 13.2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

/* ---------- App state ---------- */
const state = {
  topic: "",
  question: "",
  documents: [],
  datasets: [],
  stanceText: "",
  pollsText: "",
  expertsText: "",
  reportTitle: "",
  reports: [],
  activeReportId: null,
  video: { status: "idle", reportId: null, voice: "Ava", ready: false, blob: null }
};

let stepIndex = 0;

/* ---------- 5 steps ---------- */
const steps = [
  { id: "q",     name: "Define the Question", desc: "Choose the topic and your one-sentence policy question.", render: renderStep1, validate: validateStep1 },
  { id: "sources", name: "Upload sources", desc: "Upload PDFs, notes, and datasets. Review what to include.", render: renderStep2, validate: validateStep2 },
  { id: "args",  name: "Your arguments and perspectives", desc: "Draft a short stance in sentences or bullet points.", render: renderStep3, validate: validateStep3 },
  { id: "brief", name: "Download your brief", desc: "We generate the report and let you iterate versions.", render: renderStep4, validate: () => ({ ok: true }) },
  { id: "video", name: "Download a 3 min presentation", desc: "Pick a report version and generate a short presentation.", render: renderStep5, validate: () => ({ ok: true }) }
];

/* ---------- Navigation ---------- */
const views = { home: $("viewHome"), how: $("viewHow"), start: $("viewStart") };
const navHome = $("navHome");
const navHow  = $("navHow");
const navStart = $("navStart");

function showView(which){
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[which].classList.remove("hidden");
  [navHome, navHow, navStart].forEach(a => a.classList.remove("active"));
  if(which === "home") navHome.classList.add("active");
  if(which === "how") navHow.classList.add("active");
  if(which === "start") navStart.classList.add("active");
}

navHome.addEventListener("click", (e)=>{ e.preventDefault(); showView("home"); });
navHow.addEventListener("click", (e)=>{ e.preventDefault(); showView("how"); renderHow(); });
navStart.addEventListener("click", (e)=>{ e.preventDefault(); showView("start"); ensureWizardStart(); });

/* ---------- Home start button ---------- */
const startBtn = $("startBtn");
const topicInput = $("topicInput");
const questionInput = $("questionInput");
const startError = $("startError");

startBtn.addEventListener("click", () => {
  const t = (topicInput.value || "").trim();
  const q = (questionInput.value || "").trim();
  startError.classList.add("hidden");

  if(!t || !q){
    startError.textContent = "Please provide a topic and a one-sentence policy question.";
    startError.classList.remove("hidden");
    return;
  }

  state.topic = t;
  state.question = q;
  if(!state.reportTitle) state.reportTitle = t;

  showView("start");
  stepIndex = 0;
  renderWizard();
});

/* ---------- Wizard controls ---------- */
const backBtn = $("backBtn");
const nextBtn = $("nextBtn");
const wizardError = $("wizardError");
const stepTitle = $("stepTitle");
const stepDesc = $("stepDesc");
const stepContent = $("stepContent");
const progressLabel = $("progressLabel");
const timelineHome = $("timelineHome");
const timelineWizard = $("timelineWizard");
const versionsCard = $("versionsCard");
const versionsList = $("versionsList");
const wizardGrid = $("wizardGrid");

backBtn.addEventListener("click", () => {
  wizardError.classList.add("hidden");
  if(stepIndex > 0){
    stepIndex -= 1;
    renderWizard();
  } else {
    showView("home");
  }
});

nextBtn.addEventListener("click", async () => {
  wizardError.classList.add("hidden");
  const v = steps[stepIndex].validate();
  if(!v.ok){
    wizardError.textContent = v.msg || "Please fix issues before continuing.";
    wizardError.classList.remove("hidden");
    return;
  }

  // Step 3 -> Step 4 triggers generation
  if(steps[stepIndex].id === "args"){
    stepIndex = 3;
    await renderWizardWithGeneration();
    return;
  }

  if(stepIndex < steps.length - 1){
    stepIndex += 1;
    renderWizard();
  }
});

/* ---------- Wizard render ---------- */
function ensureWizardStart(){
  stepIndex = 0;
  renderWizard();
}

function renderWizard(){
  renderTimeline(timelineWizard, stepIndex);
  renderTimeline(timelineHome, stepIndex);

  progressLabel.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
  stepTitle.textContent = steps[stepIndex].name;
  stepDesc.textContent = steps[stepIndex].desc;

  stepContent.innerHTML = "";
  steps[stepIndex].render(stepContent);

  backBtn.textContent = (stepIndex === 0) ? "Back to Home" : "Back";
  nextBtn.textContent = (stepIndex === steps.length - 1) ? "Finish" : "Next";

  // IMPORTANT: Step 1–3 => single column (full width); Step 4–5 => show versions and use 2 columns
  if(stepIndex >= 3){
    versionsCard.classList.remove("hidden");
    wizardGrid.classList.remove("single");
    renderVersionsPanel();
  } else {
    versionsCard.classList.add("hidden");
    wizardGrid.classList.add("single"); // THIS FIXES the empty right area
  }
}

function renderTimeline(root, activeIndex){
  root.innerHTML = "";
  steps.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "stepItem";
    if(i === activeIndex) div.classList.add("active");
    if(i < activeIndex) div.classList.add("done");

    const badge = document.createElement("div");
    badge.className = "stepBadge";
    badge.textContent = `${i+1}`;

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "stepName";
    name.textContent = stepDisplayName(s.id);
    const mini = document.createElement("div");
    mini.className = "stepMini";
    mini.textContent = shortStepHint(s.id);
    info.appendChild(name);
    info.appendChild(mini);

    div.appendChild(badge);
    div.appendChild(info);

    div.addEventListener("click", () => {
      if(i <= activeIndex){
        stepIndex = i;
        renderWizard();
        return;
      }
      for(let k=0; k<i; k++){
        const chk = steps[k].validate();
        if(!chk.ok){
          stepIndex = k;
          wizardError.textContent = chk.msg || "Please complete this step first.";
          wizardError.classList.remove("hidden");
          renderWizard();
          return;
        }
      }
      stepIndex = i;
      renderWizard();
    });

    root.appendChild(div);
  });
}

function stepDisplayName(id){
  if(id === "q") return "Step 1. Define the Question";
  if(id === "sources") return "Step 2. Upload sources";
  if(id === "args") return "Step 3. Add your arguments";
  if(id === "brief") return "Step 4. Download your brief";
  if(id === "video") return "Step 5. Download presentation";
  return "Step";
}
function shortStepHint(id){
  if(id === "q") return "Topic + one-sentence question";
  if(id === "sources") return "PDFs / notes / datasets";
  if(id === "args") return "Stance + optional viewpoints";
  if(id === "brief") return "Generate + iterate versions";
  if(id === "video") return "Voice + export presentation";
  return "";
}

/* ---------- Step 1 ---------- */
function renderStep1(root){
  stepTitle.textContent = "Choose the topic";

  const t = document.createElement("input");
  t.className = "input";
  t.placeholder = "Topic";
  t.value = state.topic || "";
  t.addEventListener("input", () => {
    state.topic = t.value;
    if(!state.reportTitle) state.reportTitle = t.value;
  });

  const q = document.createElement("textarea");
  q.className = "textarea";
  q.rows = 2;
  q.placeholder = "Policy question (one sentence)";
  q.value = state.question || "";
  q.addEventListener("input", () => state.question = q.value);

  root.appendChild(label("Topic"));
  root.appendChild(t);
  root.appendChild(label("Policy question (one sentence)"));
  root.appendChild(q);
}
function validateStep1(){
  if(!state.topic.trim() || !state.question.trim()){
    return { ok:false, msg:"Missing topic or question." };
  }
  return { ok:true };
}

/* ---------- Step 2 ---------- */
function renderStep2(root){
  const wrap = document.createElement("div");
  const fileBox = document.createElement("div");
  fileBox.className = "filebox";

  const uploadRow = document.createElement("div");
  uploadRow.style.display = "grid";
  uploadRow.style.gap = "10px";

  const pdfInput = document.createElement("input");
  pdfInput.type = "file";
  pdfInput.multiple = true;
  pdfInput.accept = ".pdf,.txt,.md";
  pdfInput.addEventListener("change", () => {
    const files = Array.from(pdfInput.files || []);
    for(const f of files) addDocument(f);
    renderWizard();
  });

  uploadRow.appendChild(label("Upload PDFs / notes"));
  uploadRow.appendChild(pdfInput);

  const dsInput = document.createElement("input");
  dsInput.type = "file";
  dsInput.multiple = true;
  dsInput.accept = ".csv,.xlsx,.xls";
  dsInput.addEventListener("change", () => {
    const files = Array.from(dsInput.files || []);
    for(const f of files) addDataset(f);
    renderWizard();
  });

  uploadRow.appendChild(label("Add dataset"));
  uploadRow.appendChild(dsInput);

  fileBox.appendChild(uploadRow);
  wrap.appendChild(fileBox);

  const docsTitle = document.createElement("div");
  docsTitle.className = "label";
  docsTitle.style.marginTop = "14px";
  docsTitle.textContent = "Documents uploaded";
  wrap.appendChild(docsTitle);

  if(state.documents.length === 0){
    wrap.appendChild(mutedText("No documents uploaded yet."));
  } else {
    state.documents.slice().reverse().forEach(doc => wrap.appendChild(renderDocumentPill(doc)));
  }

  const dsTitle = document.createElement("div");
  dsTitle.className = "label";
  dsTitle.style.marginTop = "14px";
  dsTitle.textContent = "Datasets uploaded";
  wrap.appendChild(dsTitle);

  if(state.datasets.length === 0){
    wrap.appendChild(mutedText("No datasets uploaded yet."));
  } else {
    state.datasets.slice().reverse().forEach(ds => wrap.appendChild(renderDatasetPill(ds)));
  }

  root.appendChild(wrap);
}
function validateStep2(){
  if(state.documents.length === 0 && state.datasets.length === 0){
    return { ok:false, msg:"Please upload at least one document or dataset." };
  }
  return { ok:true };
}

function addDocument(file){
  state.documents.push({ id: uid("doc"), filename: file.name, file, mode: null, pageCount: null, summaryBullets: null, selectedIds: new Set() });
}
function addDataset(file){
  state.datasets.push({ id: uid("ds"), filename: file.name, file, profile: null, requests: [] });
}

/* --- pills + modals: unchanged placeholders (kept minimal here for brevity) --- */
/* NOTE: To keep this reply readable, I'm not re-pasting the entire PDF/dataset modal code again.
   Your existing app.js already includes it; keep that part as-is below this point.
   (If you prefer I paste the full 100% file including all modal code again, say so and I will.) */
