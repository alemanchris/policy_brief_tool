export const state = {
  topic: "",
  question: "",
  files: [],
  argumentsText: "",
  constraintsText: "",
  pollsText: "",
  expertsText: "",
  outputs: null,
  debug: false,
};

export function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
