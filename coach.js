// Gemma coaches: picks exercises from library.json and reflects on a session summary.
// Talks to the local Ollama only. Every answer is constrained by a JSON schema and then checked again here.

import { readFileSync } from "node:fs";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "gemma4:26b";

export const LIBRARY = JSON.parse(readFileSync(new URL("./library.json", import.meta.url), "utf8"));
const IDS = LIBRARY.map((ex) => ex.id);

// Limits shared by the schema and the checks. Pace matches the frontend slider.
const PACE = { min: 4, max: 20 };
const REPS = { min: 2, max: 15 };
export const MINUTES = { min: 1, max: 10 };

const SYSTEM = `You are the coach in Sloth Mode, a slow-movement app. A sloth climbs a vine only while the user moves slowly and smoothly.

Safety comes first:
- Only gentle movements, always within a pain-free range. Never encourage pushing through pain or strain.
- Don't diagnose or give medical advice. If the user mentions pain, injury, dizziness or feeling unwell, choose the gentlest options and suggest checking with a health professional.

Tone: warm, calm and brief. Plain words. No exclamation marks, no emojis.
Write every text field as full sentences: start with a capital letter, end with a full stop, and use typographic apostrophes (’).`;

export class CoachError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function ask(prompt, schema, temperature) {
  let res;
  try {
    res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        keep_alive: "30m",
        format: schema,
        options: { temperature },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }]
      }),
      signal: AbortSignal.timeout(120_000)
    });
  } catch (err) {
    throw new CoachError(`Gemma isn’t reachable. Is Ollama running? (${err.message})`, 503);
  }
  if (!res.ok) throw new CoachError(`Ollama answered ${res.status}: ${await res.text()}`, 503);
  const data = await res.json();
  return JSON.parse(data.message.content);
}

// Ask, check, and ask once more if the answer doesn't pass.
async function askChecked(prompt, schema, temperature, check) {
  let problem;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const answer = await ask(prompt, schema, temperature);
      problem = check(answer);
      if (!problem) return answer;
    } catch (err) {
      if (err instanceof CoachError) throw err;
      problem = err.message;
    }
    console.warn(`Gemma answer rejected (attempt ${attempt + 1}): ${problem}`);
  }
  throw new CoachError(`Gemma’s answer didn’t pass the checks: ${problem}`);
}

const isText = (s, max) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
const isInt = (n, { min, max }) => Number.isInteger(n) && n >= min && n <= max;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    exercises: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: IDS },
          seconds_per_lift: { type: "integer", minimum: PACE.min, maximum: PACE.max },
          reps: { type: "integer", minimum: REPS.min, maximum: REPS.max },
          why: { type: "string" },
          cues: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }
        },
        required: ["id", "seconds_per_lift", "reps", "why", "cues"]
      }
    }
  },
  required: ["exercises"]
};

function checkPlan(answer) {
  const list = answer?.exercises;
  if (!Array.isArray(list) || list.length !== 3) return "expected exactly three exercises";
  if (new Set(list.map((ex) => ex.id)).size !== 3) return "exercises must be different";
  for (const ex of list) {
    if (!IDS.includes(ex.id)) return `unknown exercise id "${ex.id}"`;
    if (!isInt(ex.seconds_per_lift, PACE)) return `seconds_per_lift out of range for ${ex.id}`;
    if (!isInt(ex.reps, REPS)) return `reps out of range for ${ex.id}`;
    if (!isText(ex.why, 240)) return `missing or overlong why for ${ex.id}`;
    if (!Array.isArray(ex.cues) || ex.cues.length < 2 || ex.cues.length > 4 || !ex.cues.every((c) => isText(c, 140))) {
      return `cues must be 2–4 short lines for ${ex.id}`;
    }
  }
  return null;
}

export async function plan({ feeling, minutes }) {
  const menu = LIBRARY.map((ex) => `- ${ex.id}: ${ex.name}. ${ex.position}, focus: ${ex.focus.join(", ")}. How it’s done: ${ex.setup}`).join("\n");
  const prompt = `How the user feels, in their own words: """${feeling}"""
Time for one exercise: about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.

Exercise library. Choose only from these ids:
${menu}

Offer three different exercises that suit how they feel, so they can pick one. Give some variety unless their words point to one body area.
For each exercise:
- seconds_per_lift (${PACE.min}–${PACE.max}): seconds to move from the start position to the full movement. Slower is calmer. Around 8–12 suits most people.
- reps (${REPS.min}–${REPS.max}): one rep is there and back, so it takes about 2 × seconds_per_lift. Fit the reps to the time available.
- why: one short sentence that links this choice to how they feel.
- cues: 2–4 short somatic cues for this movement exactly as described in “How it’s done”, under 12 words each, about sensation, breath or slowness.`;
  return askChecked(prompt, PLAN_SCHEMA, 0.7, checkPlan);
}

const REFLECT_SCHEMA = {
  type: "object",
  properties: { reflection: { type: "string" }, next_time: { type: "string" } },
  required: ["reflection", "next_time"]
};

function checkReflect(answer) {
  if (!isText(answer?.reflection, 600)) return "missing or overlong reflection";
  if (!isText(answer?.next_time, 300)) return "missing or overlong next_time";
  return null;
}

// What each session summary field means. The frontend sends these; unknown fields are passed through.
const SUMMARY_FIELDS = `- exercise_id: the exercise from the library.
- seconds_per_lift, reps: the pace and number of reps the user chose.
- finished: true if the sloth reached the treetop.
- climb_seconds: time spent moving at sloth pace. total_seconds: whole session length.
- rush_count: how many times they moved too fast and the sloth had to hold on.
- nap_count: how many times they stopped long enough for the sloth to nap. Pausing is fine, it isn’t a failure.
- rush_zone: where within one movement (from start position to full movement) they tended to rush: one of the thirds, “spread across the movement”, or “none”. It is about the position in the movement, not the time in the session.`;

export async function reflect(summary) {
  const ex = LIBRARY.find((e) => e.id === summary.exercise_id);
  const prompt = `The user just finished a Sloth Mode session${ex ? ` doing “${ex.name}”` : ""}. Session summary (measured by the app, not by you):
${JSON.stringify(summary, null, 2)}

What the fields mean:
${SUMMARY_FIELDS}

Write:
- reflection: two or three sentences. Notice something that went well, and one pattern in the numbers if there is one, such as where in the movement they tended to rush. Don’t repeat the numbers back as a list.
- next_time: one short, concrete suggestion for their next session.`;
  return askChecked(prompt, REFLECT_SCHEMA, 0.6, checkReflect);
}
