import { state } from "./state.js";
import {
  renderScope, renderSources, renderArgument, renderViewpoints, renderGenerate
} from "./renderers.js";

export const steps = [
  { id:"scope", name:"Confirm scope", desc:"Topic, question, constraints and success criteria.", render: renderScope,
    validate: () => (!state.topic || !state.question) ? {ok:false, msg:"Missing topic or question."}:{ok:true}
  },
  { id:"sources", name:"Upload sources", desc:"Add PDFs and notes that will be cited.", render: renderSources,
    validate: () => (!state.files || state.files.length===0) ? {ok:false, msg:"Upload at least one file."}:{ok:true}
  },
  { id:"argument", name:"Your argument", desc:"Draft stance, tradeoffs, and what evidence should decide.", render: renderArgument,
    validate: () => (!state.argumentsText || state.argumentsText.trim().length < 40) ? {ok:false, msg:"Add a short argument (≥ ~40 chars)."}:{ok:true}
  },
  { id:"views", name:"Add viewpoints", desc:"Optional: polls, expert opinions, testimonials.", render: renderViewpoints,
    validate: () => ({ok:true})
  },
  { id:"generate", name:"Generate brief", desc:"Produces outline + evidence bullets + reliability (mock now).", render: renderGenerate,
    validate: () => ({ok:true})
  },
];
