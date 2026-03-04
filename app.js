// Simple SPA navigation
const views = {
  home: document.getElementById("viewHome"),
  how: document.getElementById("viewHow"),
  demo: document.getElementById("viewDemo"),
};

const navHome = document.getElementById("navHome");
const navHow  = document.getElementById("navHow");
const navDemo = document.getElementById("navDemo");

function setActiveNav(which){
  [navHome, navHow, navDemo].forEach(a => a.classList.remove("active"));
  if(which === "home") navHome.classList.add("active");
  if(which === "how")  navHow.classList.add("active");
  if(which === "demo") navDemo.classList.add("active");
}

function showView(which){
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[which].classList.remove("hidden");
  setActiveNav(which);
}

navHome.addEventListener("click", (e)=>{ e.preventDefault(); showView("home"); });
navHow.addEventListener("click", (e)=>{ e.preventDefault(); showView("how"); });
navDemo.addEventListener("click", (e)=>{ e.preventDefault(); showView("demo"); });

// Wizard state
const state = {
  topic: "",
  question: "",
  files: [], // File objects
  argumentsText: "",
  constraintsText: "",
  pollsText: "",
  expertsText: "",
  outputs: null,
};

const steps = [
  {
    name: "Confirm scope",
    desc: "Topic, question, constraints and success criteria.",
    render: renderScope,
    validate: validateScope,
  },
  {
    name: "Upload sources",
    desc: "Add PDFs and notes that will be cited.",
    render: renderSources,
    validate: validateSources,
  },
  {
    name: "Your argument",
    desc: "Draft stance, tradeoffs, and what evidence should decide.",
    render: renderArgument,
    validate: validateArgument,
  },
  {
    name: "Add viewpoints",
    desc: "Optional: polls, expert opinions, testimonials.",
    render: renderViewpoints,
    validate: () => ({ ok: true }),
  },
  {
    name: "Generate brief",
    desc: "Produces brief outline, evidence bullets, citations (mock for now).",
    render: renderGenerate,
    validate: () => ({ ok: true }),
  },
];

let stepIndex = 0;

// DOM refs
const startBtn = document.getElementById("startBtn");
const topicInput = document.getElementById("topicInput");
const questionInput = document.getElementById("questionInput");
const startError = document.getElementById("startError");

const timeline = document.getElementById("timeline");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const stepTitle = document.getElementById("stepTitle");
const stepDesc = document.getElementById("stepDesc");
const stepContent = document.getElementById("stepContent");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const wizardError = document.getElementById("wizardError");

startBtn.addEventListener("click", () => {
  state.topic = (topicInput.value || "").trim();
  state.question = (questionInput.value || "").trim();

  startError.classList.add("hidden");
  if(!state.topic || !state.question){
    startError.textContent = "Please provide a topic and a one-sentence policy question.";
    startError.classList.remove("hidden");
    return;
  }
  stepIndex = 0;
  showView("demo");
  renderWizard();
});

backBtn.addEventListener("click", () => {
  wizardError.classList.add("hidden");
  if(stepIndex > 0){
    stepIndex -= 1;
    renderWizard();
  } else {
    showView("home");
  }
});

nextBtn.addEventListener("click", () => {
  wizardError.classList.add("hidden");
  const v = steps[stepIndex].validate();
  if(!v.ok){
    wizardError.textContent = v.msg || "Please fix issues before continuing.";
    wizardError.classList.remove("hidden");
    return;
  }
  if(stepIndex < steps.length - 1){
    stepIndex += 1;
    renderWizard();
  } else {
    // finish
    showView("home");
  }
});

function renderWizard(){
  renderTimeline();
  const pct = Math.round((stepIndex) / (steps.length - 1) * 100);
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = `Step ${stepIndex + 1} of ${steps.length}`;

  stepTitle.textContent = steps[stepIndex].name;
  stepDesc.textContent = steps[stepIndex].desc;

  stepContent.innerHTML = "";
  steps[stepIndex].render(stepContent);

  backBtn.textContent = (stepIndex === 0) ? "Back to Home" : "Back";
  nextBtn.textContent = (stepIndex === steps.length - 1) ? "Finish" : "Next";
}

function renderTimeline(){
  timeline.innerHTML = "";
  steps.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "step";
    if(i === stepIndex) div.classList.add("active");
    if(i < stepIndex) div.classList.add("done");

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `${i+1}`;

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = s.name;
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = s.desc;
    info.appendChild(name);
    info.appendChild(desc);

    div.appendChild(badge);
    div.appendChild(info);

    div.addEventListener("click", () => {
      stepIndex = i;
      renderWizard();
    });

    timeline.appendChild(div);
  });
}

// Step renders
function renderScope(root){
  const wrap = document.createElement("div");
  wrap.className = "kv";

  wrap.appendChild(kvRow("Topic", `<b>${escapeHtml(state.topic)}</b>`));
  wrap.appendChild(kvRow("Question", escapeHtml(state.question)));

  const constraints = document.createElement("textarea");
  constraints.className = "textarea";
  constraints.rows = 4;
  constraints.placeholder = "Constraints / success criteria (optional). e.g., budget neutral within 3 years; prioritize employment.";
  constraints.value = state.constraintsText;
  constraints.addEventListener("input", () => state.constraintsText = constraints.value);

  root.appendChild(wrap);
  root.appendChild(hr());
  root.appendChild(label("Constraints / success criteria"));
  root.appendChild(constraints);

  root.appendChild(infoBox(
    "Timeline preview",
    "Next you'll upload PDFs. Then you add your argument. Then we generate a brief outline with citations (mock now; backend later)."
  ));
}

function renderSources(root){
  const box = document.createElement("div");
  box.className = "filebox";

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".pdf,.txt,.md";
  input.addEventListener("change", () => {
    state.files = Array.from(input.files || []);
    renderWizard(); // re-render to show pills
  });

  box.appendChild(label("Upload PDFs / notes"));
  box.appendChild(input);

  const list = document.createElement("div");
  state.files.forEach(f => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
    list.appendChild(pill);
  });

  root.appendChild(box);
  root.appendChild(list);

  root.appendChild(infoBox(
    "Note about GitHub Pages",
    "Files stay in your browser for now. In the next phase, we’ll add a backend endpoint to ingest PDFs and build citations."
  ));
}

function renderArgument(root){
  const stance = document.createElement("textarea");
  stance.className = "textarea";
  stance.rows = 6;
  stance.placeholder = "Write your argument / hypothesis. Include expected mechanisms and what evidence would change your mind.";
  stance.value = state.argumentsText;
  stance.addEventListener("input", () => state.argumentsText = stance.value);

  root.appendChild(label("Your argument"));
  root.appendChild(stance);

  root.appendChild(infoBox(
    "Best practice",
    "Good briefs separate: (i) facts from sources, (ii) assumptions, (iii) theory/mechanisms, (iv) policy recommendation."
  ));
}

function renderViewpoints(root){
  const polls = document.createElement("textarea");
  polls.className = "textarea";
  polls.rows = 4;
  polls.placeholder = "Polls / public sentiment (optional). Paste numbers + source.";
  polls.value = state.pollsText;
  polls.addEventListener("input", () => state.pollsText = polls.value);

  const experts = document.createElement("textarea");
  experts.className = "textarea";
  experts.rows = 4;
  experts.placeholder = "Expert opinions / testimonials (optional). Include who + where it comes from.";
  experts.value = state.expertsText;
  experts.addEventListener("input", () => state.expertsText = experts.value);

  root.appendChild(label("Polls"));
  root.appendChild(polls);
  root.appendChild(hr());
  root.appendChild(label("Expert opinions / testimonials"));
  root.appendChild(experts);
}

function renderGenerate(root){
  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Generate (mock output)";
  btn.addEventListener("click", () => {
    state.outputs = mockGenerate();
    renderWizard();
  });

  root.appendChild(infoBox(
    "What happens here (today vs next)",
    "Today: a mocked brief so the UI is demoable. Next: call a backend that does RAG, citations, contradiction checks, and a reliability score."
  ));
  root.appendChild(btn);

  if(state.outputs){
    root.appendChild(hr());
    const out = document.createElement("div");
    out.innerHTML = `
      <h3>Executive summary (mock)</h3>
      <ul>
        ${state.outputs.exec.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
      </ul>
      <h3>Key facts & arguments to use</h3>
      <ul>
        ${state.outputs.facts.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
      </ul>
      <h3>Reliability score</h3>
      <p><b>${state.outputs.score}/100</b> — ${escapeHtml(state.outputs.score_note)}</p>
      <h3>3-minute video explainer (script)</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(state.outputs.video_script)}</pre>
    `;
    root.appendChild(out);
  }
}

// Validators
function validateScope(){
  if(!state.topic || !state.question) return { ok:false, msg:"Missing topic or question." };
  return { ok:true };
}
function validateSources(){
  if(!state.files || state.files.length === 0){
    return { ok:false, msg:"Please upload at least one PDF or note file for citations." };
  }
  return { ok:true };
}
function validateArgument(){
  if(!state.argumentsText || state.argumentsText.trim().length < 40){
    return { ok:false, msg:"Please add a short argument (at least ~40 characters)." };
  }
  return { ok:true };
}

// Helpers
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
function kvRow(k, vHtml){
  const row = document.createElement("div");
  row.className = "row";
  const key = document.createElement("div");
  key.className = "key";
  key.textContent = k;
  const val = document.createElement("div");
  val.className = "val";
  val.innerHTML = vHtml;
  row.appendChild(key);
  row.appendChild(val);
  return row;
}
function infoBox(title, text){
  const box = document.createElement("div");
  box.className = "card";
  box.style.marginTop = "12px";
  box.style.background = "rgba(8,12,22,.35)";
  box.style.boxShadow = "none";
  box.innerHTML = `<div style="font-weight:800;margin-bottom:6px">${escapeHtml(title)}</div>
                   <div class="small muted">${escapeHtml(text)}</div>`;
  return box;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// Mock generator (placeholder for the backend call later)
function mockGenerate(){
  const exec = [
    `Decision: ${state.question}`,
    `Likely tradeoff: short-run fiscal cost vs longer-run labor-market stabilization.`,
    `Key risk: evidence may be mixed across contexts; identify comparable cases and disclose uncertainty.`
  ];

  const facts = [
    "Fact bucket: baseline context (macro conditions, labor market structure). [CITATION_PLACEHOLDER]",
    "Mechanism bucket: incentives, moral hazard, labor supply/participation channels. [THEORY_PLACEHOLDER]",
    "Implementation bucket: eligibility, enforcement, administrative capacity. [CITATION_PLACEHOLDER]"
  ];

  const score = 62;
  const score_note = "Mock score. Real score will use citation coverage + evidence strength + contradictions + verifier checks.";

  const video_script =
`[0:00–0:20] What is the policy question and why it matters?
- ${state.topic}

[0:20–1:20] What does the evidence say (with citations)?
- We will extract claims only from uploaded PDFs and attach citations.

[1:20–2:20] Mechanisms / economic logic
- Summarize the main channels and assumptions.

[2:20–3:00] Recommendation + caveats
- Provide a decision-oriented recommendation and the top uncertainties.`;

  return { exec, facts, score, score_note, video_script };
}

// Start at home
showView("home");
