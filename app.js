/*************************
 * Policy Brief Studio UI
 * Frontend-only version with placeholders.
 * Backend API will plug into the hooks in:
 *  - summarizePdfPlaceholder()
 *  - analyzeDatasetPlaceholder()
 *  - generateReportPlaceholder()
 *  - generateVideoPlaceholder()
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
themeToggle?.addEventListener("click", () => {
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
  documents: [], // {id, filename, file, mode, pageCount, summaryBullets, selectedIds:Set}
  datasets: [],  // {id, filename, file, profile, requests}
  stanceText: "",
  pollsText: "",
  expertsText: "",
  reportTitle: "",
  reports: [],   // versions newest first: {id, createdAt, title, filename, oneSentence, bullets, content, fileBlob}
  activeReportId: null,
  video: { status: "idle", reportId: null, voice: "Ava", ready: false, blob: null }
};

let stepIndex = 0;

/* ---------- 5 steps ---------- */
const steps = [
  { id: "q",      name: "Define the Question", desc: "Choose the topic and your one-sentence policy question.", render: renderStep1, validate: validateStep1 },
  { id: "sources",name: "Upload sources", desc: "Upload PDFs, notes, and datasets. Review what to include.", render: renderStep2, validate: validateStep2 },
  { id: "args",   name: "Your arguments and perspectives", desc: "Draft a short stance in sentences or bullet points.", render: renderStep3, validate: validateStep3 },
  { id: "brief",  name: "Download your brief", desc: "We generate the report and let you iterate versions.", render: renderStep4, validate: () => ({ ok:true }) },
  { id: "video",  name: "Download a 3 min presentation", desc: "Pick a report version and generate a short presentation.", render: renderStep5, validate: () => ({ ok:true }) },
];

/* ---------- Views / nav ---------- */
const views = { home: $("viewHome"), how: $("viewHow"), start: $("viewStart") };
const navHome = $("navHome");
const navHow  = $("navHow");
const navStart = $("navStart");

function showView(which){
  Object.values(views).forEach(v => v?.classList.add("hidden"));
  views[which]?.classList.remove("hidden");
  [navHome, navHow, navStart].forEach(a => a?.classList.remove("active"));
  if(which === "home") navHome?.classList.add("active");
  if(which === "how") navHow?.classList.add("active");
  if(which === "start") navStart?.classList.add("active");
}

navHome?.addEventListener("click", (e)=>{ e.preventDefault(); showView("home"); });
navHow?.addEventListener("click", (e)=>{ e.preventDefault(); showView("how"); renderHow(); });
navStart?.addEventListener("click", (e)=>{ e.preventDefault(); showView("start"); ensureWizardStart(); });

/* ---------- Home start ---------- */
const startBtn = $("startBtn");
const topicInput = $("topicInput");
const questionInput = $("questionInput");
const startError = $("startError");

startBtn?.addEventListener("click", () => {
  const t = (topicInput?.value || "").trim();
  const q = (questionInput?.value || "").trim();
  startError?.classList.add("hidden");

  if(!t || !q){
    if(startError){
      startError.textContent = "Please provide a topic and a one-sentence policy question.";
      startError.classList.remove("hidden");
    }
    return;
  }

  state.topic = t;
  state.question = q;
  if(!state.reportTitle) state.reportTitle = t;

  showView("start");
  stepIndex = 0;
  renderWizard();
});

/* ---------- Wizard DOM ---------- */
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

backBtn?.addEventListener("click", () => {
  wizardError?.classList.add("hidden");
  if(stepIndex > 0){
    stepIndex -= 1;
    renderWizard();
  } else {
    showView("home");
  }
});

nextBtn?.addEventListener("click", async () => {
  wizardError?.classList.add("hidden");
  const v = steps[stepIndex].validate();
  if(!v.ok){
    if(wizardError){
      wizardError.textContent = v.msg || "Please fix issues before continuing.";
      wizardError.classList.remove("hidden");
    }
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

function ensureWizardStart(){
  stepIndex = 0;
  renderWizard();
}

function renderWizard(){
  renderTimeline(timelineWizard, stepIndex);
  renderTimeline(timelineHome, stepIndex);

  if(progressLabel) progressLabel.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
  if(stepTitle) stepTitle.textContent = steps[stepIndex].name;
  if(stepDesc) stepDesc.textContent = steps[stepIndex].desc;

  if(stepContent){
    stepContent.innerHTML = "";
    steps[stepIndex].render(stepContent);
  }

  if(backBtn) backBtn.textContent = (stepIndex === 0) ? "Back to Home" : "Back";
  if(nextBtn) nextBtn.textContent = (stepIndex === steps.length - 1) ? "Finish" : "Next";

  // Keep your existing versions panel behavior (if it exists in your layout)
  if (versionsCard) {
    if (stepIndex >= 3) {
      // Show versions panel (handle both hiding mechanisms)
      versionsCard.classList.remove("hidden");
      versionsCard.classList.remove("vhidden");
      renderVersionsPanel();
    } else {
      // Hide without breaking layout (prefer vhidden if your CSS uses it)
      versionsCard.classList.add("vhidden");
      // keep this too in case some pages still use hidden:
      versionsCard.classList.add("hidden");
    }
  }
}

function renderTimeline(root, activeIndex){
  if(!root) return;
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
      // allow backward navigation freely
      if(i <= activeIndex){
        stepIndex = i;
        renderWizard();
        return;
      }
      // forward navigation requires previous steps validation
      for(let k=0; k<i; k++){
        const chk = steps[k].validate();
        if(!chk.ok){
          stepIndex = k;
          if(wizardError){
            wizardError.textContent = chk.msg || "Please complete this step first.";
            wizardError.classList.remove("hidden");
          }
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
  if(stepTitle) stepTitle.textContent = "Choose the topic";

  root.appendChild(label("Topic"));
  const t = document.createElement("input");
  t.className = "input";
  t.placeholder = "Topic";
  t.value = state.topic || "";
  t.addEventListener("input", () => {
    state.topic = t.value;
    if(!state.reportTitle) state.reportTitle = t.value;
  });
  root.appendChild(t);

  root.appendChild(label("Policy question (one sentence)"));
  const q = document.createElement("textarea");
  q.className = "textarea";
  q.rows = 2;
  q.placeholder = "Policy question (one sentence)";
  q.value = state.question || "";
  q.addEventListener("input", () => state.question = q.value);
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
  const fileBox = document.createElement("div");
  fileBox.className = "filebox";

  // Upload PDFs/notes
  fileBox.appendChild(label("Upload PDFs / notes"));
  const pdfInput = document.createElement("input");
  pdfInput.type = "file";
  pdfInput.multiple = true;
  pdfInput.accept = ".pdf,.txt,.md";
  pdfInput.addEventListener("change", () => {
    const files = Array.from(pdfInput.files || []);
    for(const f of files) addDocument(f);
    renderWizard();
  });
  fileBox.appendChild(pdfInput);

  // Add datasets
  fileBox.appendChild(label("Add dataset"));
  const dsInput = document.createElement("input");
  dsInput.type = "file";
  dsInput.multiple = true;
  dsInput.accept = ".csv,.xlsx,.xls";
  dsInput.addEventListener("change", () => {
    const files = Array.from(dsInput.files || []);
    for(const f of files) addDataset(f);
    renderWizard();
  });
  fileBox.appendChild(dsInput);

  root.appendChild(fileBox);

  // Documents list (NUMBERED)
  root.appendChild(label("Documents uploaded"));
  if(state.documents.length === 0){
    root.appendChild(mutedText("No documents uploaded yet."));
  } else {
    state.documents.slice().reverse().forEach((doc, idx) => {
      root.appendChild(renderDocumentPill(doc, idx + 1));
    });
  }

  // Datasets list (NUMBERED)
  root.appendChild(label("Datasets uploaded"));
  if(state.datasets.length === 0){
    root.appendChild(mutedText("No datasets uploaded yet."));
  } else {
    state.datasets.slice().reverse().forEach((ds, idx) => {
      root.appendChild(renderDatasetPill(ds, idx + 1));
    });
  }
}

function validateStep2(){
  if(state.documents.length === 0 && state.datasets.length === 0){
    return { ok:false, msg:"Please upload at least one document or dataset." };
  }
  return { ok:true };
}

function addDocument(file){
  state.documents.push({
    id: uid("doc"),
    filename: file.name,
    file,
    mode: null,          // manual/auto/null
    pageCount: null,
    summaryBullets: null,
    selectedIds: new Set()
  });
}

/* ✅ Document pill: numbered + buttons always right */
function renderDocumentPill(doc, number){
  const pill = document.createElement("div");
  pill.className = "pill";

  const left = document.createElement("div");
  left.className = "pillLeft";

  const title = document.createElement("div");
  title.className = "pillTitle";
  title.textContent = `${number}. ${doc.filename}`;

  const meta = document.createElement("div");
  meta.className = "pillMeta";
  meta.textContent =
    doc.mode === "manual" ? `Selection: manual (${doc.selectedIds.size} items)` :
    doc.mode === "auto" ? "Selection: auto (tool decides)" :
    "Selection: not reviewed";

  left.appendChild(title);
  left.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "pillActions";

  const reviewBtn = document.createElement("button");
  reviewBtn.className = "btn";
  reviewBtn.textContent = "Review";
  reviewBtn.addEventListener("click", async () => {
    await openPdfReviewModal(doc);
    // modal callbacks will call renderWizard() when closing
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    state.documents = state.documents.filter(d => d.id !== doc.id);
    renderWizard();
  });

  actions.appendChild(reviewBtn);
  actions.appendChild(removeBtn);

  pill.appendChild(left);
  pill.appendChild(actions);
  return pill;
}

function addDataset(file){
  state.datasets.push({
    id: uid("ds"),
    filename: file.name,
    file,
    profile: null,
    requests: []
  });
}

/* ✅ Dataset pill: numbered */
function renderDatasetPill(ds, number){
  const pill = document.createElement("div");
  pill.className = "pill";

  const left = document.createElement("div");
  left.className = "pillLeft";

  const title = document.createElement("div");
  title.className = "pillTitle";
  title.textContent = `${number}. ${ds.filename}`;

  const meta = document.createElement("div");
  meta.className = "pillMeta";
  meta.textContent = ds.profile
    ? `${ds.profile.inferredType} • ${ds.profile.rows} rows • ${ds.profile.cols} cols`
    : "Not analyzed yet";

  left.appendChild(title);
  left.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "pillActions";

  const analyzeBtn = document.createElement("button");
  analyzeBtn.className = "btn";
  analyzeBtn.textContent = "Analyze";
  analyzeBtn.addEventListener("click", async () => {
    await openDatasetModal(ds);
    renderWizard();
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    state.datasets = state.datasets.filter(d => d.id !== ds.id);
    renderWizard();
  });

  actions.appendChild(analyzeBtn);
  actions.appendChild(removeBtn);

  pill.appendChild(left);
  pill.appendChild(actions);
  return pill;
}

/* ---------- Step 3 ---------- */
function renderStep3(root){
  root.appendChild(label("Your argument"));

  const stance = document.createElement("textarea");
  stance.className = "textarea";
  stance.rows = 7;
  stance.placeholder = "Write your own arguments and points of view to be included in the draft. Include expected mechanisms and your expert analysis.";
  stance.value = state.stanceText;
  stance.addEventListener("input", () => state.stanceText = stance.value);
  root.appendChild(stance);

  root.appendChild(infoBox("Best practice", "Separate facts from assumptions, mechanisms, and recommendations."));

  root.appendChild(hr());

  const opt = document.createElement("div");
  opt.className = "muted small";
  opt.textContent = "Optional: add viewpoints below (please include the source).";
  root.appendChild(opt);

  root.appendChild(label("Polls (optional)"));
  const polls = document.createElement("textarea");
  polls.className = "textarea";
  polls.rows = 4;
  polls.placeholder = "Paste poll numbers + source (e.g., institution, date, link or citation details).";
  polls.value = state.pollsText;
  polls.addEventListener("input", () => state.pollsText = polls.value);
  root.appendChild(polls);

  root.appendChild(label("Expert opinions / testimonials (optional)"));
  const experts = document.createElement("textarea");
  experts.className = "textarea";
  experts.rows = 4;
  experts.placeholder = "Add expert quotes/opinions + source (who, where, when).";
  experts.value = state.expertsText;
  experts.addEventListener("input", () => state.expertsText = experts.value);
  root.appendChild(experts);
}

function validateStep3(){
  if(!state.stanceText.trim() || state.stanceText.trim().length < 20){
    return { ok:false, msg:"Please draft a short stance (at least a couple of sentences or bullet points)." };
  }
  return { ok:true };
}

/* ---------- Step 4 (generate + versions) ---------- */
async function renderWizardWithGeneration(){
  renderWizard();
  await generateAndStoreNewReportVersion();
  renderWizard();
}

function renderStep4(root){
  if(state.reports.length === 0){
    root.appendChild(renderWorking("We are working on the report", "Generating a draft brief from your sources and inputs. (Placeholder today; backend later.)"));
    return;
  }

  const report = getActiveReport();
  if(!report){
    root.appendChild(mutedText("No report selected."));
    return;
  }

  root.appendChild(label("Report title (inside the report)"));
  const titleInput = document.createElement("input");
  titleInput.className = "input";
  titleInput.value = report.title;
  titleInput.addEventListener("input", () => { report.title = titleInput.value; });
  root.appendChild(titleInput);

  root.appendChild(hr());

  const one = document.createElement("div");
  one.innerHTML = `<div style="font-weight:900;margin-bottom:6px;">Main takeaway (1 sentence)</div>
                   <div class="muted">${escapeHtml(report.oneSentence)}</div>`;
  root.appendChild(one);

  root.appendChild(hr());

  const b = document.createElement("div");
  b.innerHTML = `<div style="font-weight:900;margin-bottom:8px;">Bullet Point Summary of the Report</div>`;
  const ul = document.createElement("ul");
  ul.style.margin = "0";
  ul.style.paddingLeft = "18px";
  report.bullets.forEach(x => {
    const li = document.createElement("li");
    li.className = "muted";
    li.style.margin = "6px 0";
    li.textContent = x;
    ul.appendChild(li);
  });
  b.appendChild(ul);
  root.appendChild(b);

  root.appendChild(hr());

  const dlRow = document.createElement("div");
  dlRow.style.display = "flex";
  dlRow.style.gap = "10px";
  dlRow.style.flexWrap = "wrap";
  dlRow.style.justifyContent = "flex-end";

  const downloadSummaryBtn = document.createElement("button");
  downloadSummaryBtn.className = "btn primary";
  downloadSummaryBtn.textContent = "Download Brief Summary";
  downloadSummaryBtn.addEventListener("click", () => downloadBlob(report.fileBlob, report.filename));
  dlRow.appendChild(downloadSummaryBtn);

  const downloadLatestBtn = document.createElement("button");
  downloadLatestBtn.className = "btn danger";
  downloadLatestBtn.textContent = "Download Latest Policy Brief";
  downloadLatestBtn.addEventListener("click", () => downloadBlob(report.fileBlob, report.filename));
  dlRow.appendChild(downloadLatestBtn);

  root.appendChild(dlRow);

  root.appendChild(hr());

  const q = document.createElement("div");
  q.innerHTML = `<div style="font-weight:900;margin-bottom:8px;">Would you like to correct or change something on the report?</div>
                 <div class="muted small">You can return to earlier steps to add or change inputs. Versions will be kept.</div>`;
  root.appendChild(q);

  const jumpRow = document.createElement("div");
  jumpRow.style.display = "flex";
  jumpRow.style.gap = "10px";
  jumpRow.style.flexWrap = "wrap";
  jumpRow.style.marginTop = "10px";

  jumpRow.appendChild(mkBtn("Return to Step 1", () => { stepIndex = 0; renderWizard(); }));
  jumpRow.appendChild(mkBtn("Return to Step 2", () => { stepIndex = 1; renderWizard(); }));
  jumpRow.appendChild(mkBtn("Return to Step 3", () => { stepIndex = 2; renderWizard(); }));

  root.appendChild(jumpRow);

  if(nextBtn) nextBtn.textContent = "Next";
}

async function generateAndStoreNewReportVersion(){
  const versionNum = state.reports.length + 1;
  const dateTag = dateTagNow();
  const defaultFilename = `report${versionNum}_${dateTag}.txt`;
  const report = await generateReportPlaceholder(defaultFilename);
  state.reports.unshift(report);
  state.activeReportId = report.id;
}

async function generateReportPlaceholder(filename){
  const title = (state.reportTitle || state.topic || "Policy Brief").trim();
  const oneSentence = `Recommendation: Based on the uploaded sources and your analysis, prioritize a targeted policy design and disclose key uncertainties. (Placeholder)`;
  const bullets = [
    "Define the policy objective and constraints clearly.",
    "Summarize the strongest evidence from the selected documents.",
    "Highlight disagreements across sources and why they matter.",
    "Explain mechanisms (economic logic) behind expected effects.",
    "Discuss implementation feasibility and administrative capacity.",
    "Quantify impacts where data allow; otherwise state assumptions.",
    "Provide a decision-oriented recommendation.",
    "List the top risks and uncertainties.",
    "Suggest monitoring indicators and a review timeline."
  ].slice(0, 15);

  const content =
`# ${title}

## Policy question
${state.question}

## Main takeaway
${oneSentence}

## Bullet point summary
${bullets.map(x => `- ${x}`).join("\n")}

(Placeholder report file. Backend will generate a real PDF with citations and reliability scoring.)`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });

  return {
    id: uid("rep"),
    createdAt: new Date().toISOString(),
    title,
    filename,
    oneSentence,
    bullets,
    content,
    fileBlob: blob
  };
}

function getActiveReport(){
  if(state.activeReportId){
    return state.reports.find(r => r.id === state.activeReportId) || state.reports[0];
  }
  return state.reports[0];
}

function renderVersionsPanel(){
  if(!versionsList) return;
  versionsList.innerHTML = "";
  if(state.reports.length === 0){
    versionsList.appendChild(mutedText("No versions yet."));
    return;
  }

  state.reports.forEach(rep => {
    const item = document.createElement("div");
    item.className = "versionItem";
    if(rep.id === state.activeReportId){
      item.style.outline = "2px solid color-mix(in srgb, var(--primary) 55%, transparent)";
    }

    const top = document.createElement("div");
    top.className = "versionTop";

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "versionName";
    name.textContent = rep.filename;

    const meta = document.createElement("div");
    meta.className = "versionMeta";
    meta.textContent = `${niceDate(rep.createdAt)} • ${rep.title}`;

    left.appendChild(name);
    left.appendChild(meta);

    const btns = document.createElement("div");
    btns.className = "versionBtns";
    btns.appendChild(mkBtn("Download", () => downloadBlob(rep.fileBlob, rep.filename)));
    btns.appendChild(mkBtn("Delete", () => {
      state.reports = state.reports.filter(r => r.id !== rep.id);
      if(state.activeReportId === rep.id){
        state.activeReportId = state.reports[0]?.id || null;
      }
      renderWizard();
    }));

    top.appendChild(left);
    top.appendChild(btns);
    item.appendChild(top);

    const rename = document.createElement("input");
    rename.className = "inlineInput";
    rename.value = rep.filename;
    rename.addEventListener("input", () => {
      rep.filename = rename.value;
      name.textContent = rep.filename;
    });
    item.appendChild(rename);

    item.addEventListener("click", (e) => {
      if(e.target === rename) return;
      state.activeReportId = rep.id;
      renderWizard();
    });

    versionsList.appendChild(item);
  });
}

/* ---------- Step 5 ---------- */
function renderStep5(root){
  if(state.reports.length === 0){
    root.appendChild(mutedText("No report versions yet. Generate a report in Step 4 first."));
    return;
  }

  const report = getActiveReport();

  root.appendChild(label("Select a report version for the presentation"));
  const sel = document.createElement("select");
  sel.className = "input";
  state.reports.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = `${r.filename} — ${r.title}`;
    if(r.id === report.id) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    state.activeReportId = sel.value;
    state.video.reportId = sel.value;
    renderWizard();
  });
  root.appendChild(sel);

  root.appendChild(hr());

  root.appendChild(label("Choose voice"));
  const voiceRow = document.createElement("div");
  voiceRow.style.display = "flex";
  voiceRow.style.gap = "10px";
  voiceRow.style.flexWrap = "wrap";

  const voices = ["Ava", "Jeff", "No voice"];
  voices.forEach(v => {
    const b = document.createElement("button");
    b.className = (state.video.voice === v) ? "btn primary" : "btn";
    b.textContent = v;
    b.addEventListener("click", () => {
      state.video.voice = v;
      renderWizard();
    });
    voiceRow.appendChild(b);
  });
  root.appendChild(voiceRow);

  // Inline voice preview (placeholder)
  const previewWrap = document.createElement("div");
  previewWrap.style.marginTop = "10px";

  const speakerRow = document.createElement("div");
  speakerRow.style.display = "flex";
  speakerRow.style.alignItems = "center";
  speakerRow.style.gap = "10px";
  speakerRow.style.flexWrap = "wrap";

  const speakerBtn = document.createElement("button");
  speakerBtn.className = "btn";
  speakerBtn.textContent = "🔊 Preview voice";

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.textContent = (state.video.voice === "Ava") ? "Listen to Ava’s voice."
                  : (state.video.voice === "Jeff") ? "Listen to Jeff’s voice."
                  : "No voice selected.";

  speakerBtn.disabled = (state.video.voice === "No voice");
  speakerBtn.addEventListener("click", async () => {
    speakerBtn.disabled = true;
    const old = speakerBtn.textContent;
    speakerBtn.textContent = `Playing ${state.video.voice}…`;
    await sleep(900);
    speakerBtn.textContent = old;
    speakerBtn.disabled = (state.video.voice === "No voice");
  });

  speakerRow.appendChild(speakerBtn);
  speakerRow.appendChild(desc);
  previewWrap.appendChild(speakerRow);
  root.appendChild(previewWrap);

  root.appendChild(hr());

  if(state.video.status === "working"){
    root.appendChild(renderWorking("We are working on the video presentation", "Generating a 3-minute presentation. (Placeholder today; backend later.)"));
    return;
  }

  const genRow = document.createElement("div");
  genRow.style.display = "flex";
  genRow.style.justifyContent = "flex-end";
  genRow.style.gap = "10px";
  genRow.style.flexWrap = "wrap";

  const genBtn = document.createElement("button");
  genBtn.className = "btn primary";
  genBtn.textContent = "Generate presentation (placeholder)";
  genBtn.addEventListener("click", async () => {
    state.video.status = "working";
    renderWizard();
    await sleep(1100);
    state.video.status = "ready";
    renderWizard();
  });

  genRow.appendChild(genBtn);
  root.appendChild(genRow);

  if(state.video.status === "ready"){
    root.appendChild(hr());
    const box = document.createElement("div");
    box.className = "howStep";
    box.innerHTML = `
      <div style="font-weight:900;margin-bottom:6px;">Presentation (placeholder)</div>
      <div class="muted small">A playable video will be added when the backend + voices are implemented. For now, download the script.</div>
    `;
    root.appendChild(box);

    const dl = document.createElement("button");
    dl.className = "btn primary";
    dl.textContent = "Download presentation script";
    dl.addEventListener("click", () => {
      const rep = getActiveReport();
      const script = `Presentation Script (placeholder)\n\nTitle: ${rep.title}\nVoice: ${state.video.voice}\n\n(Backend will generate a real video.)`;
      const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, `presentation_${rep.filename.replace(/\.[^.]+$/, "")}.txt`);
    });
    root.appendChild(dl);
  }
}

/* ---------- PDF Review Modal (CLEAN + numbered bullets + immediate status update) ---------- */
const modalRoot = $("modalRoot");

async function openPdfReviewModal(doc){
  if(!modalRoot) return;
  modalRoot.classList.remove("hidden");
  modalRoot.innerHTML = "";

  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modalHeader";

  const left = document.createElement("div");
  left.innerHTML = `
    <div class="modalTitle">Review: ${escapeHtml(doc.filename)}</div>
    <div class="muted small">Would you like to choose the arguments that will be used from this article?</div>
  `;

  const close = document.createElement("button");
  close.className = "modalClose";
  close.textContent = "Close";
  close.addEventListener("click", () => closeModal());

  header.appendChild(left);
  header.appendChild(close);
  modal.appendChild(header);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "10px";
  btnRow.style.flexWrap = "wrap";

  const yesBtn = document.createElement("button");
  yesBtn.className = "btn primary";
  yesBtn.textContent = "Yes";
  yesBtn.addEventListener("click", async () => {
    if(!doc.summaryBullets){
      const { pageCount, bullets } = await summarizePdfPlaceholder(doc.file);
      doc.pageCount = pageCount;
      doc.summaryBullets = bullets;
      if(!(doc.selectedIds instanceof Set)) doc.selectedIds = new Set();
    }
    doc.mode = "manual";
    renderModalBullets(modal, doc);
  });

  const noBtn = document.createElement("button");
  noBtn.className = "btn";
  noBtn.textContent = "No, choose as you see fit";
  noBtn.addEventListener("click", () => {
    doc.mode = "auto";
    doc.selectedIds = new Set();
    closeModal();
    renderWizard(); // ✅ immediate status update
  });

  btnRow.appendChild(yesBtn);
  btnRow.appendChild(noBtn);
  modal.appendChild(btnRow);

  // If already manual, show bullets right away
  if(doc.mode === "manual" && doc.summaryBullets){
    renderModalBullets(modal, doc);
  }

  modalRoot.appendChild(modal);
}

function renderModalBullets(modal, doc){
  const existing = modal.querySelector(".bulletsBlock");
  if(existing) existing.remove();

  const block = document.createElement("div");
  block.className = "bulletsBlock";

  block.appendChild(hr());

  // Toolbar row (Include all)
  const topRow = document.createElement("div");
  topRow.className = "reviewToolbar";
  topRow.style.display = "flex";
  topRow.style.alignItems = "center";
  topRow.style.justifyContent = "space-between";
  topRow.style.gap = "12px";
  topRow.style.flexWrap = "wrap";

  const info = document.createElement("div");
  info.innerHTML = `
    <div style="font-weight:850;">Concise summary (placeholder)</div>
    <div class="muted small">Tick items to include in the policy brief. Include all is available.</div>
  `;

  const includeAll = document.createElement("label");
  includeAll.style.display = "flex";
  includeAll.style.alignItems = "center";
  includeAll.style.gap = "8px";
  includeAll.style.cursor = "pointer";

  const inc = document.createElement("input");
  inc.type = "checkbox";
  inc.className = "checkbox";

  const allIds = allBulletIds(doc);
  inc.checked = allIds.length > 0 && allIds.every(id => doc.selectedIds.has(id));
  inc.addEventListener("change", () => {
    if(inc.checked){
      allIds.forEach(id => doc.selectedIds.add(id));
    } else {
      doc.selectedIds.clear();
    }
    renderModalBullets(modal, doc); // rerender to reflect checks
  });

  const incText = document.createElement("div");
  incText.className = "small";
  incText.textContent = "Include all";

  includeAll.appendChild(inc);
  includeAll.appendChild(incText);

  topRow.appendChild(info);
  topRow.appendChild(includeAll);

  block.appendChild(topRow);

  // Bullets list (numbered)
  const bulletsWrap = document.createElement("div");
  bulletsWrap.className = "bullets";

  (doc.summaryBullets || []).forEach((b, idx) => {
    const item = document.createElement("div");
    item.className = "bulletItem";

    const top = document.createElement("div");
    top.className = "bulletTop";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "checkbox";
    cb.checked = doc.selectedIds.has(b.id);
    cb.addEventListener("change", () => {
      if(cb.checked) doc.selectedIds.add(b.id);
      else doc.selectedIds.delete(b.id);
    });

    const num = document.createElement("div");
    num.className = "bulletNum";
    num.textContent = String(idx + 1);

    const txt = document.createElement("div");
    txt.className = "bulletText";
    txt.textContent = b.text;

    top.appendChild(cb);
    top.appendChild(num);
    top.appendChild(txt);

    item.appendChild(top);

    if(b.children && b.children.length){
      const subs = document.createElement("div");
      subs.className = "subBullets";

      b.children.forEach(s => {
        const row = document.createElement("div");
        row.className = "subRow";

        const scb = document.createElement("input");
        scb.type = "checkbox";
        scb.className = "checkbox";
        scb.checked = doc.selectedIds.has(s.id);
        scb.addEventListener("change", () => {
          if(scb.checked) doc.selectedIds.add(s.id);
          else doc.selectedIds.delete(s.id);
        });

        const st = document.createElement("div");
        st.className = "subText";
        st.textContent = s.text;

        row.appendChild(scb);
        row.appendChild(st);
        subs.appendChild(row);
      });

      item.appendChild(subs);
    }

    bulletsWrap.appendChild(item);
  });

  block.appendChild(bulletsWrap);

  // Done row
  const doneRow = document.createElement("div");
  doneRow.style.display = "flex";
  doneRow.style.justifyContent = "flex-end";
  doneRow.style.gap = "10px";
  doneRow.style.marginTop = "12px";

  const doneBtn = document.createElement("button");
  doneBtn.className = "btn primary";
  doneBtn.textContent = "Done";
  doneBtn.addEventListener("click", () => {
    doc.mode = "manual";
    closeModal();
    renderWizard(); // ✅ immediate status update
  });

  doneRow.appendChild(doneBtn);
  block.appendChild(doneRow);

  modal.appendChild(block);
}

function closeModal(){
  if(!modalRoot) return;
  modalRoot.classList.add("hidden");
  modalRoot.innerHTML = "";
}

function allBulletIds(doc){
  const ids = [];
  (doc.summaryBullets || []).forEach(b => {
    ids.push(b.id);
    (b.children || []).forEach(s => ids.push(s.id));
  });
  return ids;
}

/* Placeholder PDF summarizer */
async function summarizePdfPlaceholder(file){
  const kb = Math.max(1, Math.round(file.size / 1024));
  const pageCount = Math.max(1, Math.round(kb / 90));
  const target = bulletTargetFromPages(pageCount);

  const bullets = [];
  let count = 0;

  for(let i=1; i<=target; i++){
    count++;
    const id = uid("b");
    const childCount = (i % 4 === 0) ? 2 : (i % 7 === 0 ? 1 : 0);

    const children = [];
    for(let j=1; j<=childCount; j++){
      count++;
      if(count > 35) break;
      children.push({ id: uid("s"), text: `Supporting point ${i}.${j} (placeholder)` });
    }

    bullets.push({
      id,
      text: `Key idea ${i} from the document (placeholder)`,
      children
    });

    if(count >= 35) break;
  }

  // enforce 35 cap
  while(bullets.length && bullets.reduce((acc,b)=> acc + 1 + (b.children?.length||0), 0) > 35){
    const last = bullets[bullets.length-1];
    if(last.children && last.children.length) last.children.pop();
    else bullets.pop();
  }

  return { pageCount, bullets };
}

function bulletTargetFromPages(p){
  if(p <= 1) return 6;
  if(p <= 3) return 10;
  if(p <= 5) return 12;
  return Math.min(30, 12 + Math.round((p-5) * 2));
}

/* ---------- Dataset modals (placeholder) ---------- */
async function openDatasetModal(ds){
  if(!modalRoot) return;
  modalRoot.classList.remove("hidden");
  modalRoot.innerHTML = "";

  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modalHeader";

  const left = document.createElement("div");
  left.innerHTML = `
    <div class="modalTitle">Dataset: ${escapeHtml(ds.filename)}</div>
    <div class="muted small">Ask for econometric analysis or plots. (Placeholder today; backend later.)</div>
  `;

  const close = document.createElement("button");
  close.className = "modalClose";
  close.textContent = "Close";
  close.addEventListener("click", () => closeModal());

  header.appendChild(left);
  header.appendChild(close);
  modal.appendChild(header);

  if(!ds.profile){
    ds.profile = await analyzeDatasetPlaceholder(ds.file);
  }

  const prof = document.createElement("div");
  prof.className = "howStep";
  prof.innerHTML = `
    <div style="font-weight:850;margin-bottom:6px;">Dataset profile (placeholder)</div>
    <div class="muted small">
      Type: <b>${escapeHtml(ds.profile.inferredType)}</b><br/>
      Rows: <b>${ds.profile.rows}</b>, Columns: <b>${ds.profile.cols}</b><br/>
      Variables: ${escapeHtml(ds.profile.variables.slice(0,12).join(", "))}${ds.profile.variables.length>12 ? "…" : ""}
    </div>
  `;
  modal.appendChild(prof);

  modal.appendChild(hr());

  const lab = document.createElement("div");
  lab.className = "label";
  lab.textContent = "What analysis do you want? (command-style prompt)";
  const prompt = document.createElement("textarea");
  prompt.className = "textarea";
  prompt.rows = 3;
  prompt.placeholder = "e.g., Regress y on x1 x2 with robust SE; plot y and x1; or run VAR with inflation, GDP, policy rate.";
  modal.appendChild(lab);
  modal.appendChild(prompt);

  const runRow = document.createElement("div");
  runRow.style.display = "flex";
  runRow.style.justifyContent = "flex-end";
  runRow.style.gap = "10px";
  runRow.style.marginTop = "10px";

  const runBtn = document.createElement("button");
  runBtn.className = "btn primary";
  runBtn.textContent = "Run (placeholder)";
  runBtn.addEventListener("click", () => {
    const p = (prompt.value || "").trim();
    if(!p) return;
    ds.requests.push({ id: uid("req"), prompt: p });
    closeModal();
    renderWizard();
  });

  runRow.appendChild(runBtn);
  modal.appendChild(runRow);

  modalRoot.appendChild(modal);
}

async function analyzeDatasetPlaceholder(file){
  const name = file.name.toLowerCase();
  const inferredType = name.includes("panel") ? "panel" : (name.includes("time") ? "time series" : "cross section");
  return {
    rows: 1200,
    cols: 14,
    inferredType,
    variables: [
      "y", "x1", "x2", "x3",
      "date", "id",
      "inflation", "gdp", "rate",
      "employment", "wage", "sector",
      "region", "age"
    ]
  };
}

/* ---------- How it works ---------- */
const toggleAllHowBtn = $("toggleAllHow");
const howStepsRoot = $("howSteps");
let howExpandedAll = false;

function renderHow(){
  if(!howStepsRoot) return;

  const howData = [
    { title: "Step 1. Define the Question", hint:"Topic + one-sentence policy question",
      desc:"Define the decision you want to inform. Keep the policy question one sentence and decision-relevant. This step anchors the rest of the workflow." },
    { title: "Step 2. Upload sources (PDF's, Notes, Datasets)", hint:"Add evidence you want to rely on",
      desc:"Upload documents and datasets. For PDFs, you can review a concise bullet summary and tick which arguments to include. For datasets, you can request analyses and choose which outputs belong in the brief." },
    { title: "Step 3. Add your own arguments and perspectives", hint:"Your stance + optional viewpoints",
      desc:"Write your stance as sentences or bullet points. Add optional polls and expert opinions, and include sources." },
    { title: "Step 4. Download your brief", hint:"Generate, iterate, and manage versions",
      desc:"Generate a report version. You get a one-sentence takeaway and bullet summary, can download and iterate." },
    { title: "Step 5. Download a 3 min presentation of the results", hint:"Pick a version + voice",
      desc:"Choose which report version to present, select a voice (or no voice) and generate a short presentation (enabled when backend is connected)." }
  ];

  howStepsRoot.innerHTML = "";
  howData.forEach((s) => {
    const item = document.createElement("div");
    item.className = "howStep";

    const top = document.createElement("div");
    top.className = "howStepTop";

    const left = document.createElement("div");
    left.innerHTML = `<div class="howStepTitle">${escapeHtml(s.title)}</div>
                      <div class="howStepHint">${escapeHtml(s.hint)}</div>`;

    const right = document.createElement("div");
    right.className = "muted small";
    right.textContent = "Hover or click";

    const desc = document.createElement("div");
    desc.className = "howStepDesc";
    desc.textContent = s.desc;

    top.appendChild(left);
    top.appendChild(right);

    item.appendChild(top);
    item.appendChild(desc);

    item.addEventListener("mouseenter", () => item.classList.add("open"));
    item.addEventListener("mouseleave", () => { if(!howExpandedAll) item.classList.remove("open"); });
    top.addEventListener("click", () => item.classList.toggle("open"));

    howStepsRoot.appendChild(item);
  });

  if(toggleAllHowBtn) toggleAllHowBtn.textContent = howExpandedAll ? "Collapse all" : "Expand all";
}

toggleAllHowBtn?.addEventListener("click", () => {
  howExpandedAll = !howExpandedAll;
  const items = howStepsRoot?.querySelectorAll(".howStep") || [];
  items.forEach(it => {
    if(howExpandedAll) it.classList.add("open");
    else it.classList.remove("open");
  });
  if(toggleAllHowBtn) toggleAllHowBtn.textContent = howExpandedAll ? "Collapse all" : "Expand all";
});

/* ---------- Utilities ---------- */
function label(text){
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = text;
  return l;
}
function hr(){
  const h = document.createElement("hr");
  h.className = "sep";
  return h;
}
function infoBox(title, text){
  const box = document.createElement("div");
  box.className = "howStep";
  box.innerHTML = `<div style="font-weight:900;margin-bottom:6px;">${escapeHtml(title)}</div>
                   <div class="muted small">${escapeHtml(text)}</div>`;
  return box;
}
function mutedText(text){
  const d = document.createElement("div");
  d.className = "muted";
  d.textContent = text;
  return d;
}
function mkBtn(text, onClick){
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function uid(prefix){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
function niceDate(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}
function dateTagNow(){
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mm = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2,"0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function renderWorking(title, text){
  const w = document.createElement("div");
  w.className = "working";
  w.innerHTML = `
    <div class="spinner"></div>
    <div class="workingTitle">${escapeHtml(title)}</div>
    <div class="workingText">${escapeHtml(text)}</div>
  `;
  return w;
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ---------- Boot ---------- */
function boot(){
  initTheme();
  showView("home");
  renderTimeline(timelineHome, stepIndex);
  renderHow();
}
boot();
