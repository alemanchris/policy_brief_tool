import { state } from "./state.js";

export function generateBriefMock(){
  const exec = [
    `Decision: ${state.question}`,
    `Likely tradeoff: short-run fiscal cost vs longer-run stabilization.`,
    `Key risk: evidence may be mixed; disclose uncertainty and comparability limits.`
  ];

  const facts = [
    "Baseline context (macro conditions, labor market structure). [S1 p.2 c1]",
    "Mechanisms (incentives, moral hazard, participation channels). [Theory]",
    "Implementation (eligibility, admin capacity, enforcement). [S2 p.5 c2]"
  ];

  const reliability = {
    score: 62,
    components: [
      { name: "Citation coverage", value: 40, note: "Mock" },
      { name: "Evidence strength", value: 35, note: "Mock" },
      { name: "Contradiction handling", value: 70, note: "Mock" },
      { name: "Uncertainty disclosure", value: 80, note: "Mock" },
    ],
    note: "Mock score. Backend will compute this from citations + verifier checks."
  };

  const video_script =
`[0:00–0:20] Policy question and why it matters
- ${state.topic}

[0:20–1:20] What the evidence says (with citations)
- Claims will be grounded in uploaded PDFs with citations.

[1:20–2:20] Mechanisms / economic logic
- Summarize channels and assumptions.

[2:20–3:00] Recommendation + caveats
- Decision-oriented recommendation and top uncertainties.`;

  return { exec, facts, reliability, video_script };
}
