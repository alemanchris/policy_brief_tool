import { state, escapeHtml } from "./state.js";
import { generateBriefMock } from "./api.js";

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

export function renderScope(root){
  const wrap = document.createElement("div");
  wrap.className = "kv";
  wrap.appendChild(kvRow("Topic", `<b>${escapeHtml(state.topic)}</b>`));
  wrap.appendChild(kvRow("Question", escapeHtml(state.question)));
  root.appendChild(wrap);

  const constraints = document.createElement("textarea");
  constraints.className = "textarea";
  constraints.rows = 4;
  constraints.placeholder = "Constraints / success criteria (optional).";
  constraints.value = state.constraintsText;
  constraints.addEventListener("input", () => state.constraintsText = constraints.value);

  root.appendChild(hr());
  root.appendChild(label("Constraints / success criteria"));
  root.appendChild(constraints);
  root.appendChild(infoBox("Timeline preview", "Next you'll upload PDFs, then add your argument, then generate a cited brief."));
}

export function renderSources(root){
  const box = document.createElement("div");
  box.className = "filebox";

  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".pdf,.txt,.md";
  input.addEventListener("change", () => {
    state.files = Array.from(input.files || []);
    // UI re-render is handled by caller
    document.dispatchEvent(new CustomEvent("rerender"));
  });

  box.appendChild(label("Upload PDFs / notes"));
  box.appendChild(input);
  root.appendChild(box);

  const list = document.createElement("div");
  state.files.forEach((f, idx) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;

    // small remove button (makes feedback cycles easy)
    const x = document.createElement("button");
    x.className = "btn";
    x.style.marginLeft = "8px";
    x.style.padding = "2px 8px";
    x.textContent = "×";
    x.addEventListener("click", () => {
      state.files.splice(idx, 1);
      document.dispatchEvent(new CustomEvent("rerender"));
    });

    pill.appendChild(x);
    list.appendChild(pill);
  });
  root.appendChild(list);

  root.appendChild(infoBox("Note", "On GitHub Pages, files stay in-browser for now. Backend will ingest them later."));
}

export function renderArgument(root){
  const stance = document.createElement("textarea");
  stance.className = "textarea";
  stance.rows = 6;
  stance.placeholder = "Write your argument / hypothesis. Include mechanisms and what evidence would change your mind.";
  stance.value = state.argumentsText;
  stance.addEventListener("input", () => state.argumentsText = stance.value);

  root.appendChild(label("Your argument"));
  root.appendChild(stance);
  root.appendChild(infoBox("Best practice", "Separate facts (cited) vs assumptions vs mechanisms vs recommendation."));
}

export function renderViewpoints(root){
  const polls = document.createElement("textarea");
  polls.className = "textarea";
  polls.rows = 4;
  polls.placeholder = "Polls / public sentiment (optional). Paste numbers + source.";
  polls.value = state.pollsText;
  polls.addEventListener("input", () => state.pollsText = polls.value);

  const experts = document.createElement("textarea");
  experts.className = "textarea";
  experts.rows = 4;
  experts.placeholder = "Expert opinions / testimonials (optional). Include who + source.";
  experts.value = state.expertsText;
  experts.addEventListener("input", () => state.expertsText = experts.value);

  root.appendChild(label("Polls"));
  root.appendChild(polls);
  root.appendChild(hr());
  root.appendChild(label("Expert opinions / testimonials"));
  root.appendChild(experts);
}

export function renderGenerate(root){
  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Generate (mock output)";
  btn.addEventListener("click", () => {
    state.outputs = generateBriefMock();
    document.dispatchEvent(new CustomEvent("rerender"));
  });

  root.appendChild(infoBox("Today vs next", "Today: mocked brief. Next: backend does RAG + citations + scoring + verifier checks."));
  root.appendChild(btn);

  if(state.outputs){
    root.appendChild(hr());
    const out = document.createElement("div");
    const comp = state.outputs.reliability.components
      .map(c => `<li>${escapeHtml(c.name)}: <b>${c.value}</b> <span class="muted small">(${escapeHtml(c.note)})</span></li>`)
      .join("");

    out.innerHTML = `
      <h3>Executive summary</h3>
      <ul>${state.outputs.exec.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

      <h3>Key facts & arguments to use</h3>
      <ul>${state.outputs.facts.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

      <h3>Reliability</h3>
      <p><b>${state.outputs.reliability.score}/100</b> — ${escapeHtml(state.outputs.reliability.note)}</p>
      <ul>${comp}</ul>

      <h3>3-minute explainer (script)</h3>
      <pre style="white-space:pre-wrap">${escapeHtml(state.outputs.video_script)}</pre>
    `;
    root.appendChild(out);
  }
}
