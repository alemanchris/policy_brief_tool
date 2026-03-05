import { state } from "./app/state.js";
import { steps } from "./app/steps.js";

// Views
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

// Wizard
let stepIndex = 0;

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

// Allow renderers to request rerender
document.addEventListener("rerender", () => renderWizard());

// Start
showView("home");
